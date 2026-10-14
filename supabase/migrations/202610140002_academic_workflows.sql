begin;
create table escen.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references escen.sites(id) on delete restrict,
  academic_year_id uuid references escen.academic_years(id) on delete restrict,
  name escen.nonempty_text not null,
  kind text not null check (kind in ('JOUR_FERIE','VACANCES','FERMETURE','EXAMEN','AUTRE')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);
create table escen.schedule_series (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references escen.teaching_assignments(id) on delete restrict,
  recurrence_rule text,
  timezone text not null default 'Africa/Lome',
  valid_from date not null,
  valid_until date,
  check (valid_until is null or valid_until >= valid_from)
);
create table escen.sessions (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references escen.schedule_series(id) on delete restrict,
  assignment_id uuid not null,
  offering_id uuid not null,
  group_id uuid not null,
  teacher_id uuid not null,
  room_id uuid references escen.rooms(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode text not null check (mode in ('PAPIER','EN_LIGNE','COURS')),
  status text not null default 'PLANIFIE' check (status in ('PLANIFIE','EN_COURS','TERMINE','ANNULE','REPORTE')),
  actual_starts_at timestamptz,
  actual_ends_at timestamptz,
  replacement_teacher_id uuid references escen.teachers(id) on delete restrict,
  actual_room_id uuid references escen.rooms(id) on delete restrict,
  reason text,
  foreign key (assignment_id, offering_id, group_id, teacher_id)
    references escen.teaching_assignments(id, offering_id, group_id, teacher_id) on delete restrict,
  check (ends_at > starts_at),
  check (actual_ends_at is null or (actual_starts_at is not null and actual_ends_at > actual_starts_at)),
  check ((mode = 'EN_LIGNE' and room_id is null) or (mode <> 'EN_LIGNE' and room_id is not null)),
  check (status not in ('ANNULE','REPORTE') or (reason is not null and length(btrim(reason)) > 0)),
  unique (series_id, starts_at), unique (id, offering_id), unique (id, assignment_id)
);
create table escen.session_supervisors (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references escen.sessions(id) on delete restrict,
  account_id uuid not null references escen.accounts(id) on delete restrict,
  unique (session_id, account_id)
);
create table escen.attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  enrollment_id uuid not null,
  offering_id uuid not null,
  status text not null check (status in ('PRESENT','ABSENT','RETARD','ABSENT_JUSTIFIE','RETARD_JUSTIFIE','DISPENSE')),
  arrived_at timestamptz,
  left_at timestamptz,
  late_minutes integer check (late_minutes >= 0),
  recorded_by uuid not null references escen.accounts(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  comment text,
  foreign key (session_id, offering_id) references escen.sessions(id, offering_id) on delete restrict,
  foreign key (enrollment_id, offering_id) references escen.enrollments(id, offering_id) on delete restrict,
  check (left_at is null or (arrived_at is not null and left_at >= arrived_at)),
  unique (session_id, enrollment_id)
);
create table escen.teacher_attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references escen.sessions(id) on delete restrict,
  teacher_id uuid not null references escen.teachers(id) on delete restrict,
  arrived_at timestamptz,
  left_at timestamptz,
  recorded_by uuid not null references escen.accounts(id) on delete restrict,
  comment text,
  check (left_at is null or (arrived_at is not null and left_at > arrived_at)),
  unique (session_id, teacher_id)
);
create table escen.evaluations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  offering_id uuid not null,
  component_id uuid not null,
  name escen.nonempty_text not null,
  kind text not null check (kind in ('DEVOIR','EXAMEN','INTERROGATION','TP','EXPOSE','PROJET','RATTRAPAGE')),
  parent_evaluation_id uuid,
  status text not null default 'BROUILLON' check (status in ('BROUILLON','SAISIES','SOUMISES','A_CONTROLER','VALIDEES','PUBLIEES')),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid not null references escen.accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (assignment_id, offering_id, component_id)
    references escen.teaching_assignments(id, offering_id, component_id) on delete restrict,
  foreign key (parent_evaluation_id, offering_id, component_id)
    references escen.evaluations(id, offering_id, component_id) on delete restrict,
  unique (id, offering_id), unique (id, offering_id, component_id),
  check (parent_evaluation_id is null or parent_evaluation_id <> id),
  check (kind <> 'RATTRAPAGE' or parent_evaluation_id is not null),
  check (cancelled_at is null or (status = 'BROUILLON' and cancellation_reason is not null and length(btrim(cancellation_reason)) > 0))
);
create table escen.evaluation_transitions (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references escen.evaluations(id) on delete restrict,
  from_status text not null,
  to_status text not null,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason text,
  happened_at timestamptz not null default now(),
  check (from_status <> to_status)
);
create table escen.exam_deliveries (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null unique references escen.evaluations(id) on delete restrict,
  session_id uuid not null unique references escen.sessions(id) on delete restrict,
  access_opens_at timestamptz not null,
  access_closes_at timestamptz not null,
  duration_minutes integer check (duration_minutes > 0),
  check (access_closes_at > access_opens_at)
);
create table escen.evaluation_candidates (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null,
  enrollment_id uuid not null,
  offering_id uuid not null,
  eligibility text not null default 'PENDING' check (eligibility in ('PENDING','ELIGIBLE','EXCLUDED')),
  eligibility_reason text,
  anonymous_code text,
  foreign key (evaluation_id, offering_id) references escen.evaluations(id, offering_id) on delete restrict,
  foreign key (enrollment_id, offering_id) references escen.enrollments(id, offering_id) on delete restrict,
  unique (evaluation_id, enrollment_id), unique (evaluation_id, anonymous_code),
  unique (id, evaluation_id),
  check (eligibility <> 'EXCLUDED' or (eligibility_reason is not null and length(btrim(eligibility_reason)) > 0))
);
create table escen.exam_papers (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references escen.evaluations(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'BROUILLON' check (status in ('BROUILLON','AUTORISE','RETIRE')),
  authorized_by uuid references escen.accounts(id) on delete restrict,
  authorized_at timestamptz,
  reason text,
  unique (evaluation_id, version), unique (id, evaluation_id),
  check (status = 'BROUILLON' or (authorized_by is not null and authorized_at is not null))
);
create table escen.exam_parts (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references escen.exam_papers(id) on delete restrict,
  title escen.nonempty_text not null,
  instructions text,
  context jsonb,
  position integer not null check (position > 0),
  unique (paper_id, position), unique (id, paper_id)
);
create table escen.exam_questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null,
  part_id uuid not null,
  kind text not null check (kind in ('QCM_SIMPLE','QCM_MULTIPLE','TEXTE','REDACTION_GUIDEE','STRUCTURE','MULTIPARTIE','COMPLEXE')),
  prompt escen.nonempty_text not null,
  points numeric(8,3) not null check (points > 0),
  position integer not null check (position > 0),
  configuration jsonb not null default '{}',
  foreign key (part_id, paper_id) references escen.exam_parts(id, paper_id) on delete restrict,
  unique (part_id, position), unique (id, paper_id)
);
create table escen.exam_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references escen.exam_questions(id) on delete restrict,
  label escen.nonempty_text not null,
  is_correct boolean not null,
  position integer not null check (position > 0),
  unique (question_id, position)
);
create table escen.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  evaluation_id uuid not null,
  paper_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  started_at timestamptz not null,
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  status text not null check (status in ('EN_COURS','REMISE','EXPIREE','INTERROMPUE')),
  foreign key (candidate_id, evaluation_id) references escen.evaluation_candidates(id, evaluation_id) on delete restrict,
  foreign key (paper_id, evaluation_id) references escen.exam_papers(id, evaluation_id) on delete restrict,
  check (deadline_at > started_at),
  check ((status in ('REMISE','EXPIREE') and submitted_at is not null) or (status not in ('REMISE','EXPIREE') and submitted_at is null)),
  check (submitted_at is null or submitted_at >= started_at),
  unique (candidate_id, attempt_number), unique (id, paper_id)
);
create table escen.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  question_id uuid not null,
  paper_id uuid not null,
  response jsonb not null,
  saved_at timestamptz not null default now(),
  foreign key (attempt_id, paper_id) references escen.exam_attempts(id, paper_id) on delete restrict,
  foreign key (question_id, paper_id) references escen.exam_questions(id, paper_id) on delete restrict,
  unique (attempt_id, question_id)
);
create table escen.answer_corrections (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references escen.exam_answers(id) on delete restrict,
  points numeric(8,3) not null check (points >= 0),
  corrected_by uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  corrected_at timestamptz not null default now()
);
create table escen.grades (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references escen.evaluation_candidates(id) on delete restrict,
  value escen.mark,
  absence_status text check (absence_status in ('ABSENT','JUSTIFIE','NON_TRAITE')),
  revision integer not null default 1 check (revision > 0),
  entered_by uuid not null references escen.accounts(id) on delete restrict,
  last_modified_by uuid not null references escen.accounts(id) on delete restrict,
  entered_at timestamptz not null default now(),
  check (absence_status is null or value is null)
);
create table escen.complaints (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references escen.evaluation_candidates(id) on delete restrict,
  grade_id uuid not null references escen.grades(id) on delete restrict,
  status text not null default 'NOUVELLE' check (status in ('NOUVELLE','EN_ANALYSE','TRANSMISE_ENSEIGNANT','AVIS_ENSEIGNANT','DECISION_ACADEMIQUE','CORRECTION_EVENTUELLE','CLOTUREE')),
  reason escen.nonempty_text not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((status = 'CLOTUREE') = (closed_at is not null))
);
create unique index one_open_complaint_per_grade on escen.complaints(grade_id) where status <> 'CLOTUREE';
create table escen.complaint_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references escen.complaints(id) on delete restrict,
  from_status text not null,
  to_status text not null,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  happened_at timestamptz not null default now()
);
create table escen.grade_revisions (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references escen.grades(id) on delete restrict,
  complaint_id uuid references escen.complaints(id) on delete restrict,
  old_value escen.mark not null,
  new_value escen.mark not null,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  actor_role escen.nonempty_text not null,
  reason escen.nonempty_text not null,
  happened_at timestamptz not null default now(),
  check (old_value <> new_value)
);
create table escen.academic_rule_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  rules jsonb not null,
  approved_by uuid not null references escen.accounts(id) on delete restrict,
  approved_at timestamptz not null,
  reason escen.nonempty_text not null
);
create table escen.juries (
  id uuid primary key default gen_random_uuid(),
  offering_semester_id uuid not null references escen.offering_semesters(id) on delete restrict,
  rules_id uuid not null references escen.academic_rule_versions(id) on delete restrict,
  held_at timestamptz not null,
  minutes text,
  chaired_by uuid not null references escen.accounts(id) on delete restrict,
  unique (id, offering_semester_id)
);
create table escen.jury_members (
  id uuid primary key default gen_random_uuid(),
  jury_id uuid not null references escen.juries(id) on delete restrict,
  account_id uuid not null references escen.accounts(id) on delete restrict,
  capacity escen.nonempty_text not null,
  unique (jury_id, account_id)
);
create table escen.jury_decisions (
  id uuid primary key default gen_random_uuid(),
  jury_id uuid not null,
  offering_semester_id uuid not null,
  offering_id uuid not null,
  enrollment_id uuid not null,
  supersedes_id uuid references escen.jury_decisions(id) on delete restrict,
  decision text not null check (decision in ('ADMIS','RATTRAPAGE','AJOURNE')),
  average escen.mark not null,
  earned_credits numeric(6,2) not null check (earned_credits >= 0),
  required_credits numeric(6,2) not null check (required_credits > 0),
  reason escen.nonempty_text not null,
  decided_by uuid not null references escen.accounts(id) on delete restrict,
  decided_at timestamptz not null default now(),
  foreign key (jury_id, offering_semester_id) references escen.juries(id, offering_semester_id) on delete restrict,
  foreign key (offering_semester_id, offering_id) references escen.offering_semesters(id, offering_id) on delete restrict,
  foreign key (enrollment_id, offering_id) references escen.enrollments(id, offering_id) on delete restrict,
  check (earned_credits <= required_credits), check (supersedes_id is null or supersedes_id <> id)
);
create unique index decision_successor_unique on escen.jury_decisions(supersedes_id) where supersedes_id is not null;
create table escen.jury_grade_inputs (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references escen.jury_decisions(id) on delete restrict,
  grade_id uuid not null references escen.grades(id) on delete restrict,
  grade_revision integer not null check (grade_revision > 0),
  value escen.mark not null,
  unique (decision_id, grade_id)
);
create table escen.credit_awards (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references escen.jury_decisions(id) on delete restrict,
  component_id uuid not null references escen.curriculum_components(id) on delete restrict,
  credits numeric(6,2) not null check (credits > 0),
  award_kind text not null check (award_kind in ('NORMALE','RATTRAPAGE','COMPENSATION','TRANSFERT')),
  unique (decision_id, component_id)
);
create table escen.generated_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references escen.students(id) on delete restrict,
  enrollment_id uuid,
  decision_id uuid references escen.jury_decisions(id) on delete restrict,
  kind text not null check (kind in ('CARTE','CERTIFICAT','RELEVE','DIPLOME')),
  reference escen.nonempty_text not null unique,
  version integer not null check (version > 0),
  supersedes_id uuid references escen.generated_documents(id) on delete restrict,
  content_snapshot jsonb not null,
  issued_by uuid not null references escen.accounts(id) on delete restrict,
  issued_at timestamptz not null default now(),
  foreign key (enrollment_id, student_id) references escen.enrollments(id, student_id) on delete restrict,
  check (kind <> 'RELEVE' or decision_id is not null)
);
commit;
