-- DRAFT ONLY: disposable PostgreSQL after provisioner, atomic and lifecycle.
-- No canonical migration, operational application, real data or automatic retention.
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
create policy limpax_subject_read on public.limpax_history_subjects for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()));
drop policy if exists limpax_management_read on public.limpax_history_management_receipts;
create policy limpax_management_read on public.limpax_history_management_receipts for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()));
revoke all on public.limpax_history_subjects,public.limpax_history_management_receipts from public,anon,authenticated,service_role;
grant select on public.limpax_history_subjects,public.limpax_history_management_receipts to authenticated;
select public.fn_proteger_modulo_provisionado();

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
revoke all on function public.fn_limpax_history_access(uuid,text,boolean) from public,anon,authenticated,service_role;

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
revoke all on function public.fn_limpax_history_no_restore() from public,anon,authenticated,service_role;
drop trigger if exists limpax_person_no_restore on public.people;
create trigger limpax_person_no_restore before update of full_name,normalized_name,email,notes on public.people
 for each row execute function public.fn_limpax_history_no_restore();
drop trigger if exists limpax_service_no_restore on public.limpax_service_history;
create trigger limpax_service_no_restore before insert on public.limpax_service_history
 for each row execute function public.fn_limpax_history_no_restore();
drop trigger if exists limpax_location_no_restore on public.limpax_customer_locations;
create trigger limpax_location_no_restore before insert on public.limpax_customer_locations
 for each row execute function public.fn_limpax_history_no_restore();


-- Close indirect re-identification paths in the existing B2B tables.
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
revoke all on function public.fn_limpax_history_guard_copies() from public,anon,authenticated,service_role;
drop trigger if exists limpax_link_no_restore on public.company_people;
create trigger limpax_link_no_restore before insert or update of person_id,job_title,department,notes on public.company_people
 for each row execute function public.fn_limpax_history_guard_copies();
drop trigger if exists limpax_import_no_restore on public.import_rows;
create trigger limpax_import_no_restore before insert or update of person_id,raw_data,normalized_data,error on public.import_rows
 for each row execute function public.fn_limpax_history_guard_copies();
drop trigger if exists limpax_phone_no_restore on public.contacts;
create trigger limpax_phone_no_restore before insert or update of person_id,is_anonymized on public.contacts
 for each row execute function public.fn_limpax_history_guard_copies();

-- Extend the pre-existing contact event to any corrected text too.
create or replace function public.fn_limpax_history_clear_current_contact()
returns trigger language plpgsql security definer set search_path='' as $current$
begin
 update public.limpax_service_history set notes_current='' where organization_id=new.organization_id
  and person_id=new.person_id;
 return new;
end;$current$;
revoke all on function public.fn_limpax_history_clear_current_contact() from public,anon,authenticated,service_role;
drop trigger if exists trg_limpax_current_redact on public.contacts;
create trigger trg_limpax_current_redact after update of is_anonymized on public.contacts
 for each row when(new.is_anonymized and old.is_anonymized is distinct from true)
 execute function public.fn_limpax_history_clear_current_contact();

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
revoke all on function public.fn_limpax_history_manage(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.fn_limpax_history_manage(uuid,text,uuid,jsonb) to authenticated;

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
revoke all on function public.fn_limpax_history_view(uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.fn_limpax_history_view(uuid,text,uuid,uuid) to authenticated;

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
revoke all on function public.fn_limpax_history_export_person(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.fn_limpax_history_export_person(uuid,uuid) to authenticated;
