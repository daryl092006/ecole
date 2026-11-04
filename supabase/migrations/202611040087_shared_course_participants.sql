-- SQL approuvé par l’utilisateur le 4 novembre 2026. Application locale uniquement.
-- Une séance physique, plusieurs affectations pédagogiques explicites.
-- À livrer avec les adaptations API/projections/UI décrites dans le dossier associé.
begin;

create table escen.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references escen.sessions(id) on delete restrict,
  assignment_id uuid not null,
  offering_id uuid not null,
  group_id uuid not null,
  teacher_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null,
  reason text,
  foreign key (assignment_id, offering_id, group_id, teacher_id)
    references escen.teaching_assignments(id, offering_id, group_id, teacher_id) on delete restrict,
  unique (session_id, assignment_id),
  unique (session_id, offering_id, group_id),
  unique (id, session_id, offering_id),
  check (ends_at > starts_at),
  check (reason is null or char_length(btrim(reason)) between 3 and 1000)
);
-- Deux offres d'un même groupe peuvent participer à la même séance, jamais
-- à deux séances concurrentes. L'exclusion couvre aussi les écritures concurrentes.
alter table escen.session_participants add constraint session_participant_group_conflict
  exclude using gist (group_id with =, session_id with <>, tstzrange(starts_at,ends_at,'[)') with &&)
  where (active);
create index session_participants_assignment on escen.session_participants(assignment_id);
create index session_participants_offering on escen.session_participants(offering_id);
alter table escen.session_participants enable row level security;
revoke all on escen.session_participants from public;
create trigger audit_event after insert or update on escen.session_participants
  for each row execute function escen_private.record_audit();
create trigger no_delete before delete on escen.session_participants
  for each row execute function escen_private.no_delete();

-- Reprise exacte des rattachements existants, sans modifier séances ou présences.
insert into escen.session_participants(session_id,assignment_id,offering_id,group_id,teacher_id,starts_at,ends_at,active,reason)
select id,assignment_id,offering_id,group_id,teacher_id,starts_at,ends_at,
  status not in ('ANNULE','REPORTE'),'Reprise du rattachement historique de la séance'
from escen.sessions;

create function escen_private.guard_session_participant() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare s escen.sessions; a escen.teaching_assignments;
  anchor_offering escen.academic_offerings; participant_offering escen.academic_offerings;
begin
  select * into strict s from escen.sessions where id=new.session_id for update;
  select * into strict a from escen.teaching_assignments where id=new.assignment_id for share;
  select * into strict anchor_offering from escen.academic_offerings where id=s.offering_id;
  select * into strict participant_offering from escen.academic_offerings where id=a.offering_id;
  if not exists(select 1 from escen.academic_years where id=participant_offering.academic_year_id
    and archived_at is null and status in ('OUVERTE','EN_CLOTURE')) then
    raise exception 'Année non modifiable' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.id<>old.id or new.session_id<>old.session_id or (new.assignment_id<>old.assignment_id
    and (new.assignment_id<>s.assignment_id
      or exists(select 1 from escen.session_participants where session_id=s.id and id<>old.id)
      or exists(select 1 from escen.attendances where session_id=s.id)
      or exists(select 1 from escen.teacher_attendances where session_id=s.id)))) then
    raise exception 'Le rattachement pédagogique est immuable' using errcode='23514';
  end if;
  if a.id<>s.assignment_id then
    if s.mode<>'COURS' or a.teacher_id<>s.teacher_id
      or participant_offering.academic_year_id<>anchor_offering.academic_year_id
      or participant_offering.site_id is distinct from anchor_offering.site_id
      or (select subject_id from escen.curriculum_components where id=a.component_id)
        is distinct from (select c.subject_id from escen.teaching_assignments x
          join escen.curriculum_components c on c.id=x.component_id where x.id=s.assignment_id)
    then raise exception 'Cours commun : matière, enseignant, année ou site incompatible' using errcode='23514'; end if;
    if tg_op='INSERT' and (exists(select 1 from escen.attendances where session_id=s.id)
      or exists(select 1 from escen.teacher_attendances where session_id=s.id)) then
      raise exception 'Une séance émargée conserve ses groupes' using errcode='23514';
    end if;
  end if;
  new.offering_id:=a.offering_id; new.group_id:=a.group_id; new.teacher_id:=a.teacher_id;
  new.starts_at:=s.starts_at; new.ends_at:=s.ends_at;
  new.active:=s.status not in ('ANNULE','REPORTE');
  if new.active then
    if (s.starts_at at time zone 'Africa/Lome')::date<a.valid_from
      or (a.valid_until is not null and (s.ends_at at time zone 'Africa/Lome')::date>a.valid_until) then
      raise exception 'Séance hors de l’affectation participante' using errcode='23514';
    end if;
    if not exists(select 1 from escen.offering_semesters os
      join escen.curriculum_semesters cs on cs.id=os.curriculum_semester_id
      join escen.teaching_units u on u.semester_id=cs.id
      join escen.curriculum_components c on c.unit_id=u.id
      where os.offering_id=a.offering_id and c.id=a.component_id
        and (s.starts_at at time zone 'Africa/Lome')::date>=os.starts_on
        and (s.ends_at at time zone 'Africa/Lome')::date<=os.ends_on) then
      raise exception 'Séance hors du semestre de la matière participante' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger participant_guard before insert or update on escen.session_participants
  for each row execute function escen_private.guard_session_participant();

