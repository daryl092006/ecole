-- SQL validé par l’utilisateur le 23 novembre 2026 : cours communs en présentiel ou en ligne.
-- Aucune application distante. Aucun changement des données existantes, du RLS ou des audits.
begin;

create or replace function escen_private.guard_session_participant() returns trigger
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
    if s.mode not in ('COURS','EN_LIGNE') or a.teacher_id<>s.teacher_id
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

create or replace function escen_private.guard_shared_session_change() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if exists(select 1 from escen.session_participants where session_id=old.id and assignment_id<>old.assignment_id)
    and (new.assignment_id<>old.assignment_id or new.mode is distinct from old.mode) then
    raise exception 'Conserver les affectations et le type du cours commun' using errcode='23514';
  end if;
  if exists(select 1 from escen.teacher_attendances where session_id=old.id)
    and ((new.starts_at,new.ends_at,new.assignment_id) is distinct from (old.starts_at,old.ends_at,old.assignment_id)
      or new.status in ('ANNULE','REPORTE')) then
    raise exception 'Une séance émargée conserve son contexte' using errcode='23514';
  end if;
  return new;
end $$;

create or replace function escen.create_shared_course(p_actor_id uuid,p_role_code text,p_expected_revision bigint,
  p_session_id uuid,p_assignment_ids uuid[],p_room_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text,
  p_mode text,p_meeting_url text,p_meeting_id text,p_meeting_provider text)
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
    or p_mode is null or p_mode not in ('COURS','EN_LIGNE')
    or (p_mode='EN_LIGNE')<>(p_room_id is null)
    or (p_mode='COURS' and (p_meeting_url is not null or p_meeting_id is not null or p_meeting_provider is not null))
    or p_session_id is null or p_starts_at is null or p_ends_at is null
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
  if p_room_id is not null and not exists(select 1 from escen.rooms where id=p_room_id and archived_at is null and status='AVAILABLE') then
    raise exception 'Salle indisponible' using errcode='23514'; end if;
  previous_actor:=current_setting('escen.actor_id',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  insert into escen.sessions(id,assignment_id,offering_id,group_id,teacher_id,room_id,starts_at,ends_at,mode,reason,meeting_url,meeting_id,meeting_provider)
    values(p_session_id,first_assignment.id,first_assignment.offering_id,first_assignment.group_id,
      first_assignment.teacher_id,p_room_id,p_starts_at,p_ends_at,p_mode,btrim(p_reason),p_meeting_url,p_meeting_id,p_meeting_provider);
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
  p_session_id uuid,p_assignment_ids uuid[],p_room_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text,
  p_mode text,p_meeting_url text,p_meeting_id text,p_meeting_provider text)
returns bigint language sql security definer set search_path=pg_catalog as $$
  select escen.create_shared_course(p_actor_id,p_role_code,p_expected_revision,p_session_id,
    p_assignment_ids,p_room_id,p_starts_at,p_ends_at,p_reason,p_mode,p_meeting_url,p_meeting_id,p_meeting_provider);
$$;

create or replace function escen.change_shared_course(p_actor_id uuid,p_role_code text,p_expected_revision bigint,
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
  if s.mode not in ('COURS','EN_LIGNE') or (select count(*) from escen.session_participants where session_id=s.id)<2 then
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

-- Les anciennes signatures restent disponibles pour les clients existants.
-- Les nouvelles signatures sont réservées au serveur ; aucun droit navigateur ajouté.
revoke all on function escen.create_shared_course(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text,text,text,text,text) from public;
revoke all on function public.escen_shared_course_create(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text,text,text,text,text) from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on function escen.create_shared_course(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text,text,text,text,text) from %I',role_name);
      execute format('revoke all on function public.escen_shared_course_create(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text,text,text,text,text) from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_shared_course_create(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text,text,text,text,text) to service_role;
  end if;
end $$;

commit;
