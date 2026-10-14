-- Nouveau modèle isolé : ne remplace ni les sauvegardes MySQL ni public.*.
-- Les données historiques seront rapprochées explicitement, jamais par nom seul.
begin;
create schema escen;
create schema escen_private;
revoke all on schema escen, escen_private from public;

create domain escen.xof_amount as numeric
  check (value >= 0 and value <= 99999999999999 and value = trunc(value));
create domain escen.mark as numeric check (value between 0 and 20 and value = round(value,2));
create domain escen.nonempty_text as text check (length(btrim(value)) > 0);

create table escen.people (
  id uuid primary key default gen_random_uuid(),
  firstname escen.nonempty_text not null,
  lastname escen.nonempty_text not null,
  maiden_name text,
  birth_date date,
  birth_place text,
  nationality text,
  gender text,
  email text,
  phone text,
  address text,
  city text,
  country text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table escen.accounts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references escen.people(id) on delete restrict,
  auth_user_id uuid unique,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
-- Le moteur de test est autonome ; la FK Auth est ajoutée sur un vrai Supabase.
do $$ begin
  if to_regclass('auth.users') is not null then
    alter table escen.accounts add constraint accounts_auth_user_fk
      foreign key (auth_user_id) references auth.users(id) on delete restrict;
  end if;
end $$;
create table escen.roles (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  active boolean not null default true
);
create table escen.permissions (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  description escen.nonempty_text not null
);
create table escen.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references escen.roles(id) on delete restrict,
  permission_id uuid not null references escen.permissions(id) on delete restrict,
  unique (role_id, permission_id)
);
create table escen.sites (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  address text,
  active boolean not null default true
);
create table escen.buildings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references escen.sites(id) on delete restrict,
  code escen.nonempty_text not null,
  name escen.nonempty_text not null,
  unique (site_id, code), unique (id, site_id)
);
create table escen.rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null,
  site_id uuid not null references escen.sites(id) on delete restrict,
  code escen.nonempty_text not null,
  name escen.nonempty_text not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','MAINTENANCE','UNAVAILABLE')),
  foreign key (building_id, site_id) references escen.buildings(id, site_id) on delete restrict,
  unique (site_id, code), unique (id, site_id)
);
create table escen.academic_years (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'BROUILLON' check (status in ('BROUILLON','OUVERTE','EN_CLOTURE','CLOTUREE')),
  check (ends_on > starts_on)
);
create table escen.cycles (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null
);
create table escen.levels (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references escen.cycles(id) on delete restrict,
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  position smallint not null check (position > 0),
  unique (cycle_id, position)
);
create table escen.programs (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  description text,
  active boolean not null default true
);
create table escen.tracks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references escen.programs(id) on delete restrict,
  code escen.nonempty_text not null,
  name escen.nonempty_text not null,
  active boolean not null default true,
  unique (program_id, code), unique (id, program_id)
);
create table escen.subjects (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  active boolean not null default true
);
create table escen.curricula (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references escen.programs(id) on delete restrict,
  track_id uuid,
  level_id uuid not null references escen.levels(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','ARCHIVED')),
  approved_by uuid references escen.accounts(id) on delete restrict,
  approved_at timestamptz,
  reason text,
  foreign key (track_id, program_id) references escen.tracks(id, program_id) on delete restrict,
  unique nulls not distinct (program_id, track_id, level_id, version),
  unique (id, level_id),
  check (status = 'DRAFT' or (approved_by is not null and approved_at is not null))
);
create table escen.curriculum_semesters (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references escen.curricula(id) on delete restrict,
  position smallint not null check (position > 0),
  name escen.nonempty_text not null,
  target_credits numeric(6,2) not null check (target_credits > 0),
  unique (curriculum_id, position), unique (id, curriculum_id)
);
create table escen.teaching_units (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null,
  curriculum_id uuid not null,
  code escen.nonempty_text not null,
  name escen.nonempty_text not null,
  credits numeric(6,2) not null check (credits > 0),
  foreign key (semester_id, curriculum_id) references escen.curriculum_semesters(id, curriculum_id) on delete restrict,
  unique (semester_id, code), unique (id, curriculum_id)
);
create table escen.curriculum_components (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references escen.subjects(id) on delete restrict,
  unit_id uuid not null,
  curriculum_id uuid not null,
  code escen.nonempty_text not null,
  coefficient numeric(8,3) not null check (coefficient > 0),
  credits numeric(6,2) not null check (credits >= 0),
  cm_hours numeric(7,2) not null default 0 check (cm_hours >= 0),
  td_hours numeric(7,2) not null default 0 check (td_hours >= 0),
  tp_hours numeric(7,2) not null default 0 check (tp_hours >= 0),
  other_hours numeric(7,2) not null default 0 check (other_hours >= 0),
  foreign key (unit_id, curriculum_id) references escen.teaching_units(id, curriculum_id) on delete restrict,
  unique (unit_id, code), unique (id, curriculum_id)
);
create table escen.academic_offerings (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  level_id uuid not null,
  site_id uuid not null references escen.sites(id) on delete restrict,
  foreign key (curriculum_id, level_id) references escen.curricula(id, level_id) on delete restrict,
  unique (curriculum_id, academic_year_id, site_id),
  unique (id, academic_year_id, level_id), unique (id, curriculum_id), unique (id, site_id)
);
create table escen.offering_semesters (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null,
  curriculum_id uuid not null,
  curriculum_semester_id uuid not null,
  starts_on date not null,
  ends_on date not null,
  foreign key (offering_id, curriculum_id) references escen.academic_offerings(id, curriculum_id) on delete restrict,
  foreign key (curriculum_semester_id, curriculum_id) references escen.curriculum_semesters(id, curriculum_id) on delete restrict,
  unique (offering_id, curriculum_semester_id), unique (id, offering_id),
  check (ends_on >= starts_on)
);
create table escen.groups (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  level_id uuid not null references escen.levels(id) on delete restrict,
  site_id uuid not null references escen.sites(id) on delete restrict,
  name escen.nonempty_text not null,
  unique (academic_year_id, site_id, level_id, name),
  unique (id, academic_year_id, level_id), unique (id, site_id)
);
create table escen.group_offerings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  offering_id uuid not null,
  academic_year_id uuid not null,
  level_id uuid not null,
  site_id uuid not null,
  foreign key (group_id, academic_year_id, level_id) references escen.groups(id, academic_year_id, level_id) on delete restrict,
  foreign key (offering_id, academic_year_id, level_id) references escen.academic_offerings(id, academic_year_id, level_id) on delete restrict,
  foreign key (group_id, site_id) references escen.groups(id, site_id) on delete restrict,
  foreign key (offering_id, site_id) references escen.academic_offerings(id, site_id) on delete restrict,
  unique (group_id, offering_id)
);
create table escen.students (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references escen.people(id) on delete restrict,
  matricule escen.nonempty_text not null unique,
  admitted_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table escen.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references escen.students(id) on delete restrict,
  offering_id uuid not null references escen.academic_offerings(id) on delete restrict,
  status text not null check (status in ('INSCRIT','REINSCRIT','SUSPENDU','ABANDON','DIPLOME')),
  enrolled_on date,
  created_by uuid references escen.accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (student_id, offering_id), unique (id, offering_id), unique (id, student_id)
);
create table escen.enrollment_groups (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null,
  offering_id uuid not null,
  group_id uuid not null,
  valid_from date not null,
  valid_until date,
  changed_by uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  foreign key (enrollment_id, offering_id) references escen.enrollments(id, offering_id) on delete restrict,
  foreign key (group_id, offering_id) references escen.group_offerings(group_id, offering_id) on delete restrict,
  check (valid_until is null or valid_until > valid_from),
  unique (enrollment_id, group_id, valid_from)
);
create table escen.enrollment_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references escen.enrollments(id) on delete restrict,
  old_status text,
  new_status text not null check (new_status in ('INSCRIT','REINSCRIT','SUSPENDU','ABANDON','DIPLOME')),
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  happened_at timestamptz not null default now()
);
create table escen.student_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references escen.students(id) on delete restrict,
  person_id uuid not null references escen.people(id) on delete restrict,
  relationship escen.nonempty_text not null,
  financial_responsibility boolean not null default false,
  emergency_contact boolean not null default false,
  valid_from date not null,
  valid_until date,
  check (valid_until is null or valid_until > valid_from),
  unique (student_id, person_id, valid_from)
);
create table escen.staff (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references escen.people(id) on delete restrict,
  employee_number escen.nonempty_text not null unique,
  archived_at timestamptz
);
create table escen.staff_contracts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references escen.staff(id) on delete restrict,
  site_id uuid not null references escen.sites(id) on delete restrict,
  contract_type text not null check (contract_type in ('PERMANENT','VACATAIRE','STAGIAIRE')),
  position escen.nonempty_text not null,
  starts_on date not null,
  ends_on date,
  check (ends_on is null or ends_on >= starts_on)
);
create table escen.teachers (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null unique references escen.staff(id) on delete restrict,
  specialty text,
  active boolean not null default true
);
create table escen.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references escen.teachers(id) on delete restrict,
  offering_id uuid not null,
  group_id uuid not null,
  curriculum_id uuid not null,
  component_id uuid not null,
  valid_from date not null,
  valid_until date,
  foreign key (group_id, offering_id) references escen.group_offerings(group_id, offering_id) on delete restrict,
  foreign key (offering_id, curriculum_id) references escen.academic_offerings(id, curriculum_id) on delete restrict,
  foreign key (component_id, curriculum_id) references escen.curriculum_components(id, curriculum_id) on delete restrict,
  check (valid_until is null or valid_until >= valid_from),
  unique (teacher_id, group_id, offering_id, component_id, valid_from),
  unique (id, offering_id, group_id, teacher_id), unique (id, offering_id, component_id)
);
create table escen.role_grants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references escen.accounts(id) on delete restrict,
  role_id uuid not null references escen.roles(id) on delete restrict,
  site_id uuid references escen.sites(id) on delete restrict,
  academic_year_id uuid references escen.academic_years(id) on delete restrict,
  group_id uuid references escen.groups(id) on delete restrict,
  granted_by uuid not null references escen.accounts(id) on delete restrict,
  valid_from timestamptz not null,
  valid_until timestamptz,
  reason escen.nonempty_text not null,
  check (valid_until is null or valid_until > valid_from),
  unique nulls not distinct (account_id, role_id, site_id, academic_year_id, group_id, valid_from)
);
create table escen.delegate_mandates (
  id uuid primary key default gen_random_uuid(),
  enrollment_group_id uuid not null references escen.enrollment_groups(id) on delete restrict,
  role text not null check (role in ('DELEGUE','ADJOINT','SECRETAIRE','SECRETAIRE_ADJOINT')),
  starts_on date not null,
  ends_on date,
  approved_by uuid not null references escen.accounts(id) on delete restrict,
  check (ends_on is null or ends_on > starts_on),
  unique (enrollment_group_id, role, starts_on)
);
commit;
