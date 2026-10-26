-- Proposition uniquement. Accord requis avant création d’une migration.
-- Corrige un faux état de résultats publiés provenant du champ source "published"
-- (publication de la programmation). Aucun candidat, note, copie ou transition
-- métier ne doit déjà exister dans l’évaluation cible.
begin;
create table escen.evaluation_recovery_events (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null unique references escen.evaluations(id) on delete restrict,
  source_row_id uuid not null references escen_private.legacy_rows(id) on delete restrict,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  from_status text not null check(from_status='PUBLIEES'),
  to_status text not null check(to_status='BROUILLON'),
  source_programming_published boolean not null check(source_programming_published),
  reason text not null check(length(btrim(reason)) between 3 and 1000),
  recovered_at timestamptz not null default now()
);
alter table escen.evaluation_recovery_events enable row level security;
create index evaluation_recovery_source_fk on escen.evaluation_recovery_events(source_row_id);
create index evaluation_recovery_actor_fk on escen.evaluation_recovery_events(actor_id);
create trigger recovery_immutable before update or delete on escen.evaluation_recovery_events
  for each row execute function escen_private.immutable_record();
create trigger audit_event after insert or update on escen.evaluation_recovery_events
  for each row execute function escen_private.record_audit();

create function escen_private.recover_empty_evaluation() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare evaluation escen.evaluations; source escen_private.legacy_rows;
begin
  select * into evaluation from escen.evaluations where id=new.evaluation_id for update;
  select * into source from escen_private.legacy_rows where id=new.source_row_id;
  if evaluation.id is null or evaluation.status<>'PUBLIEES' or evaluation.cancelled_at is not null
    or evaluation.archived_at is not null or evaluation.legacy_source_row_id is distinct from source.id
    or source.source_table is distinct from 'evaluations' or source.payload->>'published' is distinct from '1'
    or nullif(source.payload->>'correction_submission_date','') is not null
    or not exists(select 1 from escen_private.source_mappings m join escen_private.import_runs r on r.id=m.import_run_id
      where m.row_id=source.id and m.target_table='evaluations' and m.target_id=evaluation.id
        and m.mapping_method='SOURCE_EXACT' and r.run_code='CANONICAL_2025_V1') then
    raise exception 'Évaluation ou preuve de reprise incompatible' using errcode='23514';
  end if;
  if exists(select 1 from escen.evaluation_candidates where evaluation_id=evaluation.id)
    or exists(select 1 from escen.exam_attempts where evaluation_id=evaluation.id)
    or exists(select 1 from escen.exam_papers where evaluation_id=evaluation.id)
    or exists(select 1 from escen.evaluation_transitions where evaluation_id=evaluation.id) then
    raise exception 'Évaluation déjà utilisée : revue individuelle requise' using errcode='23514';
  end if;
  if nullif(current_setting('escen.actor_id',true),'') is distinct from new.actor_id::text
    or not exists(select 1 from escen.accounts a join escen.people person on person.id=a.person_id join escen.role_grants g on g.account_id=a.id
      join escen.roles role on role.id=g.role_id
      where a.id=new.actor_id and a.active and a.auth_user_id is not null and a.archived_at is null and person.archived_at is null
        and role.code='IT' and role.active and g.site_id is null and g.group_id is null and g.academic_year_id is null
        and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
        and (select count(distinct p.code) from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id
          where rp.role_id=role.id and p.code in ('grade.review','grade.publish'))=2) then
    raise exception 'Régularisation réservée à un Informaticien global autorisé' using errcode='42501';
  end if;
  -- Nested, audited event transition: existing evaluation guards stay enabled.
  -- Only status changes; dates, subject, group, source and identities are preserved.
  update escen.evaluations set status='BROUILLON' where id=evaluation.id;
  return new;
end $$;
create trigger recover_empty_evaluation after insert on escen.evaluation_recovery_events
  for each row execute function escen_private.recover_empty_evaluation();

create function public.escen_recover_empty_evaluations(p_actor_id uuid,p_expected_revision bigint,p_records jsonb)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare changes jsonb;
begin
  if p_actor_id is null or p_expected_revision is null or p_expected_revision<0 then
    raise exception 'Auteur et révision obligatoires' using errcode='23514';
  end if;
  if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records) not between 1 and 25 then
    raise exception 'Lot de régularisation borné à 25 évaluations' using errcode='23514';
  end if;
  if exists(select 1 from jsonb_array_elements(p_records) r where jsonb_typeof(r) is distinct from 'object'
    or r-array['id','evaluation_id','source_row_id','reason']<>'{}'::jsonb) then
    raise exception 'Attribut de régularisation interdit' using errcode='23514';
  end if;
  select jsonb_agg(jsonb_build_object('table','evaluation_recovery_events','operation','insert','record',r||jsonb_build_object(
    'actor_id',p_actor_id,'from_status','PUBLIEES','to_status','BROUILLON','source_programming_published',true)))
    into changes from jsonb_array_elements(p_records) r;
  return public.escen_backend_transaction(p_actor_id,p_expected_revision,changes);
end $$;
revoke all on function escen_private.recover_empty_evaluation() from public;
revoke all on function public.escen_recover_empty_evaluations(uuid,bigint,jsonb) from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on function public.escen_recover_empty_evaluations(uuid,bigint,jsonb) from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_recover_empty_evaluations(uuid,bigint,jsonb) to service_role;
  end if;
end $$;
commit;
