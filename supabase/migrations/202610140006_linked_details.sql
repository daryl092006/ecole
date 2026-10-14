begin;
create table escen.assessment_weights (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null,
  component_id uuid not null,
  evaluation_kind text not null check (evaluation_kind in ('DEVOIR','EXAMEN','INTERROGATION','TP','EXPOSE','PROJET')),
  percent numeric not null check (percent > 0 and percent <= 100),
  foreign key (component_id, curriculum_id) references escen.curriculum_components(id, curriculum_id) on delete restrict,
  unique (component_id, evaluation_kind)
);
create table escen.syllabuses (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null,
  component_id uuid not null,
  version integer not null check (version > 0),
  description text,
  objectives text,
  competencies text,
  course_plan jsonb,
  resources jsonb,
  approved_by uuid references escen.accounts(id) on delete restrict,
  approved_at timestamptz,
  foreign key (component_id, curriculum_id) references escen.curriculum_components(id, curriculum_id) on delete restrict,
  unique (component_id, version),
  check ((approved_by is null) = (approved_at is null))
);
alter table escen.exam_deliveries add unique (id, evaluation_id);
create table escen.exam_rooms (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null,
  evaluation_id uuid not null,
  room_id uuid not null references escen.rooms(id) on delete restrict,
  assigned_capacity integer not null check (assigned_capacity > 0),
  foreign key (delivery_id, evaluation_id) references escen.exam_deliveries(id, evaluation_id) on delete restrict,
  unique (delivery_id, room_id), unique (id, evaluation_id)
);
create table escen.exam_room_candidates (
  id uuid primary key default gen_random_uuid(),
  exam_room_id uuid not null,
  candidate_id uuid not null,
  evaluation_id uuid not null,
  foreign key (exam_room_id, evaluation_id) references escen.exam_rooms(id, evaluation_id) on delete restrict,
  foreign key (candidate_id, evaluation_id) references escen.evaluation_candidates(id, evaluation_id) on delete restrict,
  unique (evaluation_id, candidate_id)
);
create table escen.exam_room_supervisors (
  id uuid primary key default gen_random_uuid(),
  exam_room_id uuid not null references escen.exam_rooms(id) on delete restrict,
  account_id uuid not null references escen.accounts(id) on delete restrict,
  unique (exam_room_id, account_id)
);
create trigger weight_curriculum_guard before insert or update on escen.assessment_weights for each row execute function escen_private.guard_curriculum();
create trigger syllabus_curriculum_guard before insert or update on escen.syllabuses for each row execute function escen_private.guard_curriculum();
create function escen_private.check_assessment_budget() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.status = 'APPROVED' and old.status = 'DRAFT' and exists (
    select 1 from escen.curriculum_components c where c.curriculum_id = new.id
      and coalesce((select sum(w.percent) from escen.assessment_weights w where w.component_id = c.id),0) <> 100) then
    raise exception 'Pondérations de chaque matière : total de 100 obligatoire' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger assessment_budget_guard before update on escen.curricula for each row execute function escen_private.check_assessment_budget();

create function escen_private.check_context_stability() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_table_name = 'enrollment_groups' then
    if (to_jsonb(new) - 'valid_until' - 'reason' - 'changed_by') <> (to_jsonb(old) - 'valid_until' - 'reason' - 'changed_by') then
      raise exception 'Affectation historique : fermer puis créer une nouvelle affectation' using errcode = '23514';
    end if;
    if new.valid_until is not null and exists (select 1 from escen.attendances a join escen.sessions s on s.id = a.session_id
      where a.enrollment_id = old.enrollment_id and s.group_id = old.group_id
        and (s.starts_at at time zone 'Africa/Lome')::date >= new.valid_until
        and (s.starts_at at time zone 'Africa/Lome')::date >= old.valid_from
        and (old.valid_until is null or (s.starts_at at time zone 'Africa/Lome')::date < old.valid_until)) then
      raise exception 'La fermeture du groupe invaliderait des présences historiques' using errcode = '23514';
    end if;
  elsif tg_table_name = 'enrollments' then
    if new.student_id <> old.student_id or new.offering_id <> old.offering_id then
      raise exception 'Inscription historique : étudiant et formation immuables' using errcode = '23514';
    end if;
  elsif tg_table_name = 'academic_years' then
    if (new.starts_on <> old.starts_on or new.ends_on <> old.ends_on) and exists
      (select 1 from escen.academic_offerings where academic_year_id = old.id) then
      raise exception 'Dates d’année utilisées immuables' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger membership_context_guard before update on escen.enrollment_groups for each row execute function escen_private.check_context_stability();