create function escen_private.sync_session_participants() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  -- L'affectation des séances simples reste modifiable avant émargement.
  -- L'audit de la ligne conserve le rattachement avant/après.
  if tg_op='UPDATE' and new.assignment_id<>old.assignment_id then
    update escen.session_participants set assignment_id=new.assignment_id,
      reason=case when char_length(btrim(new.reason)) between 3 and 1000 then new.reason end
      where session_id=new.id;
  end if;
  insert into escen.session_participants(session_id,assignment_id,offering_id,group_id,teacher_id,starts_at,ends_at,active,reason)
    values(new.id,new.assignment_id,new.offering_id,new.group_id,new.teacher_id,new.starts_at,new.ends_at,
      new.status not in ('ANNULE','REPORTE'),case when char_length(btrim(new.reason)) between 3 and 1000 then new.reason end)
    on conflict(session_id,assignment_id) do nothing;
  update escen.session_participants set starts_at=new.starts_at,ends_at=new.ends_at,
    active=new.status not in ('ANNULE','REPORTE'),
    reason=case when char_length(btrim(new.reason)) between 3 and 1000 then new.reason end
    where session_id=new.id and (starts_at,ends_at,active)
      is distinct from (new.starts_at,new.ends_at,new.status not in ('ANNULE','REPORTE'));
  return new;
end $$;
create trigger session_participants_sync after insert or update on escen.sessions
  for each row execute function escen_private.sync_session_participants();

-- Les rattachements d'une séance commune sont fixes dans cette première version.
-- Déplacer, remplacer l'enseignant ou annuler agit sur la séance physique unique.
create function escen_private.guard_shared_session_change() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if exists(select 1 from escen.session_participants where session_id=old.id and assignment_id<>old.assignment_id)
    and (new.assignment_id<>old.assignment_id or new.mode<>'COURS') then
    raise exception 'Conserver les affectations et le type du cours commun' using errcode='23514';
  end if;
  if exists(select 1 from escen.teacher_attendances where session_id=old.id)
    and ((new.starts_at,new.ends_at,new.assignment_id) is distinct from (old.starts_at,old.ends_at,old.assignment_id)
      or new.status in ('ANNULE','REPORTE')) then
    raise exception 'Une séance émargée conserve son contexte' using errcode='23514';
  end if;
  return new;
end $$;
create trigger shared_session_change before update on escen.sessions
  for each row execute function escen_private.guard_shared_session_change();

create function escen_private.guard_participant_assignment_dates() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if exists(select 1 from escen.session_participants p where p.assignment_id=old.id and p.active
    and ((p.starts_at at time zone 'Africa/Lome')::date<new.valid_from
      or (new.valid_until is not null and (p.ends_at at time zone 'Africa/Lome')::date>new.valid_until))) then
    raise exception 'Traiter les séances participantes avant de réduire l’affectation' using errcode='23514';
  end if;
  return new;
end $$;
create trigger participant_assignment_dates before update of valid_from,valid_until on escen.teaching_assignments
  for each row execute function escen_private.guard_participant_assignment_dates();

-- Chaque présence conserve un rattachement durable vers SA formation participante.
alter table escen.attendances add column session_participant_id uuid;
-- Nullable uniquement pour les présences antérieures, laissées intégralement intactes.
-- Le trigger ci-dessous remplit obligatoirement le lien lors de toute nouvelle écriture.
alter table escen.attendances add constraint attendance_physical_session_fk
  foreign key(session_id) references escen.sessions(id) on delete restrict;
