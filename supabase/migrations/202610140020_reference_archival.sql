-- Retrait réversible des référentiels : toutes les relations et traces restent conservées.
begin;
do $$ declare name text;
begin
  foreach name in array array['sites','buildings','rooms','academic_years','cycles','levels','programs','tracks','subjects','groups','assets','suppliers'] loop
    execute format('alter table escen.%I add column archived_at timestamptz, add column reason text',name);
    execute format('alter table escen.%I add constraint %I check (archived_at is null or (reason is not null and length(btrim(reason)) >= 3))',name,name||'_archive_reason');
  end loop;
end $$;
alter table escen.students add column reason text;
alter table escen.staff add column reason text;
alter table escen.students add constraint student_archive_reason check (archived_at is null or (reason is not null and length(btrim(reason)) >= 3));
alter table escen.staff add constraint staff_archive_reason check (archived_at is null or (reason is not null and length(btrim(reason)) >= 3));
create function public.escen_catalog_resume(p_actor_id uuid,p_expected_revision bigint,p_table text,p_record jsonb,p_source_id uuid) returns bigint
language plpgsql security definer set search_path=pg_catalog as $$
declare original escen_private.legacy_rows; expected text; revision bigint;
begin
  expected:=case p_table when 'programs' then 'filieres' when 'subjects' then 'matieres' when 'academic_years' then 'annee_scolaires' when 'levels' then 'niveaux' when 'groups' then 'groups' when 'rooms' then 'salles' end;
  if expected is null then raise exception 'Reprise non autorisée' using errcode='42501'; end if;
  select * into original from escen_private.legacy_rows where id=p_source_id and source_table=expected and escen_private.history_visible_row(legacy_rows);
  if original.id is null then raise exception 'Source introuvable' using errcode='23503'; end if;
  if exists(select 1 from escen_private.source_mappings where row_id=p_source_id and target_table=p_table) then raise exception 'Source déjà reprise' using errcode='23505'; end if;
  revision:=public.escen_backend_transaction(p_actor_id,p_expected_revision,jsonb_build_array(jsonb_build_object('table',p_table,'operation','insert','record',p_record)));
  insert into escen_private.source_mappings(row_id,target_table,target_id,mapped_by,reason,mapping_method) values(p_source_id,p_table,(p_record->>'id')::uuid,p_actor_id,p_record->>'reason','HUMAN_REVIEW');
  return revision;
end $$;
revoke all on function public.escen_catalog_resume(uuid,bigint,text,jsonb,uuid) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on function public.escen_catalog_resume(uuid,bigint,text,jsonb,uuid) from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on function public.escen_catalog_resume(uuid,bigint,text,jsonb,uuid) from authenticated; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_catalog_resume(uuid,bigint,text,jsonb,uuid) to service_role; end if;
end $$;
commit;
