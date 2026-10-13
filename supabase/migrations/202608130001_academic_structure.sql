-- Socle académique ESCEN : cycles, niveaux, semestres compatibles et filières.
-- Les matières, enseignants et affectations pédagogiques sont volontairement exclus.

create extension if not exists pgcrypto;

create table if not exists public.academic_cycles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('LICENCE', 'MASTER')),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_levels (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.academic_cycles(id) on delete restrict,
  code text not null unique check (code in ('L1', 'L2', 'L3', 'M1', 'M2')),
  name text not null,
  position smallint not null check (position > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, position)
);

create table if not exists public.level_semesters (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.academic_levels(id) on delete restrict,
  semester_number smallint not null check (semester_number between 1 and 6),
  label text not null,
  position smallint not null check (position in (1, 2)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (level_id, semester_number),
  unique (level_id, position)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0)
);

insert into public.academic_cycles (code, name)
values ('LICENCE', 'Licence'), ('MASTER', 'Master')
on conflict (code) do update set name = excluded.name;

insert into public.academic_levels (cycle_id, code, name, position)
select cycle.id, values_to_insert.code, values_to_insert.name, values_to_insert.position
from (values
  ('LICENCE', 'L1', 'Licence 1', 1),
  ('LICENCE', 'L2', 'Licence 2', 2),
  ('LICENCE', 'L3', 'Licence 3', 3),
  ('MASTER', 'M1', 'Master 1', 1),
  ('MASTER', 'M2', 'Master 2', 2)
) as values_to_insert(cycle_code, code, name, position)
join public.academic_cycles cycle on cycle.code = values_to_insert.cycle_code
on conflict (code) do update set name = excluded.name, position = excluded.position;

insert into public.level_semesters (level_id, semester_number, label, position)
select level.id, values_to_insert.semester_number, 'Semestre ' || values_to_insert.semester_number, values_to_insert.position
from (values
  ('L1', 1, 1), ('L1', 2, 2),
  ('L2', 3, 1), ('L2', 4, 2),
  ('L3', 5, 1), ('L3', 6, 2),
  ('M1', 1, 1), ('M1', 2, 2),
  ('M2', 3, 1), ('M2', 4, 2)
) as values_to_insert(level_code, semester_number, position)
join public.academic_levels level on level.code = values_to_insert.level_code
on conflict (level_id, semester_number) do update set label = excluded.label, position = excluded.position;

alter table public.academic_cycles enable row level security;
alter table public.academic_levels enable row level security;
alter table public.level_semesters enable row level security;
alter table public.programs enable row level security;

-- Lecture publique temporaire pour le prototype. Les écritures passeront par
-- une authentification et des politiques par rôle dans le prochain lot.
create policy "prototype_read_cycles" on public.academic_cycles for select using (true);
create policy "prototype_read_levels" on public.academic_levels for select using (true);
create policy "prototype_read_level_semesters" on public.level_semesters for select using (true);
create policy "prototype_read_programs" on public.programs for select using (true);

