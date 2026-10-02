-- LimpaxCRM: optional historical module, confirmation, lifecycle and logical reversal.
-- SOURCE ONLY until isolated recovery and authorized operational preflight pass.
-- Applying this file distributes fixed functions; it does NOT provision tables,
-- install triggers, import customers or enable MODULO_CRM_B2B.
-- Optional policy declarations keep ON on its own line, matching the optional
-- module pattern: pre-v1.63.1 update kits scan text before tables are provisioned.
-- The provisioner still installs all five tenant policies; no permission changes.
create or replace function public.fn_limpax_historico_provisionar()
returns void language plpgsql security definer set search_path='' as $f$
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
  create policy limpax_locations_select
    on public.limpax_customer_locations for select to authenticated
    using (organization_id in (select public.fn_user_org_ids()));
  drop policy if exists limpax_history_select on public.limpax_service_history;
  create policy limpax_history_select
    on public.limpax_service_history for select to authenticated
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
  create policy limpax_history_receipts_select
    on public.limpax_history_receipts for select to authenticated
    using (organization_id in (select public.fn_user_org_ids()));
  revoke all on public.limpax_history_receipts from public, anon, authenticated, service_role;
  grant select on public.limpax_history_receipts to authenticated, service_role;

  perform public.fn_proteger_modulo_provisionado();
alter table public.limpax_service_history add column if not exists redacted_at timestamptz;
alter table public.limpax_customer_locations add column if not exists redacted_at timestamptz;



drop trigger if exists trg_limpax_history_redact on public.contacts;
create trigger trg_limpax_history_redact after update of is_anonymized on public.contacts
  for each row when (new.is_anonymized is true and old.is_anonymized is distinct from true)
  execute function public.fn_limpax_history_redact_contact();



drop trigger if exists limpax_history_guard_redacted on public.limpax_service_history;
create trigger limpax_history_guard_redacted before insert on public.limpax_service_history
  for each row execute function public.fn_limpax_history_guard_redacted_person();
drop trigger if exists limpax_location_guard_redacted on public.limpax_customer_locations;
create trigger limpax_location_guard_redacted before insert on public.limpax_customer_locations
  for each row execute function public.fn_limpax_history_guard_redacted_person();
alter table public.limpax_service_history add column if not exists revision integer not null default 0 check (revision>=0);
alter table public.limpax_service_history add column if not exists notes_current text check (length(notes_current)<=16000);
alter table public.limpax_service_history add column if not exists voided_at timestamptz;
create table if not exists public.limpax_history_subjects(
 organization_id uuid not null references public.organizations(id) on delete restrict,
 person_id uuid not null references public.people(id) on delete restrict,
 redacted_at timestamptz not null default now(),
 primary key(organization_id,person_id)
);
create table if not exists public.limpax_history_management_receipts(
 organization_id uuid not null references public.organizations(id) on delete restrict,
 request_id uuid not null, payload_sha256 text not null,
 result jsonb not null, created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table public.limpax_history_subjects enable row level security;
alter table public.limpax_history_management_receipts enable row level security;
drop policy if exists limpax_subject_read on public.limpax_history_subjects;
create policy limpax_subject_read
    on public.limpax_history_subjects for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()));
drop policy if exists limpax_management_read on public.limpax_history_management_receipts;
create policy limpax_management_read
    on public.limpax_history_management_receipts for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()));
revoke all on public.limpax_history_subjects,public.limpax_history_management_receipts from public,anon,authenticated,service_role;
grant select on public.limpax_history_subjects,public.limpax_history_management_receipts to authenticated;
perform public.fn_proteger_modulo_provisionado();






drop trigger if exists limpax_person_no_restore on public.people;
create trigger limpax_person_no_restore before update of full_name,normalized_name,email,notes on public.people
 for each row execute function public.fn_limpax_history_no_restore();
drop trigger if exists limpax_service_no_restore on public.limpax_service_history;
create trigger limpax_service_no_restore before insert on public.limpax_service_history
 for each row execute function public.fn_limpax_history_no_restore();
drop trigger if exists limpax_location_no_restore on public.limpax_customer_locations;
create trigger limpax_location_no_restore before insert on public.limpax_customer_locations
 for each row execute function public.fn_limpax_history_no_restore();




