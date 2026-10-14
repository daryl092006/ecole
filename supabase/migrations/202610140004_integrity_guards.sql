begin;
create extension if not exists btree_gist with schema public;
set local search_path = escen, public, extensions;

-- Contraintes d'exclusion : PostgreSQL vérifie aussi les écritures concurrentes.
alter table escen.sessions add column effective_teacher_id uuid
  generated always as (coalesce(replacement_teacher_id, teacher_id)) stored;
alter table escen.sessions add column effective_room_id uuid
  generated always as (coalesce(actual_room_id, room_id)) stored;
alter table escen.sessions add constraint session_group_conflict exclude using gist
  (group_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status not in ('ANNULE','REPORTE'));
alter table escen.sessions add constraint session_teacher_conflict exclude using gist
  (effective_teacher_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status not in ('ANNULE','REPORTE'));
alter table escen.sessions add constraint session_room_conflict exclude using gist
  (effective_room_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status not in ('ANNULE','REPORTE'));
alter table escen.enrollment_groups add constraint enrollment_group_period_conflict exclude using gist
  (enrollment_id with =, group_id with =, daterange(valid_from, valid_until, '[)') with &&);

create function escen_private.immutable_record() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Historique immuable : %', tg_table_name using errcode = '23514'; end $$;
create function escen_private.no_delete() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Suppression interdite : archiver ou enregistrer une contre-opération (%)', tg_table_name using errcode = '23514'; end $$;

