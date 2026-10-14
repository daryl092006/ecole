-- Pièces historiques : correspondance exacte du chemin source, jamais par nom seul.
begin;
create or replace function escen_private.safe_history_record(p_row escen_private.legacy_rows) returns jsonb
language sql stable set search_path=pg_catalog as $$
  select jsonb_build_object('id',p_row.id,'sourceId',p_row.source_id,'batchId',p_row.batch_id,'status',p_row.status,
    'values',coalesce((select jsonb_object_agg(e.key,e.value) from jsonb_each(p_row.payload) e where e.key in (select jsonb_object_keys(c.definition->'fields'))),'{}'),
    'issues',coalesce((select jsonb_agg(distinct i.code) from escen_private.import_issues i where i.row_id=p_row.id and i.resolved_at is null),'[]'),
    'files',coalesce((select jsonb_object_agg(e.key,exists(select 1 from escen_private.archive_objects a where a.batch_id=p_row.batch_id and a.kind='DOCUMENT' and a.storage_manifest is null
      and a.source_name=case when ltrim(e.value,'/') like 'storage/%' then ltrim(e.value,'/') else 'storage/'||ltrim(e.value,'/') end))
      from jsonb_each_text(p_row.payload) e where e.key in (select jsonb_object_keys(c.definition->'fields')) and e.value ~* '\.(pdf|jpe?g|png)$'),'{}'))
  from escen_private.history_catalog c where c.table_name=p_row.source_table;
$$;
create index archive_document_source_lookup on escen_private.archive_objects(batch_id,source_name) where kind='DOCUMENT';
create function public.escen_history_document(p_row_id uuid,p_field text) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  select jsonb_build_object('bucket',a.bucket,'path',a.object_path,'name',a.source_name)
  from escen_private.legacy_rows l join escen_private.history_catalog c on c.table_name=l.source_table
  join escen_private.archive_objects a on a.batch_id=l.batch_id and a.kind='DOCUMENT' and a.storage_manifest is null
    and a.source_name=case when ltrim(l.payload->>p_field,'/') like 'storage/%' then ltrim(l.payload->>p_field,'/') else 'storage/'||ltrim(l.payload->>p_field,'/') end
  where l.id=p_row_id and c.definition->'fields' ? p_field and escen_private.history_visible_row(l)
    and (p_field in ('file_path','file_url','cv','lettre','naissance','diplome','nationalite','photo','certificat_medical','coupon','releve_bac1_path','releve_bac2_path','lettre_motivation') or p_field like '%_document_path')
  limit 1;
$$;
create function public.escen_history_page_scoped(p_table text,p_offset integer,p_limit integer,p_query text,p_flagged boolean,p_student_id text,p_batch_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
  if not exists(select 1 from escen_private.history_catalog where table_name=p_table) then raise exception 'Collection non publiée' using errcode='42501'; end if;
  if p_offset<0 or p_offset>1000000 or p_limit<1 or p_limit>100 or length(p_query)>160 or p_batch_id is null or p_student_id is null then raise exception 'Périmètre invalide' using errcode='23514'; end if;
  with source as (
    select l.*,escen_private.safe_history_record(l) as safe from escen_private.legacy_rows l where l.source_table=p_table and l.batch_id=p_batch_id and escen_private.history_visible_row(l)
      and (l.payload->>'etudiant_id'=p_student_id or p_table='etudiants' and l.source_id=p_student_id
        or p_table in ('documents','albums','tuteurs','responsable_frais') and l.payload->>'owner_id'=p_student_id and l.payload->>'owner_type' ~ 'Etudiant$')
  ), filtered as (
    select * from source where (p_query='' or safe->>'values' ilike '%'||p_query||'%')
      and (not p_flagged or exists(select 1 from escen_private.import_issues i where i.row_id=source.id and i.resolved_at is null))
  ) select jsonb_build_object('table',p_table,'total',(select count(*) from filtered),'offset',p_offset,'limit',p_limit,
    'records',coalesce((select jsonb_agg(page.safe) from (select safe from filtered order by source_id,id offset p_offset limit p_limit) page),'[]')) into result;
  return result;
end $$;
revoke all on function public.escen_history_page_scoped(text,integer,integer,text,boolean,text,uuid) from public;
revoke all on function public.escen_history_document(uuid,text) from public;
do $$ declare role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then execute format('revoke all on function public.escen_history_document(uuid,text),public.escen_history_page_scoped(text,integer,integer,text,boolean,text,uuid) from %I',role_name); end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_history_document(uuid,text),public.escen_history_page_scoped(text,integer,integer,text,boolean,text,uuid) to service_role; end if;
end $$;
commit;