create trigger enrollment_context_guard before update on escen.enrollments for each row execute function escen_private.check_context_stability();
create trigger year_context_guard before update on escen.academic_years for each row execute function escen_private.check_context_stability();

create function escen_private.guard_candidate() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare state text; cancelled timestamptz; evaluation_group uuid; roster_date date;
begin
  select status,cancelled_at into state,cancelled from escen.evaluations where id = new.evaluation_id for update;
  if state <> 'BROUILLON' or cancelled is not null
    or exists (select 1 from escen.grades g join escen.evaluation_candidates c on c.id = g.candidate_id where c.evaluation_id = new.evaluation_id)
    or exists (select 1 from escen.exam_attempts where evaluation_id = new.evaluation_id) then
    raise exception 'Liste de candidats verrouillée' using errcode = '23514';
  end if;
  select a.group_id into evaluation_group from escen.evaluations e join escen.teaching_assignments a on a.id = e.assignment_id where e.id = new.evaluation_id;
  select coalesce((select (d.access_opens_at at time zone 'Africa/Lome')::date from escen.exam_deliveries d where d.evaluation_id = new.evaluation_id),current_date) into roster_date;
  if not exists (select 1 from escen.enrollment_groups where enrollment_id = new.enrollment_id and group_id = evaluation_group
    and valid_from <= roster_date and (valid_until is null or valid_until > roster_date)) then
    raise exception 'Candidat hors du groupe affecté' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger candidate_guard before insert or update on escen.evaluation_candidates for each row execute function escen_private.guard_candidate();

create function escen_private.guard_room_assignment() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare capacity integer; start_time timestamptz; end_time timestamptz; session_uuid uuid; room_site uuid; course_site uuid;
begin
  if tg_table_name = 'exam_rooms' then
    select r.capacity,r.site_id into capacity,room_site from escen.rooms r where r.id = new.room_id for update;
    select d.access_opens_at,d.access_closes_at,d.session_id,o.site_id into start_time,end_time,session_uuid,course_site
      from escen.exam_deliveries d join escen.evaluations e on e.id = d.evaluation_id
      join escen.academic_offerings o on o.id = e.offering_id where d.id = new.delivery_id;
    if new.assigned_capacity > capacity or room_site <> course_site
      or exists (select 1 from escen.sessions where id <> session_uuid and effective_room_id = new.room_id
        and status not in ('ANNULE','REPORTE') and starts_at < end_time and start_time < ends_at)
      or exists (select 1 from escen.exam_rooms r join escen.exam_deliveries d on d.id = r.delivery_id
        join escen.sessions s on s.id = d.session_id where r.id <> new.id and r.room_id = new.room_id
        and s.status not in ('ANNULE','REPORTE') and d.access_opens_at < end_time and start_time < d.access_closes_at) then
      raise exception 'Salle d’examen incompatible, capacité dépassée ou conflit' using errcode = '23514';
    end if;
  else
    select assigned_capacity into capacity from escen.exam_rooms where id = new.exam_room_id for update;
    if (select count(*) from escen.exam_room_candidates where exam_room_id = new.exam_room_id and id <> new.id) >= capacity then
      raise exception 'Salle d’examen pleine' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger exam_room_guard before insert or update on escen.exam_rooms for each row execute function escen_private.guard_room_assignment();
create trigger exam_room_candidate_guard before insert or update on escen.exam_room_candidates for each row execute function escen_private.guard_room_assignment();

