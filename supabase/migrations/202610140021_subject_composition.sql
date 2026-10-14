-- Composer des sujets préparatoires avec le modèle relationnel existant.
-- Un sujet non rattaché reste en brouillon et ne peut pas ouvrir une tentative.
begin;
alter table escen.exam_papers alter column evaluation_id drop not null;
alter table escen.exam_papers add column title text;
alter table escen.exam_papers add column instructions text;
alter table escen.exam_papers add column duration_minutes integer check (duration_minutes > 0);
alter table escen.exam_papers add column purpose text not null default 'EXAMEN' check (purpose in ('CONTROLE_CONTINU','EXAMEN','RATTRAPAGE'));
alter table escen.exam_papers add column author_id uuid references escen.accounts(id) on delete restrict;
alter table escen.exam_papers add column source_evaluation_row_id uuid references escen_private.legacy_rows(id) on delete restrict;
alter table escen.exam_papers add column library_id uuid not null default gen_random_uuid();
alter table escen.exam_papers add column archived_at timestamptz;
alter table escen.exam_papers add constraint subject_library_version unique(library_id,version);
alter table escen.exam_papers add constraint standalone_subject_draft check (evaluation_id is not null or (status='BROUILLON' and author_id is not null and title is not null and length(btrim(title))>0));
alter table escen.exam_papers add constraint subject_single_evaluation_reference check (evaluation_id is null or source_evaluation_row_id is null);
create index subject_author_fk on escen.exam_papers(author_id);
create index subject_source_fk on escen.exam_papers(source_evaluation_row_id);
create function escen_private.guard_subject_source() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if new.source_evaluation_row_id is not null and not exists(select 1 from escen_private.legacy_rows where id=new.source_evaluation_row_id and source_table='evaluations') then raise exception 'La référence doit être une évaluation historique' using errcode='23514'; end if;
  return new;
end $$;
create trigger subject_source_guard before insert or update on escen.exam_papers for each row execute function escen_private.guard_subject_source();
create function public.escen_subject_transaction(p_actor_id uuid,p_expected_revision bigint,p_changes jsonb) returns bigint
language plpgsql security definer set search_path=pg_catalog as $$
declare result bigint:=p_expected_revision; start_index integer:=0; chunk jsonb;
begin
  if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)<1 or jsonb_array_length(p_changes)>1000 then raise exception 'Lot de sujet invalide' using errcode='23514'; end if;
  if exists(select 1 from jsonb_array_elements(p_changes) c where c->>'table' not in ('exam_papers','exam_parts','exam_questions','exam_options')) then raise exception 'Table hors sujet' using errcode='42501'; end if;
  while start_index<jsonb_array_length(p_changes) loop
    select jsonb_agg(value order by ordinality) into chunk from jsonb_array_elements(p_changes) with ordinality where ordinality>start_index and ordinality<=start_index+100;
    result:=public.escen_backend_transaction(p_actor_id,result,chunk); start_index:=start_index+100;
  end loop;
  return result;
end $$;
revoke all on function escen_private.guard_subject_source() from public;
revoke all on function public.escen_subject_transaction(uuid,bigint,jsonb) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on function public.escen_subject_transaction(uuid,bigint,jsonb) from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on function public.escen_subject_transaction(uuid,bigint,jsonb) from authenticated; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_subject_transaction(uuid,bigint,jsonb) to service_role; end if;
end $$;
create function public.escen_catalog_history_links(p_table text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if p_table not in ('programs','subjects','academic_years','levels','groups','rooms','tracks','cycles','sites','buildings','assets','suppliers') then raise exception 'Collection inconnue' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('sourceRowId',row_id,'targetId',target_id)) from escen_private.source_mappings where target_table=p_table),'[]');
end $$;
revoke all on function public.escen_catalog_history_links(text) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on function public.escen_catalog_history_links(text) from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on function public.escen_catalog_history_links(text) from authenticated; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_catalog_history_links(text) to service_role; end if;
end $$;
commit;
