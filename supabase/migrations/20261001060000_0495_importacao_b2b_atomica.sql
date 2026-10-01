-- LimpaxCRM: lote idempotente e linha transacional. Não apaga dados existentes.
-- Security invoker: JWT + papel manager, RLS e filtros explícitos permanecem ativos.
alter table public.import_batches add column if not exists source_fingerprint text;
create unique index if not exists import_batches_source_fingerprint_unique
  on public.import_batches (organization_id, kind, source_fingerprint)
  where source_fingerprint is not null;

create or replace function public.fn_import_companies_people_atomic(
  p_organization_id uuid, p_filename text, p_mapping jsonb, p_rows jsonb
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch public.import_batches%rowtype;
  v_fingerprint text;
  v_row jsonb; v_data jsonb; v_raw jsonb;
  v_number integer := 1;
  v_company uuid; v_person uuid; v_contact uuid; v_contact_person uuid;
  v_ids uuid[]; v_phones text[];
  v_trade text; v_legal text; v_name text; v_normalized_name text;
  v_cnpj text; v_phone text; v_email text; v_existing_email text;
  v_error text; v_status text; v_code text;
  v_success integer := 0; v_failed integer := 0; v_conflict integer := 0;
begin
  if v_actor is null or not coalesce(public.fn_role_at_least(p_organization_id, 'manager'), false) then
    raise exception using errcode = '42501', message = 'Importação exige manager da organização.';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 2000
     or octet_length(p_rows::text) > 8388608 or jsonb_typeof(p_mapping) is distinct from 'object'
     or nullif(btrim(p_filename), '') is null or length(p_filename) > 255 then
    raise exception using errcode = '22023', message = 'Lote de importação inválido.';
  end if;
  -- A trava dura a transação inteira: não expira no meio de um lote demorado.
  if not pg_try_advisory_xact_lock(hashtextextended('crm-import:' || p_organization_id::text, 0)) then
    raise exception using errcode = '55006', message = 'Outra importação está em andamento. Aguarde e tente novamente.';
  end if;
  v_fingerprint := encode(sha256(convert_to(p_rows::text || p_mapping::text, 'UTF8')), 'hex');
  select * into v_batch from public.import_batches
    where organization_id = p_organization_id and kind = 'companies_people' and source_fingerprint = v_fingerprint;
  if found then
    return jsonb_build_object('batch_id', v_batch.id, 'successful_rows', v_batch.successful_rows,
      'failed_rows', v_batch.failed_rows, 'conflict_rows', v_batch.conflict_rows,
      'processed_rows', v_batch.processed_rows, 'reused', true);
  end if;
  insert into public.import_batches (organization_id, kind, filename, status, total_rows, column_mapping, created_by, source_fingerprint)
    values (p_organization_id, 'companies_people', p_filename, 'processing', jsonb_array_length(p_rows), p_mapping, v_actor, v_fingerprint)
    returning * into v_batch;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_number := v_number + 1;
    v_company := null; v_person := null; v_contact := null; v_contact_person := null;
    v_error := null; v_status := 'success';
    v_data := v_row->'normalized_data'; v_raw := v_row->'raw_data';
    -- Bloco EXCEPTION é uma subtransação: QUALQUER escrita da linha é desfeita se falhar.
    begin
      if jsonb_typeof(v_data) is distinct from 'object' or jsonb_typeof(v_raw) is distinct from 'object' then
        raise exception using errcode = '22023', message = 'Linha inválida.';
      end if;
      if nullif(v_row->>'validation_error', '') is not null then
        raise exception using errcode = '22023', message = v_row->>'validation_error';
      end if;
      v_trade := coalesce(nullif(btrim(v_data->>'trade_name'), ''), nullif(btrim(v_data->>'company_name'), ''), nullif(btrim(v_data->>'legal_name'), ''));
      v_legal := coalesce(nullif(btrim(v_data->>'legal_name'), ''), nullif(btrim(v_data->>'company_name'), ''), v_trade);
      v_name := nullif(btrim(v_data->>'person_name'), '');
      v_normalized_name := nullif(v_data->>'normalized_name', '');
      v_cnpj := nullif(v_data->>'normalized_cnpj', '');
      v_phone := nullif(v_data->>'phone_e164', '');
      v_email := nullif(btrim(v_data->>'email'), '');
      if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
        raise exception using errcode = '22023', message = 'Telefone inválido.';
      end if;
      if v_cnpj is not null and (v_cnpj !~ '^[0-9]{14}$' or v_cnpj ~ '^([0-9])\1{13}$') then
        raise exception using errcode = '22023', message = 'CNPJ inválido.';
      end if;
      if greatest(coalesce(length(v_trade),0),coalesce(length(v_legal),0)) > 500 or coalesce(length(v_name),0) > 300
        or coalesce(length(v_email),0) > 320 then
        raise exception using errcode = '22023', message = 'Campo da linha excede o limite.';
      end if;
      if v_trade is null and v_legal is null and v_cnpj is null and v_name is null and v_phone is null then
        raise exception using errcode = '22023', message = 'Linha vazia — sem empresa, pessoa ou telefone.';
      end if;
      if v_name is not null and v_normalized_name is null then
        raise exception using errcode = '22023', message = 'Nome normalizado ausente.';
      end if;
      if v_phone is not null then
        select coalesce(array_agg(value), array[]::text[]) into v_phones
          from jsonb_array_elements_text(coalesce(v_data->'phone_variants', '[]'::jsonb));
        v_phones := array_append(v_phones, v_phone);
        select array_agg(id) into v_ids from public.contacts
          where organization_id = p_organization_id and phone_number = any(v_phones) and is_merged_into is null and kind = 'person';
        if coalesce(cardinality(v_ids),0) > 1 then
          raise exception using errcode = 'P0001', message = 'Mais de um contato para este telefone. Revise os duplicados.';
        end if;
        v_contact := v_ids[1];
        if v_contact is not null then
          select person_id into v_contact_person from public.contacts where id = v_contact and organization_id = p_organization_id;
          if v_contact_person is not null and v_name is not null and not exists (
            select 1 from public.people where id = v_contact_person and organization_id = p_organization_id and normalized_name = v_normalized_name
          ) then raise exception using errcode = 'P0001', message = 'Telefone já vinculado a outra pessoa.'; end if;
        end if;
      end if;
      if v_trade is not null or v_legal is not null or v_cnpj is not null then
        if v_cnpj is not null then
          select array_agg(id) into v_ids from public.companies where organization_id = p_organization_id and normalized_cnpj = v_cnpj;
        else
          select array_agg(id) into v_ids from public.companies where organization_id = p_organization_id and normalized_cnpj is null
            and trade_name is not distinct from v_trade and legal_name is not distinct from v_legal;
        end if;
        if coalesce(cardinality(v_ids),0) > 1 then raise exception using errcode = 'P0001', message = 'Empresa ambígua. Informe o CNPJ.'; end if;
        v_company := v_ids[1];
        if v_company is null then
          insert into public.companies (organization_id, legal_name, trade_name, cnpj, normalized_cnpj, enrichment_status, created_by)
            values (p_organization_id, v_legal, v_trade, v_cnpj, v_cnpj, 'pending', v_actor) returning id into v_company;
        end if;
      end if;
      if v_name is not null then
        if v_company is not null then
          select array_agg(p.id) into v_ids from public.people p join public.company_people cp on cp.person_id = p.id
            where p.organization_id = p_organization_id and cp.organization_id = p_organization_id
              and cp.company_id = v_company and p.normalized_name = v_normalized_name;
        else
          select array_agg(id) into v_ids from public.people where organization_id = p_organization_id and normalized_name = v_normalized_name;
        end if;
        if coalesce(cardinality(v_ids),0) > 1 then raise exception using errcode = 'P0001', message = 'Pessoa ambígua. Revise o cadastro.'; end if;
        v_person := v_ids[1];
        if v_person is not null then
          select email into v_existing_email from public.people where id = v_person and organization_id = p_organization_id;
          if v_email is not null and lower(coalesce(v_existing_email,'')) <> lower(v_email) then
            raise exception using errcode = 'P0001', message = 'Pessoa já cadastrada com e-mail diferente.';
          end if;
        else
          insert into public.people (organization_id, full_name, normalized_name, email, created_by)
            values (p_organization_id, v_name, v_normalized_name, v_email, v_actor) returning id into v_person;
        end if;
        if v_contact_person is not null and v_contact_person is distinct from v_person then
          raise exception using errcode = 'P0001', message = 'Telefone já vinculado a outra pessoa.';
        end if;
        if v_company is not null then
          insert into public.company_people (organization_id, company_id, person_id, job_title, is_decision_maker)
            values (p_organization_id, v_company, v_person, nullif(v_data->>'job_title',''), true)
            on conflict (company_id,person_id) do nothing;
        end if;
      end if;
      if v_phone is not null then
        if v_contact is null then
          insert into public.contacts (organization_id, name, display_name, phone_number, email, person_id, source, source_metadata, created_by_user_id)
            values (p_organization_id, coalesce(v_name,v_trade,v_phone), coalesce(v_name,v_trade,v_phone), v_phone, v_email, v_person,
              'import_csv', jsonb_build_object('import_batch_id',v_batch.id), v_actor) returning id into v_contact;
        elsif v_person is not null and v_contact_person is null then
          update public.contacts set person_id = v_person where id = v_contact and organization_id = p_organization_id;
        end if;
      end if;
      insert into public.import_rows (organization_id,batch_id,row_number,raw_data,normalized_data,status,company_id,person_id,contact_id)
        values (p_organization_id,v_batch.id,v_number,v_raw,v_data,'success',v_company,v_person,v_contact);
    exception when others then
      get stacked diagnostics v_error = message_text, v_code = returned_sqlstate;
      -- Erros inesperados abortam o lote inteiro; não são mascarados como erro da planilha.
      if v_code not in ('P0001','22023','23505','23514','22001') then raise; end if;
      v_status := case when v_code in ('P0001','23505') then 'conflict' else 'failed' end;
      insert into public.import_rows (organization_id,batch_id,row_number,raw_data,normalized_data,status,error)
        values (p_organization_id,v_batch.id,v_number,coalesce(v_raw,'{}'),coalesce(v_data,'{}'),v_status,left(v_error,1000));
    end;
    if v_status = 'success' then v_success := v_success + 1;
    elsif v_status = 'conflict' then v_conflict := v_conflict + 1;
    else v_failed := v_failed + 1; end if;
  end loop;
  update public.import_batches set status='completed',processed_rows=v_success+v_failed+v_conflict,
    successful_rows=v_success,failed_rows=v_failed,conflict_rows=v_conflict,completed_at=now()
    where id=v_batch.id and organization_id=p_organization_id;
  return jsonb_build_object('batch_id',v_batch.id,'successful_rows',v_success,'failed_rows',v_failed,
    'conflict_rows',v_conflict,'processed_rows',v_success+v_failed+v_conflict,'reused',false);
end;
$$;
revoke all on function public.fn_import_companies_people_atomic(uuid,text,jsonb,jsonb) from public,anon,service_role;
grant execute on function public.fn_import_companies_people_atomic(uuid,text,jsonb,jsonb) to authenticated;
