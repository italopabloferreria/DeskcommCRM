-- DRAFT: batch reversal is logical. Customers, locations, raw rows and receipts remain.
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