alter table escen.attendances add constraint attendance_session_participant_fk
  foreign key(session_participant_id,session_id,offering_id)
  references escen.session_participants(id,session_id,offering_id) on delete restrict;
-- Remplacement ciblé de la FK historique, désormais trop restrictive.
alter table escen.attendances drop constraint attendances_session_id_offering_id_fkey;
create index attendance_session_participant on escen.attendances(session_participant_id);

create or replace function escen_private.guard_attendance() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare s escen.sessions; participant uuid;
begin
  select * into strict s from escen.sessions where id=new.session_id for update;
  select p.id into participant from escen.session_participants p
    join escen.enrollment_groups eg on eg.group_id=p.group_id and eg.offering_id=p.offering_id
    where p.session_id=s.id and p.offering_id=new.offering_id and eg.enrollment_id=new.enrollment_id
      and p.active and (new.session_participant_id is null or p.id=new.session_participant_id)
      and eg.valid_from<=(s.starts_at at time zone 'Africa/Lome')::date
      and (eg.valid_until is null or eg.valid_until>(s.starts_at at time zone 'Africa/Lome')::date)
    order by p.id limit 1;
  if s.status in ('ANNULE','REPORTE') or participant is null then
    raise exception 'Présence hors du groupe de la séance' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.session_id,new.enrollment_id,new.offering_id)
    is distinct from (old.session_id,old.enrollment_id,old.offering_id) then
    raise exception 'Le contexte de la présence est immuable' using errcode='23514';
  end if;
  if tg_op='UPDATE' and old.session_participant_id is not null and participant<>old.session_participant_id then
    raise exception 'Le groupe de la présence est immuable' using errcode='23514';
  end if;
  new.session_participant_id:=participant;
  return new;
end $$;

-- Permission existante, évaluée sur le rôle sélectionné et CHAQUE groupe.
create function escen_private.can_schedule_participant(p_actor uuid,p_role text,p_permission text,p_assignment uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from escen.accounts ac
    join escen.role_grants g on g.account_id=ac.id
    join escen.roles r on r.id=g.role_id
    join escen.role_permissions rp on rp.role_id=r.id
    join escen.permissions pm on pm.id=rp.permission_id
    join escen.teaching_assignments a on a.id=p_assignment
    join escen.academic_offerings o on o.id=a.offering_id
    where ac.id=p_actor and ac.active and ac.archived_at is null and ac.auth_user_id is not null
      and r.active and r.code=p_role and pm.code=p_permission
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
      and (g.site_id is null or g.site_id=o.site_id)
      and (g.academic_year_id is null or g.academic_year_id=o.academic_year_id)
      and (g.group_id is null or g.group_id=a.group_id));
$$;

