-- DRAFT ONLY: not a migration; not in baseline; NEVER apply to operational DB.
-- Allocate canonical migration + MANIFEST + baseline after disposable DB proof.
-- Optional module: tables are created only by the fixed provisioner.
create or replace function public.fn_limpax_history_same_org()
returns trigger language plpgsql security invoker set search_path = '' as $guard$
begin
  if (new.company_id is not null and not exists (
      select 1 from public.companies c where c.id = new.company_id and c.organization_id = new.organization_id))
    or (new.person_id is not null and not exists (
      select 1 from public.people p where p.id = new.person_id and p.organization_id = new.organization_id)) then
    raise exception using errcode = '23514', message = 'history_customer_organization_mismatch';
  end if;
  if tg_table_name = 'limpax_service_history' then
    if new.location_id is not null and not exists (
      select 1 from public.limpax_customer_locations l
      where l.id = new.location_id and l.organization_id = new.organization_id
        and l.company_id is not distinct from new.company_id
        and l.person_id is not distinct from new.person_id) then
      raise exception using errcode = '23514', message = 'history_location_customer_mismatch';
    end if;
    if not exists (select 1 from public.import_rows r
      join public.import_batches b on b.id = r.batch_id
      where r.id = new.import_row_id and r.organization_id = new.organization_id
        and b.organization_id = new.organization_id) then
      raise exception using errcode = '23514', message = 'history_origin_organization_mismatch';
    end if;
  end if;
  return new;
end;
$guard$;
revoke execute on function public.fn_limpax_history_same_org() from public, anon, authenticated, service_role;

create or replace function public.fn_limpax_historico_provisionar()
returns void language plpgsql security definer set search_path = '' as $module$
begin
  create table if not exists public.limpax_customer_locations (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    company_id uuid references public.companies(id) on delete restrict,
    person_id uuid references public.people(id) on delete restrict,
    address_original text not null check (length(btrim(address_original)) between 1 and 16384),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint limpax_locations_one_customer check (num_nonnulls(company_id, person_id) = 1)
  );
  create index if not exists limpax_locations_org_company on public.limpax_customer_locations(organization_id, company_id);
  create index if not exists limpax_locations_org_person on public.limpax_customer_locations(organization_id, person_id);
  create table if not exists public.limpax_service_history (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    company_id uuid references public.companies(id) on delete restrict,
    person_id uuid references public.people(id) on delete restrict,
    location_id uuid references public.limpax_customer_locations(id) on delete restrict,
    import_row_id uuid not null references public.import_rows(id) on delete restrict,
    source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
    source_data_row_index integer not null check (source_data_row_index between 1 and 2000),
    original_reference jsonb check (original_reference is null or jsonb_typeof(original_reference) = 'object'),
    raw_data jsonb not null check (jsonb_typeof(raw_data) = 'object' and octet_length(raw_data::text) <= 2097152),
    service_date date check (service_date is null or service_date >= date '1900-01-01'),
    value_cents bigint check (value_cents is null or value_cents between 0 and 9007199254740991),
    currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
    notes_original text not null default '' check (octet_length(notes_original) <= 2097152),
    decision_sha256 text not null check (decision_sha256 ~ '^[a-f0-9]{64}$'),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint limpax_history_one_customer check (num_nonnulls(company_id, person_id) = 1),
    constraint limpax_history_origin_once unique(organization_id, source_sha256, source_data_row_index),
    constraint limpax_history_import_row_once unique(organization_id, import_row_id)
  );
  create index if not exists limpax_history_org_company_date on public.limpax_service_history(organization_id, company_id, service_date);
  create index if not exists limpax_history_org_person_date on public.limpax_service_history(organization_id, person_id, service_date);
  drop trigger if exists limpax_locations_same_org on public.limpax_customer_locations;
  create trigger limpax_locations_same_org before insert or update on public.limpax_customer_locations
    for each row execute function public.fn_limpax_history_same_org();
  drop trigger if exists limpax_history_same_org on public.limpax_service_history;
  create trigger limpax_history_same_org before insert or update on public.limpax_service_history
    for each row execute function public.fn_limpax_history_same_org();
  alter table public.limpax_customer_locations enable row level security;
  alter table public.limpax_service_history enable row level security;
  drop policy if exists limpax_locations_select on public.limpax_customer_locations;
  create policy limpax_locations_select on public.limpax_customer_locations for select to authenticated
    using (organization_id in (select public.fn_user_org_ids()));
  drop policy if exists limpax_history_select on public.limpax_service_history;
  create policy limpax_history_select on public.limpax_service_history for select to authenticated
    using (organization_id in (select public.fn_user_org_ids()));
  -- Direct browser writes are deliberately unavailable until atomic command is proved.
  revoke all on public.limpax_customer_locations, public.limpax_service_history from public, anon, authenticated, service_role;
  grant select on public.limpax_customer_locations, public.limpax_service_history to authenticated;
  grant select, insert on public.limpax_customer_locations, public.limpax_service_history to service_role;

  -- Draft against the current baseline; canonical allocation must recheck upstream.
  alter table public.import_batches drop constraint if exists import_batches_kind_check;
  alter table public.import_batches add constraint import_batches_kind_check
    check (kind in ('companies_people', 'contacts', 'limpax_history'));
  create table if not exists public.limpax_history_receipts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete restrict,
    source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
    decision_sha256 text not null check (decision_sha256 ~ '^[a-f0-9]{64}$'),
    batch_id uuid not null unique references public.import_batches(id) on delete restrict,
    total_rows integer not null check (total_rows between 1 and 2000),
    service_rows integer not null check (service_rows between 0 and total_rows),
    locations_created integer not null check (locations_created between 0 and total_rows),
    auxiliary_rows integer not null check (auxiliary_rows between 0 and total_rows),
    reversed_at timestamptz,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    unique (organization_id, source_sha256)
  );
  alter table public.limpax_history_receipts add column if not exists reversed_at timestamptz;
  alter table public.limpax_history_receipts enable row level security;
  drop policy if exists limpax_history_receipts_select on public.limpax_history_receipts;
  create policy limpax_history_receipts_select on public.limpax_history_receipts for select to authenticated
    using (organization_id in (select public.fn_user_org_ids()));
  revoke all on public.limpax_history_receipts from public, anon, authenticated, service_role;
  grant select on public.limpax_history_receipts to authenticated, service_role;

  perform public.fn_proteger_modulo_provisionado();
end;
$module$;
revoke execute on function public.fn_limpax_historico_provisionar() from public, anon, authenticated;
grant execute on function public.fn_limpax_historico_provisionar() to service_role;