-- Toutes les dépendances de la maquette sont gelées ensemble après approbation.
create function escen_private.guard_curriculum() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare curriculum uuid; state text;
begin
  if tg_table_name = 'curricula' then
    if tg_op = 'UPDATE' and old.status <> 'DRAFT' then
      if (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') or new.status <> 'ARCHIVED' then
        raise exception 'Maquette approuvée immuable' using errcode = '23514';
      end if;
    end if;
    if new.status = 'APPROVED' and (tg_op = 'INSERT' or old.status = 'DRAFT') then
      if not exists (select 1 from escen.curriculum_semesters where curriculum_id = new.id)
        or exists (select 1 from escen.curriculum_semesters s where s.curriculum_id = new.id
          and s.target_credits <> coalesce((select sum(u.credits) from escen.teaching_units u where u.semester_id = s.id),0))
        or exists (select 1 from escen.teaching_units u where u.curriculum_id = new.id
          and u.credits <> coalesce((select sum(c.credits) from escen.curriculum_components c where c.unit_id = u.id),0)) then
        raise exception 'Budgets de crédits de la maquette incomplets' using errcode = '23514';
      end if;
    end if;
  else
    curriculum := new.curriculum_id;
    select status into state from escen.curricula where id = curriculum for update;
    if state <> 'DRAFT' then raise exception 'Maquette approuvée immuable' using errcode = '23514'; end if;
    if tg_op = 'UPDATE' and old.curriculum_id <> curriculum then
      select status into state from escen.curricula where id = old.curriculum_id for update;
      if state <> 'DRAFT' then raise exception 'Maquette approuvée immuable' using errcode = '23514'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger curriculum_guard before insert or update on escen.curricula for each row execute function escen_private.guard_curriculum();
create trigger semester_guard before insert or update on escen.curriculum_semesters for each row execute function escen_private.guard_curriculum();
create trigger unit_guard before insert or update on escen.teaching_units for each row execute function escen_private.guard_curriculum();
create trigger component_guard before insert or update on escen.curriculum_components for each row execute function escen_private.guard_curriculum();

create function escen_private.guard_dates() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare year_start date; year_end date;
begin
  select y.starts_on, y.ends_on into year_start, year_end from escen.academic_offerings o
    join escen.academic_years y on y.id = o.academic_year_id where o.id = new.offering_id;
  if new.starts_on < year_start or new.ends_on > year_end then
    raise exception 'Semestre hors de son année' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger offering_dates_guard before insert or update on escen.offering_semesters for each row execute function escen_private.guard_dates();

create function escen_private.guard_session() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare a escen.teaching_assignments; room escen.rooms; session_site uuid; members integer;
begin
  select * into a from escen.teaching_assignments where id = new.assignment_id;
  if (new.starts_at at time zone 'Africa/Lome')::date < a.valid_from
    or (a.valid_until is not null and (new.ends_at at time zone 'Africa/Lome')::date > a.valid_until) then
    raise exception 'Séance hors de l’affectation' using errcode = '23514';
  end if;
  if new.series_id is not null and not exists (select 1 from escen.schedule_series where id = new.series_id and assignment_id = new.assignment_id) then
    raise exception 'Série incompatible avec l’affectation' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and exists (select 1 from escen.attendances where session_id = old.id) and
    (new.starts_at <> old.starts_at or new.ends_at <> old.ends_at or new.assignment_id <> old.assignment_id or new.status in ('ANNULE','REPORTE')) then
    raise exception 'Une séance émargée conserve son contexte' using errcode = '23514';
  end if;
  if new.status in ('ANNULE','REPORTE') then return new; end if;
  select site_id into session_site from escen.academic_offerings where id = new.offering_id;
  if exists (select 1 from escen.blocked_periods b where (b.site_id is null or b.site_id = session_site)
      and (b.academic_year_id is null or b.academic_year_id = (select academic_year_id from escen.academic_offerings where id = new.offering_id))
      and b.starts_at < new.ends_at and new.starts_at < b.ends_at) then
    raise exception 'Séance dans une période bloquée' using errcode = '23514';
  end if;
  if not exists (select 1 from escen.offering_semesters os join escen.curriculum_semesters cs on cs.id = os.curriculum_semester_id
    join escen.teaching_units u on u.semester_id = cs.id join escen.curriculum_components c on c.unit_id = u.id
    where os.offering_id = new.offering_id and c.id = a.component_id
      and (new.starts_at at time zone 'Africa/Lome')::date >= os.starts_on
      and (new.ends_at at time zone 'Africa/Lome')::date <= os.ends_on) then
    raise exception 'Séance hors du semestre de la matière' using errcode = '23514';
  end if;
  if new.room_id is not null then
    select * into room from escen.rooms where id = coalesce(new.actual_room_id, new.room_id) for update;
    if room.site_id <> session_site or room.status <> 'AVAILABLE' then
      raise exception 'Salle indisponible ou d’un autre site' using errcode = '23514';
    end if;
    select count(distinct e.student_id) into members from escen.enrollment_groups eg join escen.enrollments e on e.id = eg.enrollment_id
      where eg.group_id = new.group_id and eg.valid_from <= (new.starts_at at time zone 'Africa/Lome')::date
        and (eg.valid_until is null or eg.valid_until > (new.starts_at at time zone 'Africa/Lome')::date);
    if room.capacity < members then raise exception 'Capacité de salle insuffisante' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger session_guard before insert or update on escen.sessions for each row execute function escen_private.guard_session();

create function escen_private.guard_attendance() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare s escen.sessions;
begin
  select * into s from escen.sessions where id = new.session_id;
  if s.status in ('ANNULE','REPORTE') or not exists (select 1 from escen.enrollment_groups
    where enrollment_id = new.enrollment_id and group_id = s.group_id
      and valid_from <= (s.starts_at at time zone 'Africa/Lome')::date
      and (valid_until is null or valid_until > (s.starts_at at time zone 'Africa/Lome')::date)) then
    raise exception 'Présence hors du groupe de la séance' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger attendance_guard before insert or update on escen.attendances for each row execute function escen_private.guard_attendance();

create function escen_private.guard_exam_delivery() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare s escen.sessions; a uuid;
begin
  select * into s from escen.sessions where id = new.session_id;
  select assignment_id into a from escen.evaluations where id = new.evaluation_id;
  if a <> s.assignment_id or new.access_opens_at < s.starts_at or new.access_closes_at > s.ends_at or s.mode = 'COURS' then
    raise exception 'Épreuve incompatible avec sa séance' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger delivery_guard before insert or update on escen.exam_deliveries for each row execute function escen_private.guard_exam_delivery();

create function escen_private.guard_grade() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare state text; cancelled timestamptz;
begin
  if tg_op = 'INSERT' then new.last_modified_by := new.entered_by; end if;
  select e.status, e.cancelled_at into state, cancelled from escen.evaluations e
    join escen.evaluation_candidates c on c.evaluation_id = e.id where c.id = new.candidate_id for update of e;
  if cancelled is not null then raise exception 'Évaluation annulée' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and new.candidate_id <> old.candidate_id then
    raise exception 'Le candidat d’une note est immuable' using errcode = '23514';
  end if;
  if state not in ('BROUILLON','SAISIES') and not (state = 'PUBLIEES' and pg_trigger_depth() > 1 and tg_op = 'UPDATE') then
    raise exception 'Note verrouillée : une révision tracée est obligatoire après publication' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; end if;
  return new;
end $$;
create trigger grade_guard before insert or update on escen.grades for each row execute function escen_private.guard_grade();

create function escen_private.apply_evaluation_transition() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare e escen.evaluations;
begin
  select * into e from escen.evaluations where id = new.evaluation_id for update;
  if e.cancelled_at is not null or e.status <> new.from_status or not (
      (new.from_status = 'BROUILLON' and new.to_status = 'SAISIES') or
      (new.from_status = 'SAISIES' and new.to_status = 'SOUMISES') or
      (new.from_status = 'SOUMISES' and new.to_status in ('A_CONTROLER','SAISIES')) or
      (new.from_status = 'A_CONTROLER' and new.to_status in ('VALIDEES','SAISIES')) or
      (new.from_status = 'VALIDEES' and new.to_status = 'PUBLIEES')) then
    raise exception 'Transition de notes interdite' using errcode = '23514';
  end if;
  if new.to_status = 'SAISIES' and new.from_status <> 'BROUILLON' and coalesce(length(btrim(new.reason)),0) = 0 then
    raise exception 'Motif de retour obligatoire' using errcode = '23514';
  end if;
  if new.to_status = 'SOUMISES' and (not exists (select 1 from escen.evaluation_candidates where evaluation_id = e.id)
    or exists (select 1 from escen.evaluation_candidates c left join escen.grades g on g.candidate_id = c.id
      where c.evaluation_id = e.id and (c.eligibility <> 'ELIGIBLE' or g.value is null or g.absence_status is not null))) then
    raise exception 'Notes ou traitement des absences incomplets' using errcode = '23514';
  end if;
  update escen.evaluations set status = new.to_status where id = e.id;
  return new;
end $$;
create trigger evaluation_transition after insert on escen.evaluation_transitions for each row execute function escen_private.apply_evaluation_transition();
create function escen_private.guard_evaluation_state() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'BROUILLON' then raise exception 'Une évaluation commence en brouillon' using errcode = '23514'; end if;
    return new;
  end if;
  if new.status <> old.status and pg_trigger_depth() = 1 then
    raise exception 'Utilisez une transition de notes tracée' using errcode = '23514';
  end if;
  if old.status <> 'BROUILLON' and (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') then
    raise exception 'Contexte d’évaluation verrouillé' using errcode = '23514';
  end if;
  if new.cancelled_at is not null and old.cancelled_at is null and
    (exists (select 1 from escen.evaluation_candidates c join escen.grades g on g.candidate_id = c.id where c.evaluation_id = old.id and (g.value is not null or g.absence_status is not null))
     or exists (select 1 from escen.exam_attempts where evaluation_id = old.id)) then
    raise exception 'Épreuve avec résultats ou tentatives : annulation interdite' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger evaluation_state_guard before insert or update on escen.evaluations for each row execute function escen_private.guard_evaluation_state();

create function escen_private.guard_complaint() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_op = 'INSERT' and new.status <> 'NOUVELLE' then
    raise exception 'Une réclamation commence à NOUVELLE' using errcode = '23514';
  end if;
  if not exists (select 1 from escen.grades where id = new.grade_id and candidate_id = new.candidate_id) then
    raise exception 'Réclamation et note de candidats différents' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status and pg_trigger_depth() = 1 then
    raise exception 'Utilisez un événement de réclamation' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger complaint_guard before insert or update on escen.complaints for each row execute function escen_private.guard_complaint();
create function escen_private.apply_complaint_event() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare state text;
begin
  select status into state from escen.complaints where id = new.complaint_id for update;
  if state <> new.from_status or not (
    (state = 'NOUVELLE' and new.to_status = 'EN_ANALYSE') or
    (state = 'EN_ANALYSE' and new.to_status = 'TRANSMISE_ENSEIGNANT') or
    (state = 'TRANSMISE_ENSEIGNANT' and new.to_status = 'AVIS_ENSEIGNANT') or
    (state = 'AVIS_ENSEIGNANT' and new.to_status = 'DECISION_ACADEMIQUE') or
    (state = 'DECISION_ACADEMIQUE' and new.to_status in ('CORRECTION_EVENTUELLE','CLOTUREE')) or
    (state = 'CORRECTION_EVENTUELLE' and new.to_status = 'CLOTUREE')) then
    raise exception 'Transition de réclamation interdite' using errcode = '23514';
  end if;
  if state = 'CORRECTION_EVENTUELLE' and new.to_status = 'CLOTUREE' and not exists
    (select 1 from escen.grade_revisions where complaint_id = new.complaint_id) then
    raise exception 'Correction attendue avant clôture' using errcode = '23514';
  end if;
  update escen.complaints set status = new.to_status, closed_at = case when new.to_status = 'CLOTUREE' then new.happened_at else null end where id = new.complaint_id;
  return new;
end $$;
create trigger complaint_event after insert on escen.complaint_events for each row execute function escen_private.apply_complaint_event();
create function escen_private.apply_grade_revision() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare g escen.grades; state text;
begin
  select * into g from escen.grades where id = new.grade_id for update;
  select e.status into state from escen.evaluations e join escen.evaluation_candidates c on c.evaluation_id = e.id where c.id = g.candidate_id;
  if state <> 'PUBLIEES' or g.value is distinct from new.old_value then
    raise exception 'Ancienne note ou état de publication incompatible' using errcode = '23514';
  end if;
  if new.complaint_id is not null and not exists (select 1 from escen.complaints
    where id = new.complaint_id and grade_id = g.id and status = 'CORRECTION_EVENTUELLE') then
    raise exception 'Réclamation incompatible avec la correction' using errcode = '23514';
  end if;
  update escen.grades set value = new.new_value, last_modified_by = new.actor_id where id = g.id;
  return new;
end $$;
create trigger grade_revision after insert on escen.grade_revisions for each row execute function escen_private.apply_grade_revision();

create function escen_private.guard_exam_content() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare paper uuid; state text;
begin
  if tg_table_name = 'exam_papers' then
    if tg_op = 'UPDATE' and old.status <> 'BROUILLON' and
      ((to_jsonb(new) - 'status' - 'reason') <> (to_jsonb(old) - 'status' - 'reason') or new.status <> 'RETIRE' or coalesce(length(btrim(new.reason)),0) = 0) then
      raise exception 'Sujet autorisé immuable' using errcode = '23514';
    end if;
    if new.status = 'AUTORISE' and (tg_op = 'INSERT' or old.status = 'BROUILLON') then
      if not exists (select 1 from escen.exam_questions where paper_id = new.id) then
        raise exception 'Sujet sans questions' using errcode = '23514';
      end if;
    end if;
  else
    if tg_table_name = 'exam_options' then
      select paper_id into paper from escen.exam_questions where id = new.question_id;
    else paper := new.paper_id; end if;
    select status into state from escen.exam_papers where id = paper for update;
    if state <> 'BROUILLON' then raise exception 'Sujet autorisé immuable' using errcode = '23514'; end if;
    if tg_op = 'UPDATE' then
      if tg_table_name = 'exam_options' then select paper_id into paper from escen.exam_questions where id = old.question_id;
      else paper := old.paper_id; end if;
      select status into state from escen.exam_papers where id = paper for update;
      if state <> 'BROUILLON' then raise exception 'Sujet autorisé immuable' using errcode = '23514'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger paper_guard before insert or update on escen.exam_papers for each row execute function escen_private.guard_exam_content();
create trigger part_guard before insert or update on escen.exam_parts for each row execute function escen_private.guard_exam_content();
create trigger question_guard before insert or update on escen.exam_questions for each row execute function escen_private.guard_exam_content();
create trigger option_guard before insert or update on escen.exam_options for each row execute function escen_private.guard_exam_content();

create function escen_private.guard_attempt() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare d escen.exam_deliveries; state text; eligible text;
begin
  if tg_op = 'UPDATE' then
    if old.status in ('REMISE','EXPIREE') or (to_jsonb(new) - 'status' - 'submitted_at') <> (to_jsonb(old) - 'status' - 'submitted_at') then
      raise exception 'Contexte de tentative immuable' using errcode = '23514';
    end if;
    if new.status in ('REMISE','EXPIREE') then
      if new.status = 'EXPIREE' and clock_timestamp() < old.deadline_at then
        raise exception 'La tentative n’est pas encore expirée' using errcode = '23514';
      end if;
      new.status := case when clock_timestamp() >= old.deadline_at then 'EXPIREE' else 'REMISE' end;
      new.submitted_at := least(clock_timestamp(),old.deadline_at);
    end if;
    return new;
  end if;
  select * into d from escen.exam_deliveries where evaluation_id = new.evaluation_id;
  select status into state from escen.exam_papers where id = new.paper_id;
  select eligibility into eligible from escen.evaluation_candidates where id = new.candidate_id;
  new.started_at := clock_timestamp();
  new.deadline_at := least(d.access_closes_at,new.started_at + make_interval(mins => d.duration_minutes));
  if d.id is null or state <> 'AUTORISE' or eligible <> 'ELIGIBLE' or new.started_at < d.access_opens_at
    or new.started_at >= d.access_closes_at or new.deadline_at > d.access_closes_at
    or (d.duration_minutes is not null and new.deadline_at > new.started_at + make_interval(mins => d.duration_minutes))
    or d.duration_minutes is null or new.status <> 'EN_COURS'
    or not exists (select 1 from escen.sessions where id = d.session_id and mode = 'EN_LIGNE' and status not in ('ANNULE','REPORTE'))
    or exists (select 1 from escen.evaluations where id = new.evaluation_id and cancelled_at is not null) then
    raise exception 'Tentative hors fenêtre, durée, sujet ou admissibilité' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger attempt_guard before insert or update on escen.exam_attempts for each row execute function escen_private.guard_attempt();
create function escen_private.guard_answer() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare a escen.exam_attempts;
begin
  select * into a from escen.exam_attempts where id = new.attempt_id for update;
  new.saved_at := clock_timestamp();
  if a.status <> 'EN_COURS' or clock_timestamp() >= a.deadline_at or new.saved_at < a.started_at or new.saved_at > a.deadline_at then
    raise exception 'Copie remise ou expirée' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.attempt_id <> old.attempt_id or new.question_id <> old.question_id) then
    raise exception 'Contexte de réponse immuable' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger answer_guard before insert or update on escen.exam_answers for each row execute function escen_private.guard_answer();
create function escen_private.guard_correction() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare maximum numeric; state text; evaluation_state text; closes_at timestamptz;
begin
  select q.points, a.status, e.status, d.access_closes_at into maximum, state, evaluation_state, closes_at
    from escen.exam_answers r join escen.exam_questions q on q.id = r.question_id
    join escen.exam_attempts a on a.id = r.attempt_id join escen.evaluations e on e.id = a.evaluation_id
    join escen.exam_deliveries d on d.evaluation_id = e.id where r.id = new.answer_id;
  if new.points > maximum or state not in ('REMISE','EXPIREE') or evaluation_state not in ('BROUILLON','SAISIES')
    or clock_timestamp() < closes_at then
    raise exception 'Correction hors barème ou copie non remise' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger correction_guard before insert on escen.answer_corrections for each row execute function escen_private.guard_correction();

create function escen_private.guard_contract_content() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare locked_version_id uuid; state text; total numeric; due numeric;
begin
  if tg_table_name = 'contract_versions' then
    perform 1 from escen.financial_contracts where id = new.contract_id for update;
    if tg_op = 'UPDATE' and old.status <> 'DRAFT' and
      ((to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') or new.status <> 'SUPERSEDED') then
      raise exception 'Contrat approuvé immuable' using errcode = '23514';
    end if;
    if new.status = 'APPROVED' and (tg_op = 'INSERT' or old.status = 'DRAFT') then
      select coalesce(sum(amount),0) into total from escen.contract_lines where version_id = new.id;
      total := total - coalesce((select sum(amount) from escen.contract_discounts where contract_discounts.version_id = new.id),0);
      select coalesce(sum(amount),0) into due from escen.installments where installments.version_id = new.id;
      if not exists (select 1 from escen.contract_lines where contract_lines.version_id = new.id) or total <> due or total < 0 then
        raise exception 'Échéancier et montant net du contrat incompatibles' using errcode = '23514';
      end if;
      if exists (select 1 from escen.contract_lines l where l.version_id = new.id
        and l.amount < coalesce((select sum(d.amount) from escen.contract_discounts d where d.line_id = l.id),0)) then
        raise exception 'Remise supérieure à la ligne de frais' using errcode = '23514';
      end if;
    end if;
  else
    locked_version_id := new.version_id;
    select v.status into state from escen.contract_versions v where id = locked_version_id for update;
    if state <> 'DRAFT' then raise exception 'Contrat approuvé immuable' using errcode = '23514'; end if;
    if tg_op = 'UPDATE' then
      select v.status into state from escen.contract_versions v where id = old.version_id for update;
      if state <> 'DRAFT' then raise exception 'Contrat approuvé immuable' using errcode = '23514'; end if;
    end if;
    if tg_table_name = 'contract_discounts' then
      if coalesce((select sum(d.amount) from escen.contract_discounts d where d.line_id = new.line_id and d.id <> new.id),0) + new.amount
        > (select l.amount from escen.contract_lines l where l.id = new.line_id) then
        raise exception 'Remise supérieure à la ligne de frais' using errcode = '23514';
      end if;
      if new.scholarship_award_id is not null and not exists (select 1 from escen.scholarship_awards a
        join escen.financial_contracts c on c.enrollment_id = a.enrollment_id join escen.contract_lines l on l.contract_id = c.id
        where a.id = new.scholarship_award_id and l.id = new.line_id) then
        raise exception 'Bourse d’une autre inscription' using errcode = '23514';
      end if;
    elsif tg_table_name = 'contract_lines' then
      if new.rate_id is not null and not exists (select 1 from escen.fee_rates r join escen.enrollments e on e.offering_id = r.offering_id
        join escen.financial_contracts c on c.enrollment_id = e.id
        where r.id = new.rate_id and r.fee_type_id = new.fee_type_id and c.id = new.contract_id) then
        raise exception 'Tarif d’une autre formation ou nature de frais' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger contract_version_guard before insert or update on escen.contract_versions for each row execute function escen_private.guard_contract_content();
create trigger contract_line_guard before insert or update on escen.contract_lines for each row execute function escen_private.guard_contract_content();
create trigger contract_discount_guard before insert or update on escen.contract_discounts for each row execute function escen_private.guard_contract_content();
create trigger installment_guard before insert or update on escen.installments for each row execute function escen_private.guard_contract_content();

-- Vues de calcul, pas de soldes dupliqués à synchroniser dans plusieurs tables.
create view escen.active_payment_allocations with (security_invoker = true) as
select a.* from escen.payment_allocations a where not exists (select 1 from escen.allocation_reversals r where r.allocation_id = a.id)
  and not exists (select 1 from escen.payment_reversals r where r.payment_id = a.payment_id);
create view escen.contract_balances with (security_invoker = true) as
select c.id as contract_id, c.enrollment_id, v.id as version_id,
  coalesce((select sum(l.amount) from escen.contract_lines l where l.version_id = v.id),0)
    - coalesce((select sum(d.amount) from escen.contract_discounts d where d.version_id = v.id),0)
    - coalesce((select sum(n.amount) from escen.credit_notes n join escen.contract_lines l on l.id = n.line_id where l.version_id = v.id),0) as expected,
  coalesce((select sum(p.amount) from escen.payments p where p.enrollment_id = c.enrollment_id
    and not exists (select 1 from escen.payment_reversals r where r.payment_id = p.id)),0)
    - coalesce((select sum(f.amount) from escen.refunds f join escen.payments p on p.id = f.payment_id where p.enrollment_id = c.enrollment_id),0) as paid
from escen.financial_contracts c join escen.contract_versions v on v.contract_id = c.id and v.status = 'APPROVED';

create function escen_private.guard_financial_operation() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare p escen.payments; available numeric; used numeric; maximum numeric; c uuid; v escen.contract_versions;
begin
  if tg_table_name in ('payment_allocations','payment_reversals','refunds') then
    select * into p from escen.payments where id = new.payment_id for update;
    if exists (select 1 from escen.payment_reversals where payment_id = p.id) then
      raise exception 'Paiement déjà annulé' using errcode = '23514';
    end if;
    available := p.amount - coalesce((select sum(amount) from escen.refunds where payment_id = p.id),0);
    used := coalesce((select sum(amount) from escen.active_payment_allocations where payment_id = p.id),0);
    if tg_table_name = 'payment_reversals' then
      if exists (select 1 from escen.refunds where payment_id = p.id) then
        raise exception 'Paiement remboursé : annulation incompatible' using errcode = '23514';
      end if;
      return new;
    end if;
    if used + new.amount > available then raise exception 'Montant disponible du paiement dépassé' using errcode = '23514'; end if;
    if tg_table_name = 'payment_allocations' then
      select * into v from escen.contract_versions where id = new.version_id for update;
      if v.status <> 'APPROVED' then raise exception 'Allocation sur un contrat non courant' using errcode = '23514'; end if;
      perform 1 from escen.contract_lines where id = new.line_id for update;
      select amount into maximum from escen.contract_lines where id = new.line_id;
      maximum := maximum - coalesce((select sum(amount) from escen.contract_discounts where line_id = new.line_id),0)
        - coalesce((select sum(amount) from escen.credit_notes where line_id = new.line_id),0);
      if coalesce((select sum(amount) from escen.active_payment_allocations where line_id = new.line_id),0) + new.amount > maximum then
        raise exception 'Ligne de frais déjà réglée' using errcode = '23514';
      end if;
      if new.installment_id is not null then
        perform 1 from escen.installments where id = new.installment_id for update;
        if coalesce((select sum(amount) from escen.active_payment_allocations where installment_id = new.installment_id),0) + new.amount
          > (select amount from escen.installments where id = new.installment_id) then
          raise exception 'Échéance déjà réglée' using errcode = '23514';
        end if;
      end if;
    end if;
  elsif tg_table_name = 'credit_notes' then
    perform 1 from escen.contract_lines where id = new.line_id for update;
    select amount into maximum from escen.contract_lines where id = new.line_id;
    maximum := maximum - coalesce((select sum(amount) from escen.contract_discounts where line_id = new.line_id),0);
    if coalesce((select sum(amount) from escen.credit_notes where line_id = new.line_id),0) + new.amount
      + coalesce((select sum(amount) from escen.active_payment_allocations where line_id = new.line_id),0) > maximum then
      raise exception 'Avoir supérieur au montant non alloué de la ligne' using errcode = '23514';
    end if;
  elsif tg_table_name = 'allocation_reversals' then
    select payment_id into c from escen.payment_allocations where id = new.allocation_id;
    perform 1 from escen.payments where id = c for update;
  end if;
  return new;
end $$;
create trigger allocation_guard before insert on escen.payment_allocations for each row execute function escen_private.guard_financial_operation();
create trigger reversal_guard before insert on escen.payment_reversals for each row execute function escen_private.guard_financial_operation();
create trigger refund_guard before insert on escen.refunds for each row execute function escen_private.guard_financial_operation();
create trigger credit_guard before insert on escen.credit_notes for each row execute function escen_private.guard_financial_operation();
create trigger allocation_reversal_guard before insert on escen.allocation_reversals for each row execute function escen_private.guard_financial_operation();

create function escen_private.guard_purchase_receipt() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare ordered numeric; state text;
begin
  select quantity into ordered from escen.purchase_lines where id = new.line_id for update;
  select status into state from escen.purchases where id = new.purchase_id;
  if state not in ('APPROUVE','RECEPTION_PARTIELLE') or coalesce((select sum(quantity) from escen.purchase_receipts where line_id = new.line_id),0) + new.quantity > ordered then
    raise exception 'Réception non approuvée ou quantité dépassée' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger purchase_receipt_guard before insert on escen.purchase_receipts for each row execute function escen_private.guard_purchase_receipt();
create function escen_private.guard_asset_movement() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare site uuid; received numeric;
begin
  select site_id into site from escen.assets where id = new.asset_id for update;
  if coalesce((select sum(quantity) from escen.asset_movements where asset_id = new.asset_id),0) + new.quantity < 0 then
    raise exception 'Stock insuffisant' using errcode = '23514';
  end if;
  if new.receipt_id is not null then
    select r.quantity into received from escen.purchase_receipts r join escen.purchases p on p.id = r.purchase_id where r.id = new.receipt_id and p.site_id = site for update of r;
    if received is null or new.quantity <= 0 or coalesce((select sum(quantity) from escen.asset_movements where receipt_id = new.receipt_id),0) + new.quantity > received then
      raise exception 'Mouvement incompatible avec la réception' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger asset_movement_guard before insert on escen.asset_movements for each row execute function escen_private.guard_asset_movement();
commit;
