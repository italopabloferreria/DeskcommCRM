-- DRAFT ONLY. Disposable DB after history provisioner. Not a canonical migration.
-- Extends the EXISTING contact anonymization event (0449), not its authorization.
alter table public.limpax_service_history add column if not exists redacted_at timestamptz;
alter table public.limpax_customer_locations add column if not exists redacted_at timestamptz;

create or replace function public.fn_limpax_history_redact_contact()
returns trigger language plpgsql security definer set search_path = '' as $redact$
begin
  if new.person_id is null then return new; end if;
  -- The existing B2B cascade locks/clears the same person and import_rows.
  update public.limpax_service_history
    set raw_data='{}'::jsonb, original_reference=null, notes_original='',
        service_date=null, value_cents=null, currency=null,
        redacted_at=coalesce(redacted_at,new.anonymized_at,now())
    where organization_id=new.organization_id and person_id=new.person_id;
  update public.limpax_customer_locations
    set address_original='[redacted]',
        redacted_at=coalesce(redacted_at,new.anonymized_at,now())
    where organization_id=new.organization_id and person_id=new.person_id;
  -- Receipts contain IDs/counts/hash only. Preserve them so replay cannot reload PII.
  return new;
end;
$redact$;
revoke all on function public.fn_limpax_history_redact_contact() from public,anon,authenticated,service_role;
drop trigger if exists trg_limpax_history_redact on public.contacts;
create trigger trg_limpax_history_redact after update of is_anonymized on public.contacts
  for each row when (new.is_anonymized is true and old.is_anonymized is distinct from true)
  execute function public.fn_limpax_history_redact_contact();

create or replace function public.fn_limpax_history_guard_redacted_person()
returns trigger language plpgsql security definer set search_path = '' as $guard$
begin
  if new.person_id is not null then
    -- Serialize with the existing cascade's UPDATE of people.
    perform 1 from public.people where id=new.person_id
      and organization_id=new.organization_id for share;
    if exists(select 1 from public.contacts where organization_id=new.organization_id
      and person_id=new.person_id and is_anonymized=true) then
      raise exception using errcode='42501',message='history_person_anonymized';
    end if;
  end if;
  return new;
end;
$guard$;
revoke all on function public.fn_limpax_history_guard_redacted_person() from public,anon,authenticated,service_role;
drop trigger if exists limpax_history_guard_redacted on public.limpax_service_history;
create trigger limpax_history_guard_redacted before insert on public.limpax_service_history
  for each row execute function public.fn_limpax_history_guard_redacted_person();
drop trigger if exists limpax_location_guard_redacted on public.limpax_customer_locations;
create trigger limpax_location_guard_redacted before insert on public.limpax_customer_locations
  for each row execute function public.fn_limpax_history_guard_redacted_person();
