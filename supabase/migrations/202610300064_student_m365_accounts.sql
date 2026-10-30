-- Migration : Ajout des colonnes de provisionnement Microsoft 365 sur escen.students
alter table escen.students
  add column if not exists m365_email text unique,
  add column if not exists m365_user_id text,
  add column if not exists m365_status text not null default 'PENDING'
    check (m365_status in ('PENDING', 'ACTIVE', 'FAILED', 'SIMULATED')),
  add column if not exists m365_provisioned_at timestamptz,
  add column if not exists m365_error text;

create index if not exists idx_students_m365_email on escen.students(m365_email);

