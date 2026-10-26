-- Proposition à approuver avant création de la migration et exécution locale.
begin;
create table escen.application_admissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references escen.online_applications(id) on delete restrict,
  student_id uuid not null unique references escen.students(id) on delete restrict,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  admitted_by uuid not null references escen.accounts(id) on delete restrict,
  admitted_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason)) between 3 and 1000),
  request_fingerprint text not null check(request_fingerprint ~ '^[a-f0-9]{32}$')
);
create index application_admissions_year_fk on escen.application_admissions(academic_year_id);
create index application_admissions_actor_fk on escen.application_admissions(admitted_by);
alter table escen.application_admissions enable row level security;
create trigger audit_event after insert or update on escen.application_admissions
  for each row execute function escen_private.record_audit();
create trigger application_admissions_immutable before update or delete on escen.application_admissions
  for each row execute function escen_private.immutable_record();

create function public.escen_admit_application(p_actor_id uuid, p_role_code text,
  p_application_id uuid, p_expected_version integer, p_expected_revision bigint,
  p_year_id uuid, p_matricule text, p_person jsonb, p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; admission escen.application_admissions;
  person_id uuid:=gen_random_uuid(); student_id uuid:=gen_random_uuid(); revision bigint;
  fingerprint text; previous_matricule text;
begin
  if not exists(select 1 from escen.accounts account
    join escen.role_grants g on g.account_id=account.id
    join escen.roles r on r.id=g.role_id
    join escen.role_permissions rp on rp.role_id=r.id
    join escen.permissions p on p.id=rp.permission_id
    where account.id=p_actor_id and account.active and account.auth_user_id is not null
      and account.archived_at is null and r.active and r.code=p_role_code
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
      and p.code in ('student.update','student.lifecycle.manage')
    group by g.id having count(distinct p.code)=2) then
    raise exception 'Admission globale non autorisée' using errcode='42501';
  end if;
  if coalesce(length(btrim(p_matricule)),0) not between 1 and 160
    or coalesce(length(btrim(p_reason)),0) not between 3 and 1000
    or jsonb_typeof(p_person) is distinct from 'object'
    or coalesce(length(btrim(p_person->>'firstname')),0) not between 1 and 160
    or coalesce(length(btrim(p_person->>'lastname')),0) not between 1 and 160
    or exists(select 1 from jsonb_object_keys(p_person) key where key not in
      ('firstname','lastname','email','phone','gender','birth_date','nationality','address','city','country')) then
    raise exception 'Identité ou motif invalide' using errcode='23514';
  end if;
  select pr.revision into revision from escen_private.portal_revision pr where singleton for update;
  select * into a from escen.online_applications where id=p_application_id for update;
  if a.id is null or a.academic_year_id is distinct from p_year_id then
    raise exception 'Candidature introuvable dans cette année' using errcode='P0002';
  end if;
  fingerprint:=md5(jsonb_build_object('matricule',btrim(p_matricule),'person',p_person)::text);
  select * into admission from escen.application_admissions where application_id=a.id;
  if admission.id is not null then
    if admission.request_fingerprint<>fingerprint then
      raise exception 'Cette candidature possède déjà un dossier : consultez-le' using errcode='23514';
    end if;
    select matricule into previous_matricule from escen.students where id=admission.student_id;
    return jsonb_build_object('studentId',admission.student_id,'matricule',previous_matricule,
      'revision',revision,'alreadyConverted',true);
  end if;
  if p_expected_revision is distinct from revision or p_expected_version is distinct from a.version then
    raise exception 'Modification concurrente' using errcode='40001';
  end if;
  if a.status not in ('RECU','EN_ANALYSE') or a.submitted_at is null
    or not exists(select 1 from escen.academic_years where id=p_year_id and archived_at is null) then
    raise exception 'Candidature non recevable ou déjà classée' using errcode='23514';
  end if;
  if exists(select 1 from escen.students where lower(matricule)=lower(btrim(p_matricule)))
    or (nullif(p_person->>'email','') is not null and exists(select 1 from escen.people
      where lower(email)=lower(p_person->>'email'))) then
    raise exception 'Matricule ou identité déjà enregistré : rapprochement explicite requis' using errcode='23505';
  end if;
  revision:=public.escen_backend_transaction(p_actor_id,revision,jsonb_build_array(
    jsonb_build_object('table','people','operation','insert','record',p_person||jsonb_build_object('id',person_id)),
    jsonb_build_object('table','students','operation','insert','record',jsonb_build_object(
      'id',student_id,'person_id',person_id,'matricule',btrim(p_matricule),'reason',p_reason)),
    jsonb_build_object('table','online_applications','operation','update','record',jsonb_build_object(
      'id',a.id,'status','CLASSE','version',a.version+1,'reason',p_reason)),
    jsonb_build_object('table','application_admissions','operation','insert','record',jsonb_build_object(
      'id',gen_random_uuid(),'application_id',a.id,'student_id',student_id,'academic_year_id',p_year_id,
      'admitted_by',p_actor_id,'reason',p_reason,'request_fingerprint',fingerprint))));
  return jsonb_build_object('studentId',student_id,'matricule',btrim(p_matricule),
    'revision',revision,'alreadyConverted',false);
end $$;
revoke all on function public.escen_admit_application(uuid,text,uuid,integer,bigint,uuid,text,jsonb,text) from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on function public.escen_admit_application(uuid,text,uuid,integer,bigint,uuid,text,jsonb,text) from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_admit_application(uuid,text,uuid,integer,bigint,uuid,text,jsonb,text) to service_role;
  end if;
end $$;
commit;
