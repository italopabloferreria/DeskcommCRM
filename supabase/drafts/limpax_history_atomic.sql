-- DRAFT ONLY. Load only in disposable harness AFTER draft provisioner invocation.
-- No remote application, baseline inclusion or browser/API hookup is authorized here.
-- All effects share the caller transaction; NO per-row exception catch/partial success.
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
  if v_actor is null or not coalesce(public.fn_support_write_allowed(p_organization_id), false) then
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
      'locations_created',v_receipt.locations_created,'auxiliary_rows',v_receipt.auxiliary_rows,'reused',true);
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