drop trigger if exists limpax_link_no_restore on public.company_people;
create trigger limpax_link_no_restore before insert or update of person_id,job_title,department,notes on public.company_people
 for each row execute function public.fn_limpax_history_guard_copies();
drop trigger if exists limpax_import_no_restore on public.import_rows;
create trigger limpax_import_no_restore before insert or update of person_id,raw_data,normalized_data,error on public.import_rows
 for each row execute function public.fn_limpax_history_guard_copies();
drop trigger if exists limpax_phone_no_restore on public.contacts;
create trigger limpax_phone_no_restore before insert or update of person_id,is_anonymized on public.contacts
 for each row execute function public.fn_limpax_history_guard_copies();



drop trigger if exists trg_limpax_current_redact on public.contacts;
create trigger trg_limpax_current_redact after update of is_anonymized on public.contacts
 for each row when(new.is_anonymized and old.is_anonymized is distinct from true)
 execute function public.fn_limpax_history_clear_current_contact();
 perform public.fn_proteger_modulo_provisionado();
end;
$f$;
revoke execute on function public.fn_limpax_historico_provisionar() from public, anon, authenticated, service_role;
grant execute on function public.fn_limpax_historico_provisionar() to service_role;

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




create or replace function public.fn_limpax_history_import_atomic(
  p_organization_id uuid, p_source_sha256 text, p_filename text, p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $command$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_hash text;
  v_receipt record;
  v_batch uuid;
  v_import_row uuid;
  v_row jsonb;
  v_index integer := 0;
  v_kind text;
  v_company uuid;
  v_person uuid;
  v_location uuid;
  v_services integer := 0;
  v_locations integer := 0;
  v_auxiliary integer := 0;
begin
  if v_actor is null or not public.fn_session_mfa_proven() or not coalesce(public.fn_support_write_allowed(p_organization_id), false) then
    raise exception using errcode='42501', message='history_import_forbidden';
  end if;
  select role into v_role from public.user_organizations
    where user_id=v_actor and organization_id=p_organization_id
      and revoked_at is null and accepted_at is not null for share;
  if v_role is null or v_role not in ('manager','admin') then
    raise exception using errcode='42501', message='history_import_forbidden';
  end if;
  if p_source_sha256 is null or p_source_sha256 !~ '^[a-f0-9]{64}$'
    or nullif(btrim(p_filename),'') is null or length(p_filename)>255
    or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception using errcode='22023', message='history_invalid_payload';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 2000 or octet_length(p_rows::text)>8388608 then
    raise exception using errcode='22023', message='history_invalid_payload';
  end if;
  -- Shared import namespace also serializes with existing 0495 B2B command.
  if not pg_try_advisory_xact_lock(hashtextextended('crm-import:'||p_organization_id::text,0)) then
    raise exception using errcode='55006', message='history_import_busy';
  end if;
  v_hash := encode(sha256(convert_to(p_rows::text,'UTF8')),'hex');
  select * into v_receipt from public.limpax_history_receipts
    where organization_id=p_organization_id and source_sha256=p_source_sha256;
  if found then
    if v_receipt.decision_sha256 is distinct from v_hash then
      raise exception using errcode='P0001', message='history_decision_conflict';
    end if;
    return jsonb_build_object('receipt_id',v_receipt.id,'batch_id',v_receipt.batch_id,
      'total_rows',v_receipt.total_rows,'service_rows',v_receipt.service_rows,
      'locations_created',v_receipt.locations_created,'auxiliary_rows',v_receipt.auxiliary_rows,'reused',true)||
      case when v_receipt.reversed_at is not null then jsonb_build_object('reversed_at',v_receipt.reversed_at) else '{}'::jsonb end;
  end if;
  insert into public.import_batches(organization_id,kind,filename,status,total_rows,created_by)
    values(p_organization_id,'limpax_history',p_filename,'processing',jsonb_array_length(p_rows),v_actor)
    returning id into v_batch;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index:=v_index+1;
    if jsonb_typeof(v_row) is distinct from 'object' then
      raise exception using errcode='22023',message='history_invalid_row';
    end if;
    if not (v_row ?& array['data_row_index','row_kind','company_id','person_id','location_id',
      'create_address','raw_data','original_reference','service_date','value_cents','currency','notes_original'])
      or exists(select 1 from jsonb_object_keys(v_row) k
        where k not in ('data_row_index','row_kind','company_id','person_id','location_id','create_address',
          'raw_data','original_reference','service_date','value_cents','currency','notes_original')) then
      raise exception using errcode='22023',message='history_invalid_row';
    end if;
    if jsonb_typeof(v_row->'data_row_index') is distinct from 'number'
      or (v_row->>'data_row_index')::numeric<>v_index
      or jsonb_typeof(v_row->'raw_data') is distinct from 'object'
      or octet_length((v_row->'raw_data')::text)>2097152
      or jsonb_typeof(v_row->'notes_original') is distinct from 'string'
      or octet_length(v_row->>'notes_original')>2097152
      or jsonb_typeof(v_row->'original_reference') not in ('object','null') then
      raise exception using errcode='22023',message='history_invalid_row';
    end if;
    v_kind:=v_row->>'row_kind';
    v_company:=(v_row->>'company_id')::uuid;
    v_person:=(v_row->>'person_id')::uuid;
    v_location:=(v_row->>'location_id')::uuid;
    if v_kind is null or v_kind not in ('service','location_only','auxiliary')
      or (v_location is not null and v_row->>'create_address' is not null) then
      raise exception using errcode='22023',message='history_invalid_row';
    end if;
    if v_kind='auxiliary' then
      if num_nonnulls(v_company,v_person,v_location,v_row->>'create_address',
          v_row->>'service_date',v_row->>'value_cents',v_row->>'currency')<>0
          or v_row->>'notes_original'<>'' then
        raise exception using errcode='22023',message='history_auxiliary_has_decision';
      end if;
      v_auxiliary:=v_auxiliary+1;
    else
      if num_nonnulls(v_company,v_person)<>1 then
        raise exception using errcode='22023',message='history_customer_required';
      end if;
      -- Locks prevent an organization/customer reassignment during confirmation.
      if v_company is not null then
        perform 1 from public.companies where id=v_company and organization_id=p_organization_id for share;
      else
        perform 1 from public.people where id=v_person and organization_id=p_organization_id for share;
      end if;
      if not found then raise exception using errcode='23514',message='history_customer_organization_mismatch'; end if;
      if v_location is not null then
        perform 1 from public.limpax_customer_locations where id=v_location and organization_id=p_organization_id
          and company_id is not distinct from v_company and person_id is not distinct from v_person for share;
        if not found then raise exception using errcode='23514',message='history_location_customer_mismatch'; end if;
      elsif v_row->>'create_address' is not null then
        if jsonb_typeof(v_row->'create_address')<>'string' then
          raise exception using errcode='22023',message='history_invalid_address';
        end if;
        insert into public.limpax_customer_locations(organization_id,company_id,person_id,address_original,created_by)
          values(p_organization_id,v_company,v_person,v_row->>'create_address',v_actor) returning id into v_location;
        v_locations:=v_locations+1;
      end if;
      if v_kind='location_only' and (v_location is null or
        num_nonnulls(v_row->>'service_date',v_row->>'value_cents',v_row->>'currency')<>0 or v_row->>'notes_original'<>'') then
        raise exception using errcode='22023',message='history_invalid_location_only';
      end if;
    end if;
    insert into public.import_rows(organization_id,batch_id,row_number,raw_data,normalized_data,status,company_id,person_id)
      values(p_organization_id,v_batch,v_index,v_row->'raw_data',
        jsonb_build_object('module','limpax_history','decision_sha256',v_hash,'original_reference',v_row->'original_reference'),
        'success',v_company,v_person) returning id into v_import_row;
    if v_kind='service' then
      if num_nonnulls(v_row->>'service_date',v_row->>'value_cents')=0 and btrim(v_row->>'notes_original')='' then
        raise exception using errcode='22023',message='history_empty_service';
      end if;
      if (v_row->>'service_date' is not null and (v_row->>'service_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        or (v_row->>'value_cents' is not null and
          (jsonb_typeof(v_row->'value_cents')<>'number' or (v_row->>'value_cents') !~ '^[0-9]+$')) then
        raise exception using errcode='22023',message='history_invalid_date_value';
      end if;
      insert into public.limpax_service_history(organization_id,company_id,person_id,location_id,import_row_id,
        source_sha256,source_data_row_index,original_reference,raw_data,service_date,value_cents,currency,notes_original,decision_sha256,created_by)
        values(p_organization_id,v_company,v_person,v_location,v_import_row,p_source_sha256,v_index,
          nullif(v_row->'original_reference','null'::jsonb),v_row->'raw_data',(v_row->>'service_date')::date,
          (v_row->>'value_cents')::bigint,v_row->>'currency',v_row->>'notes_original',v_hash,v_actor);
      v_services:=v_services+1;
    end if;
  end loop;
  update public.import_batches set status='completed',processed_rows=v_index,successful_rows=v_index,completed_at=now()
    where id=v_batch and organization_id=p_organization_id;
  insert into public.limpax_history_receipts(organization_id,source_sha256,decision_sha256,batch_id,
    total_rows,service_rows,locations_created,auxiliary_rows,created_by)
    values(p_organization_id,p_source_sha256,v_hash,v_batch,v_index,v_services,v_locations,v_auxiliary,v_actor)
    returning * into v_receipt;
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,bypassed_rls,metadata)
    values(p_organization_id,v_actor,'limpax.history_import.completed','import_batch',v_batch,true,
      jsonb_build_object('receipt_id',v_receipt.id,'total_rows',v_index,'service_rows',v_services,
        'locations_created',v_locations,'auxiliary_rows',v_auxiliary));
  return jsonb_build_object('receipt_id',v_receipt.id,'batch_id',v_batch,'total_rows',v_index,
    'service_rows',v_services,'locations_created',v_locations,'auxiliary_rows',v_auxiliary,'reused',false);
end;
$command$;
revoke all on function public.fn_limpax_history_import_atomic(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.fn_limpax_history_import_atomic(uuid,text,text,jsonb) to authenticated;


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

revoke all on function public.fn_limpax_history_redact_contact() from public,anon,authenticated,service_role;

revoke all on function public.fn_limpax_history_guard_redacted_person() from public,anon,authenticated,service_role;

create or replace function public.fn_limpax_history_access(p_org uuid,p_min text,p_write boolean)
returns text language plpgsql stable security definer set search_path='' as $access$
declare v_role text;
begin
 if auth.uid() is null or not public.fn_session_mfa_proven() then
  raise exception using errcode='42501',message='history_access_denied'; end if;
 select role into v_role from public.user_organizations where organization_id=p_org
  and user_id=auth.uid() and revoked_at is null and accepted_at is not null;
 if v_role is null or (p_min='admin' and v_role<>'admin')
  or (p_min='manager' and v_role not in('admin','manager')) then
  raise exception using errcode='42501',message='history_access_denied'; end if;
 if p_write and not coalesce(public.fn_support_write_allowed(p_org),false) then
  raise exception using errcode='42501',message='history_support_denied'; end if;
 return v_role;
end;$access$;

create or replace function public.fn_limpax_history_no_restore()
returns trigger language plpgsql security definer set search_path='' as $restore$
declare v_redacted boolean;v_person uuid;
begin
 if tg_table_name='people' then v_person:=new.id;else v_person:=new.person_id;end if;
 select exists(select 1 from public.limpax_history_subjects where organization_id=new.organization_id and person_id=v_person) into v_redacted;
 if tg_table_name='people' then
  v_redacted:=v_redacted or exists(select 1 from public.contacts where organization_id=new.organization_id and person_id=new.id and is_anonymized);
  if v_redacted and (new.full_name is distinct from 'Pessoa anonimizada #'||substring(new.id::text,1,8)
    or new.normalized_name is not null or new.email is not null or new.notes is not null) then
   raise exception using errcode='42501',message='history_person_anonymized';end if;
 elsif v_redacted then raise exception using errcode='42501',message='history_person_anonymized';end if;
 return new;
end;$restore$;

create or replace function public.fn_limpax_history_guard_copies()
returns trigger language plpgsql security definer set search_path='' as $copies$
declare v_redacted boolean;
begin
 if new.person_id is null then return new;end if;
 -- A linked phone and no-contact erasure serialize on the person row too.
 perform 1 from public.people where organization_id=new.organization_id and id=new.person_id for update;
 select exists(select 1 from public.limpax_history_subjects where organization_id=new.organization_id and person_id=new.person_id)
  or exists(select 1 from public.contacts where organization_id=new.organization_id and person_id=new.person_id and is_anonymized)
  into v_redacted;
 if not v_redacted then return new;end if;
 if tg_table_name='company_people' then
  if new.job_title is not null or new.department is not null or new.notes is not null then
   raise exception using errcode='42501',message='history_person_anonymized';end if;
 elsif tg_table_name='import_rows' then
  if new.raw_data is distinct from '{}'::jsonb or new.normalized_data is distinct from '{}'::jsonb or new.error is not null then
   raise exception using errcode='42501',message='history_person_anonymized';end if;
 elsif tg_table_name='contacts' then
  if not coalesce(new.is_anonymized,false) then raise exception using errcode='42501',message='history_person_anonymized';end if;
 end if;
 return new;
end;$copies$;

create or replace function public.fn_limpax_history_clear_current_contact()
returns trigger language plpgsql security definer set search_path='' as $current$
begin
 update public.limpax_service_history set notes_current='' where organization_id=new.organization_id
  and person_id=new.person_id;
 return new;
end;$current$;

create or replace function public.fn_limpax_history_manage(p_org uuid,p_kind text,p_id uuid,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $manage$
declare v_action text;v_role text;v_key uuid;v_hash text;v_receipt record;
 v_service record;v_version integer;v_patch jsonb;v_result jsonb;v_count integer;
begin
 v_action:=p_body->>'action';
 if jsonb_typeof(p_body) is distinct from 'object' or octet_length(p_body::text)>65536
  or v_action is null or v_action not in('correct','void','redact_person')
  or p_kind is null or p_id is null or p_kind not in('person','service') then
  raise exception using errcode='22023',message='history_invalid_command';end if;
 v_role:=public.fn_limpax_history_access(p_org,case when v_action='correct' then 'manager' else 'admin' end,true);
 if not pg_try_advisory_xact_lock(hashtextextended('crm-import:'||p_org::text,0)) then
  raise exception using errcode='55006',message='history_busy';end if;
 if not(p_body ? 'request_id') then raise exception using errcode='22023',message='history_invalid_command';end if;
 v_key:=(p_body->>'request_id')::uuid;
 v_hash:=encode(sha256(convert_to(p_kind||p_id::text||p_body::text,'UTF8')),'hex');
 select * into v_receipt from public.limpax_history_management_receipts where organization_id=p_org and request_id=v_key;
 if found then
  if v_receipt.payload_sha256<>v_hash then raise exception using errcode='PT409',message='history_request_conflict';end if;
  return v_receipt.result||jsonb_build_object('reused',true);
 end if;
 if v_action='redact_person' then
  if p_kind<>'person' or (p_body->'confirm') is distinct from 'true'::jsonb
   or exists(select 1 from jsonb_object_keys(p_body) k where k not in('action','request_id','confirm')) then
   raise exception using errcode='22023',message='history_invalid_command';end if;
  perform 1 from public.people where organization_id=p_org and id=p_id for update;
  if not found then raise exception using errcode='P0002',message='history_person_not_found';end if;
  -- A person-linked phone can be shared. Do not erase it through this new gate.
  if exists(select 1 from public.contacts where organization_id=p_org and person_id=p_id and not is_anonymized) then
   raise exception using errcode='PT409',message='history_person_has_contacts';end if;
  if exists(select 1 from public.limpax_history_subjects where organization_id=p_org and person_id=p_id) then
   return jsonb_build_object('resource_id',p_id,'action',v_action,'reused',true,'redacted',true);
  end if;
  update public.people set full_name='Pessoa anonimizada #'||substring(p_id::text,1,8),
   normalized_name=null,email=null,notes=null where organization_id=p_org and id=p_id;
  update public.company_people set job_title=null,department=null,notes=null where organization_id=p_org and person_id=p_id;
  update public.import_rows set raw_data='{}',normalized_data='{}',error=null where organization_id=p_org and person_id=p_id;
  update public.limpax_service_history set raw_data='{}',original_reference=null,notes_original='',notes_current='',
   service_date=null,value_cents=null,currency=null,redacted_at=coalesce(redacted_at,now()),revision=revision+1
   where organization_id=p_org and person_id=p_id;
  get diagnostics v_count=row_count;
  update public.limpax_customer_locations set address_original='[redacted]',redacted_at=coalesce(redacted_at,now())
   where organization_id=p_org and person_id=p_id;
  insert into public.limpax_history_subjects(organization_id,person_id) values(p_org,p_id);
  v_result:=jsonb_build_object('resource_id',p_id,'action',v_action,'redacted',true,'services_cleared',v_count,'reused',false);
 else
  if p_kind<>'service' or not(p_body ?& array['expected_version','reason'])
   or jsonb_typeof(p_body->'expected_version') is distinct from 'number' or (p_body->>'expected_version')!~'^[0-9]+$' then
   raise exception using errcode='22023',message='history_invalid_command';end if;
  if exists(select 1 from jsonb_object_keys(p_body) k where k not in('action','request_id','expected_version','reason','patch'))
   or (v_action='void' and p_body ? 'patch') then raise exception using errcode='22023',message='history_invalid_command';end if;
  select * into v_service from public.limpax_service_history where organization_id=p_org and id=p_id for update;
  if not found then raise exception using errcode='P0002',message='history_service_not_found';end if;
  if v_service.redacted_at is not null or v_service.voided_at is not null then
   raise exception using errcode='42501',message='history_record_closed';end if;
  if v_service.revision<>(p_body->>'expected_version')::integer then raise exception using errcode='PT409',message='history_version_conflict';end if;
  if v_action='correct' then
   if jsonb_typeof(p_body->'reason') is distinct from 'string' or p_body->>'reason' not in('source_review','data_entry','wrong_location') then raise exception using errcode='22023',message='history_invalid_reason';end if;
   v_patch:=p_body->'patch';
   if jsonb_typeof(v_patch) is distinct from 'object' or not(v_patch ?& array['service_date','value_cents','currency','notes_current','location_id'])
    or exists(select 1 from jsonb_object_keys(v_patch) k where k not in('service_date','value_cents','currency','notes_current','location_id'))
    or jsonb_typeof(v_patch->'notes_current') is distinct from 'string'
    or length(v_patch->>'notes_current')>16000
    or (v_patch->'value_cents'<>'null'::jsonb and (jsonb_typeof(v_patch->'value_cents')<>'number' or (v_patch->>'value_cents')!~'^[0-9]+$'))
    or (v_patch->'service_date'<>'null'::jsonb and (jsonb_typeof(v_patch->'service_date')<>'string' or (v_patch->>'service_date')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'))
    or (v_patch->'currency'<>'null'::jsonb and (jsonb_typeof(v_patch->'currency')<>'string' or (v_patch->>'currency')!~'^[A-Z]{3}$'))
    then raise exception using errcode='22023',message='history_invalid_patch';end if;
   update public.limpax_service_history set service_date=(v_patch->>'service_date')::date,value_cents=(v_patch->>'value_cents')::bigint,
    currency=v_patch->>'currency',notes_current=v_patch->>'notes_current',location_id=(v_patch->>'location_id')::uuid,revision=revision+1
    where organization_id=p_org and id=p_id returning revision into v_version;
  else
   if jsonb_typeof(p_body->'reason') is distinct from 'string' or p_body->>'reason' not in('duplicate','cancelled','source_error') then raise exception using errcode='22023',message='history_invalid_reason';end if;
   update public.limpax_service_history set voided_at=now(),revision=revision+1
    where organization_id=p_org and id=p_id returning revision into v_version;
  end if;
  v_result:=jsonb_build_object('resource_id',p_id,'action',v_action,'version',v_version,'reused',false);
 end if;
 insert into public.limpax_history_management_receipts(organization_id,request_id,payload_sha256,result,created_by)
  values(p_org,v_key,v_hash,v_result,auth.uid());
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,bypassed_rls,metadata)
  values(p_org,auth.uid(),'limpax.history.'||v_action,p_kind,p_id,true,
   jsonb_build_object('request_id',v_key,'reason',p_body->>'reason','version',v_version,'services_cleared',v_count));
 return v_result;
end;$manage$;

create or replace function public.fn_limpax_history_view(p_org uuid,p_kind text,p_id uuid,p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $view$
declare v_role text;v_items jsonb;v_locations jsonb;
begin
 v_role:=public.fn_limpax_history_access(p_org,'viewer',false);
 if p_kind='person' then
  perform 1 from public.people where organization_id=p_org and id=p_id;
 elsif p_kind='company' then perform 1 from public.companies where organization_id=p_org and id=p_id;
 else raise exception using errcode='22023',message='history_invalid_customer';end if;
 if not found then raise exception using errcode='P0002',message='history_customer_not_found';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') into v_items from(
  select id,revision,service_date,value_cents,currency,location_id,
   coalesce(notes_current,notes_original) notes_current,redacted_at,voided_at
  from public.limpax_service_history where organization_id=p_org
   and ((p_kind='person' and person_id=p_id) or(p_kind='company' and company_id=p_id))
   and(p_after is null or id>p_after) order by id limit 26
 )r;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') into v_locations from(
  select id,address_original from public.limpax_customer_locations where organization_id=p_org and redacted_at is null
   and ((p_kind='person' and person_id=p_id) or(p_kind='company' and company_id=p_id)) order by id limit 201
 )r;
 return jsonb_build_object('available',true,'items',v_items,'locations',v_locations,
  'locations_truncated',jsonb_array_length(v_locations)>200,'can_export',v_role='admin',
  'can_correct',v_role in('manager','admin'),'can_void',v_role='admin',
  'can_redact',p_kind='person' and v_role='admin' and not exists(select 1 from public.contacts where organization_id=p_org and person_id=p_id and not is_anonymized),
  'redacted',p_kind='person' and exists(select 1 from public.limpax_history_subjects where organization_id=p_org and person_id=p_id));
end;$view$;

create or replace function public.fn_limpax_history_export_person(p_org uuid,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $export$
declare v_person jsonb;v_result jsonb;v_bytes bigint;v_count bigint;v_sum bigint:=0;
begin
 perform public.fn_limpax_history_access(p_org,'admin',false);
 select to_jsonb(p) into v_person from public.people p where organization_id=p_org and id=p_id;
 if not found then raise exception using errcode='P0002',message='history_person_not_found';end if;
 select count(*),coalesce(sum(octet_length(to_jsonb(r)::text)),0) into v_count,v_bytes from public.import_rows r where organization_id=p_org and person_id=p_id;
 if v_count>10000 then raise exception using errcode='54000',message='history_export_limit';end if;v_sum:=v_sum+v_bytes;
 select count(*),coalesce(sum(octet_length(to_jsonb(r)::text)),0) into v_count,v_bytes from public.limpax_service_history r where organization_id=p_org and person_id=p_id;
 if v_count>10000 then raise exception using errcode='54000',message='history_export_limit';end if;v_sum:=v_sum+v_bytes;
 select count(*),coalesce(sum(octet_length(to_jsonb(r)::text)),0) into v_count,v_bytes from public.limpax_customer_locations r where organization_id=p_org and person_id=p_id;
 if v_count>10000 then raise exception using errcode='54000',message='history_export_limit';end if;v_sum:=v_sum+v_bytes;
 select count(*),coalesce(sum(octet_length(to_jsonb(r)::text)),0) into v_count,v_bytes from public.company_people r where organization_id=p_org and person_id=p_id;
 if v_count>10000 or v_sum+v_bytes+octet_length(v_person::text)>16777216 then raise exception using errcode='54000',message='history_export_limit';end if;
 v_result:=jsonb_build_object('scope','person_profile_and_history','person',v_person,
  'links',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.company_people r where organization_id=p_org and person_id=p_id),
  'import_rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.import_rows r where organization_id=p_org and person_id=p_id),
  'history',jsonb_build_object(
   'services',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.limpax_service_history r where organization_id=p_org and person_id=p_id),
   'locations',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.limpax_customer_locations r where organization_id=p_org and person_id=p_id)));
 return v_result;
end;$export$;

revoke all on function public.fn_limpax_history_access(uuid,text,boolean) from public,anon,authenticated,service_role;

revoke all on function public.fn_limpax_history_no_restore() from public,anon,authenticated,service_role;

revoke all on function public.fn_limpax_history_guard_copies() from public,anon,authenticated,service_role;

revoke all on function public.fn_limpax_history_clear_current_contact() from public,anon,authenticated,service_role;

revoke all on function public.fn_limpax_history_manage(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;

grant execute on function public.fn_limpax_history_manage(uuid,text,uuid,jsonb) to authenticated;

revoke all on function public.fn_limpax_history_view(uuid,text,uuid,uuid) from public,anon,authenticated,service_role;

grant execute on function public.fn_limpax_history_view(uuid,text,uuid,uuid) to authenticated;

revoke all on function public.fn_limpax_history_export_person(uuid,uuid) from public,anon,authenticated,service_role;

grant execute on function public.fn_limpax_history_export_person(uuid,uuid) to authenticated;

create or replace function public.fn_limpax_history_reverse_batch(p_org uuid,p_batch uuid,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $reverse$
declare v_key uuid;v_hash text;v_prior record;v_import record;v_count integer;v_time timestamptz;v_result jsonb;
begin
 perform public.fn_limpax_history_access(p_org,'admin',true);
 -- Hold membership while mutating; a revocation must serialize with this command.
 perform 1 from public.user_organizations where organization_id=p_org and user_id=auth.uid()
  and role='admin' and accepted_at is not null and revoked_at is null for share;
 if not found then raise exception using errcode='42501',message='history_access_denied';end if;
 if p_batch is null or jsonb_typeof(p_body) is distinct from 'object'
  or not(p_body ?& array['request_id','confirm']) or (p_body->'confirm') is distinct from 'true'::jsonb
  or exists(select 1 from jsonb_object_keys(p_body) k where k not in('request_id','confirm')) then
  raise exception using errcode='22023',message='history_invalid_command';end if;
 v_key:=(p_body->>'request_id')::uuid;
 if v_key is null then raise exception using errcode='22023',message='history_invalid_command';end if;
 if not pg_try_advisory_xact_lock(hashtextextended('crm-import:'||p_org::text,0)) then
  raise exception using errcode='55006',message='history_busy';end if;
 v_hash:=encode(sha256(convert_to('reverse_batch'||p_batch::text||p_body::text,'UTF8')),'hex');
 select * into v_prior from public.limpax_history_management_receipts where organization_id=p_org and request_id=v_key;
 if found then
  if v_prior.payload_sha256<>v_hash then raise exception using errcode='PT409',message='history_request_conflict';end if;
  return v_prior.result||jsonb_build_object('reused',true);
 end if;
 select * into v_import from public.limpax_history_receipts where organization_id=p_org and batch_id=p_batch for update;
 if not found then raise exception using errcode='P0002',message='history_batch_not_found';end if;
 -- A new key may observe an already reversed batch; never rewrite the audit/state.
 if v_import.reversed_at is not null then
  return jsonb_build_object('batch_id',p_batch,'request_id',v_key,'voided_services',v_import.service_rows,
   'reversed_at',v_import.reversed_at,'reused',true);
 end if;
 perform 1 from public.limpax_service_history s join public.import_rows i on i.id=s.import_row_id
  and i.organization_id=s.organization_id where i.organization_id=p_org and i.batch_id=p_batch for update of s;
 if exists(select 1 from public.limpax_service_history s join public.import_rows i on i.id=s.import_row_id
  and i.organization_id=s.organization_id where i.organization_id=p_org and i.batch_id=p_batch
  and (s.revision<>0 or s.voided_at is not null or s.redacted_at is not null)) then
  raise exception using errcode='PT409',message='history_batch_modified';end if;
 v_time:=now();
 update public.limpax_service_history s set voided_at=v_time,revision=revision+1
  from public.import_rows i where i.id=s.import_row_id and i.organization_id=s.organization_id
  and i.organization_id=p_org and i.batch_id=p_batch;
 get diagnostics v_count=row_count;
 if v_count<>v_import.service_rows then raise exception using errcode='PT409',message='history_batch_modified';end if;
 update public.limpax_history_receipts set reversed_at=v_time where organization_id=p_org and batch_id=p_batch;
 v_result:=jsonb_build_object('batch_id',p_batch,'request_id',v_key,'voided_services',v_count,'reversed_at',v_time,'reused',false);
 insert into public.limpax_history_management_receipts(organization_id,request_id,payload_sha256,result,created_by)
  values(p_org,v_key,v_hash,v_result,auth.uid());
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,bypassed_rls,metadata)
  values(p_org,auth.uid(),'limpax.history.batch_reversed','import_batch',p_batch,true,
   jsonb_build_object('request_id',v_key,'voided_services',v_count));
 return v_result;
end;$reverse$;

revoke all on function public.fn_limpax_history_reverse_batch(uuid,uuid,jsonb) from public,anon,authenticated,service_role;

grant execute on function public.fn_limpax_history_reverse_batch(uuid,uuid,jsonb) to authenticated;