create function escen_private.guard_jury_reference() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare enrollment uuid; grade_enrollment uuid; grade_version integer; grade_value numeric; decision_semester uuid; component_semester uuid;
begin
  if tg_table_name = 'jury_grade_inputs' then
    select d.enrollment_id, os.curriculum_semester_id into enrollment,decision_semester from escen.jury_decisions d
      join escen.offering_semesters os on os.id = d.offering_semester_id where d.id = new.decision_id;
    select c.enrollment_id,g.revision,g.value,u.semester_id into grade_enrollment,grade_version,grade_value,component_semester
      from escen.grades g join escen.evaluation_candidates c on c.id = g.candidate_id join escen.evaluations e on e.id = c.evaluation_id
      join escen.curriculum_components ec on ec.id = e.component_id join escen.teaching_units u on u.id = ec.unit_id
      where g.id = new.grade_id and e.status = 'PUBLIEES';
    if enrollment is distinct from grade_enrollment or decision_semester is distinct from component_semester
      or new.grade_revision is distinct from grade_version or new.value is distinct from grade_value then
      raise exception 'Note ou version incompatible avec la décision de jury' using errcode = '23514';
    end if;
  elsif tg_table_name = 'credit_awards' then
    if not exists (select 1 from escen.jury_decisions d join escen.offering_semesters os on os.id = d.offering_semester_id
      join escen.teaching_units u on u.semester_id = os.curriculum_semester_id join escen.curriculum_components ec on ec.unit_id = u.id
      where d.id = new.decision_id and ec.id = new.component_id and new.credits <= ec.credits) then
      raise exception 'Crédits hors de la maquette du jury' using errcode = '23514';
    end if;
  elsif tg_table_name = 'jury_decisions' then
    if new.supersedes_id is not null and not exists (select 1 from escen.jury_decisions where id = new.supersedes_id
      and enrollment_id = new.enrollment_id and offering_semester_id = new.offering_semester_id) then
      raise exception 'Décision antérieure d’un autre étudiant ou semestre' using errcode = '23514';
    end if;
  elsif tg_table_name = 'generated_documents' then
    if new.decision_id is not null and not exists (select 1 from escen.jury_decisions d join escen.enrollments e on e.id = d.enrollment_id
      where d.id = new.decision_id and e.student_id = new.student_id and d.enrollment_id = new.enrollment_id) then
      raise exception 'Relevé d’un autre étudiant ou inscription' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger jury_input_guard before insert on escen.jury_grade_inputs for each row execute function escen_private.guard_jury_reference();
create trigger credit_award_guard before insert on escen.credit_awards for each row execute function escen_private.guard_jury_reference();
create trigger jury_successor_guard before insert on escen.jury_decisions for each row execute function escen_private.guard_jury_reference();
create trigger generated_document_guard before insert on escen.generated_documents for each row execute function escen_private.guard_jury_reference();
create view escen.jury_decisions_needing_review with (security_invoker = true) as
select distinct d.id as decision_id from escen.jury_decisions d join escen.jury_grade_inputs i on i.decision_id = d.id
join escen.grades g on g.id = i.grade_id where g.revision <> i.grade_revision;

do $$ declare name text;
begin
  foreach name in array array['assessment_weights','syllabuses','exam_rooms','exam_room_candidates','exam_room_supervisors'] loop
    execute format('alter table escen.%I enable row level security',name);
    execute format('create trigger no_delete before delete on escen.%I for each row execute function escen_private.no_delete()',name);
    execute format('create trigger audit_event after insert or update on escen.%I for each row execute function escen_private.record_audit()',name);
  end loop;
end $$;
create index assessment_component_fk on escen.assessment_weights(component_id, curriculum_id);
create index syllabus_component_fk on escen.syllabuses(component_id, curriculum_id);
create index exam_room_delivery_fk on escen.exam_rooms(delivery_id,evaluation_id);
create index exam_room_room_fk on escen.exam_rooms(room_id);
create index exam_room_candidate_fk on escen.exam_room_candidates(candidate_id,evaluation_id);
create index exam_room_candidate_room_fk on escen.exam_room_candidates(exam_room_id,evaluation_id);
create index exam_room_supervisor_fk on escen.exam_room_supervisors(account_id);
create index exam_room_supervisor_room_fk on escen.exam_room_supervisors(exam_room_id);
revoke all on all tables in schema escen from public;
revoke all on all functions in schema escen_private from public;
commit;