-- RPC bornée : création atomique du cours et de ses 2 à 30 affectations.
-- Aucun compte, mail, présence, crédit ou matière créé implicitement.
create function escen.create_shared_course(p_actor_id uuid,p_role_code text,p_expected_revision bigint,
  p_session_id uuid,p_assignment_ids uuid[],p_room_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.teaching_assignments; first_assignment escen.teaching_assignments;
  assignment uuid; current_revision bigint; previous_actor text; year escen.academic_years;
begin
  select revision into current_revision from escen_private.portal_revision where singleton for update;
  if p_expected_revision is null or current_revision<>p_expected_revision then
    raise exception 'CONCURRENT_UPDATE' using errcode='PT409'; end if;
  if coalesce(cardinality(p_assignment_ids),0) not between 2 and 30
    or exists(select 1 from unnest(p_assignment_ids) x where x is null)
    or (select count(distinct x) from unnest(p_assignment_ids) x)<>cardinality(p_assignment_ids)
    or p_session_id is null or p_room_id is null or p_starts_at is null or p_ends_at is null
    or p_ends_at<=p_starts_at or coalesce(char_length(btrim(p_reason)),0) not between 3 and 1000 then
    raise exception 'Cours commun invalide' using errcode='23514'; end if;
  foreach assignment in array p_assignment_ids loop
    if not escen_private.can_schedule_participant(p_actor_id,p_role_code,'schedule.create',assignment) then
      raise exception 'Affectation hors du périmètre autorisé' using errcode='42501'; end if;
    select * into strict a from escen.teaching_assignments where id=assignment for share;
    select y.* into strict year from escen.academic_years y
      join escen.academic_offerings o on o.academic_year_id=y.id where o.id=a.offering_id;
    if year.archived_at is not null or year.status<>'OUVERTE'
      or not exists(select 1 from escen.teachers where id=a.teacher_id and active)
      or not exists(select 1 from escen.groups where id=a.group_id and archived_at is null)
      or not exists(select 1 from escen.academic_offerings where id=a.offering_id and archived_at is null)
      or not exists(select 1 from escen.curriculum_components where id=a.component_id and archived_at is null)
      or not exists(select 1 from escen.group_offerings where group_id=a.group_id and offering_id=a.offering_id and archived_at is null) then
      raise exception 'Affectation ou année non modifiable' using errcode='23514'; end if;
  end loop;
  select * into strict first_assignment from escen.teaching_assignments where id=p_assignment_ids[1];
  if not exists(select 1 from escen.rooms where id=p_room_id and archived_at is null and status='AVAILABLE') then
    raise exception 'Salle indisponible' using errcode='23514'; end if;
  previous_actor:=current_setting('escen.actor_id',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  insert into escen.sessions(id,assignment_id,offering_id,group_id,teacher_id,room_id,starts_at,ends_at,mode,reason)
    values(p_session_id,first_assignment.id,first_assignment.offering_id,first_assignment.group_id,
      first_assignment.teacher_id,p_room_id,p_starts_at,p_ends_at,'COURS',btrim(p_reason));
  foreach assignment in array p_assignment_ids loop
    if assignment<>first_assignment.id then
      select * into strict a from escen.teaching_assignments where id=assignment;
      insert into escen.session_participants(session_id,assignment_id,offering_id,group_id,teacher_id,starts_at,ends_at,active,reason)
        values(p_session_id,a.id,a.offering_id,a.group_id,a.teacher_id,p_starts_at,p_ends_at,true,btrim(p_reason));
    end if;
  end loop;
  update escen_private.portal_revision set revision=revision+1,changed_at=now(),actor_id=p_actor_id
    where singleton returning revision into current_revision;
  perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  return current_revision;
end $$;
create function public.escen_shared_course_create(p_actor_id uuid,p_role_code text,p_expected_revision bigint,
  p_session_id uuid,p_assignment_ids uuid[],p_room_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text)
returns bigint language sql security definer set search_path=pg_catalog as $$
  select escen.create_shared_course(p_actor_id,p_role_code,p_expected_revision,p_session_id,
    p_assignment_ids,p_room_id,p_starts_at,p_ends_at,p_reason);
$$;

create function escen.change_shared_course(p_actor_id uuid,p_role_code text,p_expected_revision bigint,
  p_session_id uuid,p_action text,p_reason text,p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,p_teacher_id uuid default null)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare participant escen.session_participants; s escen.sessions; patch jsonb; revision bigint;
begin
  select r.revision into revision from escen_private.portal_revision r where singleton for update;
  if p_expected_revision is null or revision<>p_expected_revision then
    raise exception 'CONCURRENT_UPDATE' using errcode='PT409'; end if;
  if p_action is null or p_action not in ('move','cancel','replace_teacher')
    or coalesce(char_length(btrim(p_reason)),0) not between 3 and 1000 then
    raise exception 'Modification de cours commun invalide' using errcode='23514'; end if;
  select * into strict s from escen.sessions where id=p_session_id for update;
  if s.mode<>'COURS' or (select count(*) from escen.session_participants where session_id=s.id)<2 then
    raise exception 'Cours commun introuvable' using errcode='23514'; end if;
  for participant in select * from escen.session_participants where session_id=s.id loop
    if not escen_private.can_schedule_participant(p_actor_id,p_role_code,'schedule.update',participant.assignment_id) then
      raise exception 'Modification interdite : tous les groupes doivent être autorisés' using errcode='42501'; end if;
  end loop;
  patch:=jsonb_build_object('id',s.id,'reason',btrim(p_reason));
  if p_action='move' then
    if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at or p_teacher_id is not null then
      raise exception 'Créneau invalide' using errcode='23514'; end if;
    patch:=patch||jsonb_build_object('starts_at',p_starts_at,'ends_at',p_ends_at);
  elsif p_action='cancel' then
    if p_starts_at is not null or p_ends_at is not null or p_teacher_id is not null then
      raise exception 'Paramètres étrangers à l’annulation' using errcode='23514'; end if;
    patch:=patch||jsonb_build_object('status','ANNULE');
  else
    if p_starts_at is not null or p_ends_at is not null
      or not exists(select 1 from escen.teachers where id=coalesce(p_teacher_id,s.teacher_id) and active) then
      raise exception 'Remplacement invalide' using errcode='23514'; end if;
    patch:=patch||jsonb_build_object('replacement_teacher_id',nullif(p_teacher_id,s.teacher_id));
  end if;
  return public.escen_backend_transaction(p_actor_id,p_expected_revision,
    jsonb_build_array(jsonb_build_object('table','sessions','operation','update','record',patch)));
end $$;
create function public.escen_shared_course_change(p_actor_id uuid,p_role_code text,p_expected_revision bigint,
  p_session_id uuid,p_action text,p_reason text,p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,p_teacher_id uuid default null)
returns bigint language sql security definer set search_path=pg_catalog as $$
  select escen.change_shared_course(p_actor_id,p_role_code,p_expected_revision,p_session_id,
    p_action,p_reason,p_starts_at,p_ends_at,p_teacher_id);
$$;

-- Délégué : accès à sa participation uniquement, même dans une séance commune.
create or replace function escen_private.delegate_attendance_participant(p_actor_id uuid,p_session_id uuid,p_year_id uuid,p_group_id uuid,p_offering_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(
  select 1 from escen.accounts a join escen.students st on st.person_id=a.person_id
  join escen.enrollments e on e.student_id=st.id
  join escen.enrollment_groups eg on eg.enrollment_id=e.id and eg.offering_id=e.offering_id
  join escen.session_participants sp on sp.group_id=eg.group_id and sp.offering_id=e.offering_id
  join escen.sessions s on s.id=sp.session_id
  join escen.academic_offerings o on o.id=sp.offering_id
  join escen.role_grants g on g.account_id=a.id
  join escen.roles r on r.id=g.role_id
  where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
   and sp.group_id=p_group_id and sp.offering_id=p_offering_id and s.id=p_session_id and o.academic_year_id=p_year_id and r.code='DEL' and r.active
   and eg.valid_from<=(s.starts_at at time zone 'Africa/Lome')::date
   and (eg.valid_until is null or eg.valid_until>(s.starts_at at time zone 'Africa/Lome')::date)
   and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
   and (g.site_id is null or g.site_id=o.site_id)
   and (g.academic_year_id is null or g.academic_year_id=o.academic_year_id)
   and (g.group_id is null or g.group_id=sp.group_id)
   and exists(select 1 from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id where rp.role_id=r.id and p.code='attendance.record')
 );
$$;

create or replace function escen_private.delegate_attendance_session(p_actor_id uuid,p_session_id uuid,p_year_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from escen.session_participants p where p.session_id=p_session_id
    and escen_private.delegate_attendance_participant(p_actor_id,p_session_id,p_year_id,p.group_id,p.offering_id));
$$;

create or replace function public.escen_delegate_attendance_transaction(p_actor_id uuid,p_expected_revision bigint,p_session_id uuid,p_year_id uuid,p_changes jsonb) returns bigint
language plpgsql security definer set search_path=pg_catalog as $$
declare s escen.sessions; change jsonb; rec jsonb; previous jsonb; target text; operation text;
 allowed text[]; key text; student_enrollment uuid; effective_teacher uuid;
begin
 -- Même verrou que la RPC existante : contrôle de concurrence et lot atomique.
 perform 1 from escen_private.portal_revision where singleton for update;
 if p_year_id is null or not escen_private.delegate_attendance_session(p_actor_id,p_session_id,p_year_id) then
  raise exception 'Séance hors du groupe du délégué' using errcode='42501';
 end if;
 select * into strict s from escen.sessions where id=p_session_id for share;
 if s.status in ('ANNULE','REPORTE') or not exists(select 1 from escen.academic_years y where y.id=p_year_id and y.archived_at is null and y.status in ('OUVERTE','EN_CLOTURE')) then
  raise exception 'Séance ou année non modifiable' using errcode='42501';
 end if;
 if jsonb_typeof(p_changes) is distinct from 'array' then raise exception 'Lot invalide' using errcode='23514'; end if;
 if jsonb_array_length(p_changes) not between 1 and 5000 then raise exception 'Lot vide ou trop volumineux' using errcode='23514'; end if;
 effective_teacher:=coalesce(s.replacement_teacher_id,s.teacher_id);
 for change in select value from jsonb_array_elements(p_changes) loop
  target:=change->>'table'; operation:=change->>'operation'; rec:=change->'record'; previous:=null;
  if target is null or target not in ('attendances','teacher_attendances') or operation is null or operation not in ('insert','update') or jsonb_typeof(rec) is distinct from 'object' then
   raise exception 'Opération hors du circuit délégué' using errcode='42501';
  end if;
  allowed:=case when target='attendances' then array['id','status','arrived_at','left_at','late_minutes','comment','reason'] else array['id','arrived_at','left_at','comment'] end;
  if operation='insert' then allowed:=allowed||case when target='attendances' then array['session_id','enrollment_id','offering_id','recorded_by'] else array['session_id','teacher_id','recorded_by'] end; end if;
  for key in select jsonb_object_keys(rec) loop
   if not key=any(allowed) then raise exception 'Champ non autorisé' using errcode='42501'; end if;
  end loop;
  if operation='update' then
   if target='attendances' then select to_jsonb(a) into previous from escen.attendances a where a.id=(rec->>'id')::uuid and a.session_id=s.id for update;
   else select to_jsonb(a) into previous from escen.teacher_attendances a where a.id=(rec->>'id')::uuid and a.session_id=s.id for update; end if;
   if previous is null then raise exception 'Présence hors de la séance' using errcode='42501'; end if;
  elsif (rec->>'session_id')::uuid is distinct from s.id then raise exception 'Présence hors de la séance' using errcode='42501';
  end if;
  if target='attendances' then
   student_enrollment:=coalesce((previous->>'enrollment_id')::uuid,(rec->>'enrollment_id')::uuid);
   if not exists(select 1 from escen.enrollments e
     join escen.enrollment_groups eg on eg.enrollment_id=e.id and eg.offering_id=e.offering_id
     join escen.session_participants sp on sp.session_id=s.id and sp.offering_id=e.offering_id and sp.group_id=eg.group_id
     where e.id=student_enrollment and escen_private.delegate_attendance_participant(p_actor_id,s.id,p_year_id,sp.group_id,sp.offering_id)
       and eg.valid_from<=(s.starts_at at time zone 'Africa/Lome')::date
       and (eg.valid_until is null or eg.valid_until>(s.starts_at at time zone 'Africa/Lome')::date)) then
    raise exception 'Étudiant hors du groupe de la séance' using errcode='42501';
   end if;
   if operation='insert' and (rec->>'offering_id')::uuid is distinct from (select offering_id from escen.enrollments where id=student_enrollment) then raise exception 'Formation hors de la séance' using errcode='42501'; end if;
   if rec ? 'status' and (rec->>'status') is distinct from (previous->>'status') and
    ((rec->>'status') not in ('PRESENT','ABSENT','RETARD') or coalesce(previous->>'status','') in ('ABSENT_JUSTIFIE','RETARD_JUSTIFIE','DISPENSE')) then
    raise exception 'Justification et dispense réservées à la direction académique' using errcode='42501';
   end if;
  elsif coalesce((previous->>'teacher_id')::uuid,(rec->>'teacher_id')::uuid) is distinct from effective_teacher then
   raise exception 'Enseignant hors de la séance' using errcode='42501';
  end if;
 end loop;
 return public.escen_attendance_transaction(p_actor_id,p_expected_revision,p_changes);
end $$;


-- Seul le serveur appelle la RPC ; aucune politique navigateur permissive.
do $$ declare signature text; role_name text; begin
  for signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='escen_private' and p.proname in ('guard_session_participant','sync_session_participants',
      'guard_shared_session_change','guard_participant_assignment_dates','can_schedule_participant','delegate_attendance_participant'))
    or (n.nspname='escen' and p.proname in ('create_shared_course','change_shared_course'))
    or (n.nspname='public' and p.proname in ('escen_shared_course_create','escen_shared_course_change')) loop
    execute 'revoke all on function '||signature||' from public';
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if exists(select 1 from pg_roles where rolname=role_name) then
        execute format('revoke all on function %s from %I',signature,role_name);
      end if;
    end loop;
  end loop;
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on escen.session_participants from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_shared_course_create(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text) to service_role;
    grant execute on function public.escen_shared_course_change(uuid,text,bigint,uuid,text,text,timestamptz,timestamptz,uuid) to service_role;
  end if;
end $$;

commit;
