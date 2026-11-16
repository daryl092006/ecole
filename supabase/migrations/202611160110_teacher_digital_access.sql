-- Proposition validée par l’utilisateur le 16 novembre 2026. Application locale uniquement.
-- E-mail personnel obligatoire pour les NOUVEAUX profils enseignants.
-- Suivi durable des créations Microsoft 365 / portail et de leur notification.
-- Aucun mot de passe ni lien de récupération dans cette table ou son audit.
-- Aucun changement rétroactif des enseignants ou comptes existants.
begin;

create function escen_private.require_teacher_personal_email()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare contact text;
begin
  -- Une référence inexistante doit rester une erreur de clé étrangère.
  if not exists (select 1 from escen.staff where id = new.staff_id) then
    return new;
  end if;
  select lower(btrim(p.email)) into contact
  from escen.staff s join escen.people p on p.id = s.person_id
  where s.id = new.staff_id and s.archived_at is null and p.archived_at is null;
  if contact is null or char_length(contact) > 254
    or contact !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'
    or split_part(contact, '@', 2) = 'escen.university' then
    raise exception 'Un e-mail personnel valide est obligatoire pour créer un enseignant.'
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger teacher_personal_email_required before insert on escen.teachers
  for each row execute function escen_private.require_teacher_personal_email();

create table escen.teacher_digital_access (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references escen.teachers(id) on delete restrict,
  personal_email text not null check (
    personal_email = lower(btrim(personal_email)) and char_length(personal_email) <= 254
    and personal_email ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'
    and split_part(personal_email, '@', 2) <> 'escen.university'
  ),
  institutional_email text unique check (
    institutional_email = lower(btrim(institutional_email))
    and institutional_email ~ '^[^[:space:]<>@]+@escen\.university$'
  ),
  m365_user_id uuid unique,
  account_id uuid unique references escen.accounts(id) on delete restrict,
  provisioning_status text not null default 'PENDING'
    check (provisioning_status in ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'UNKNOWN')),
  email_id uuid references escen.email_outbox(id) on delete restrict,
  last_error_code text check (last_error_code in (
    'CONFIGURATION', 'IDENTITY_CONFLICT', 'MICROSOFT_REJECTED', 'LICENSE_REJECTED',
    'AUTH_REJECTED', 'CONCURRENT_UPDATE', 'NETWORK_AMBIGUOUS', 'EMAIL_REJECTED'
  )),
  requested_by uuid not null references escen.accounts(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provisioning_status <> 'READY' or
    (institutional_email is not null and m365_user_id is not null and account_id is not null))
);
create index teacher_digital_access_pending
  on escen.teacher_digital_access(provisioning_status, updated_at);
alter table escen.teacher_digital_access enable row level security;
create trigger audit_event after insert or update on escen.teacher_digital_access
  for each row execute function escen_private.record_audit();
create trigger no_delete before delete on escen.teacher_digital_access
  for each row execute function escen_private.no_delete();

-- Permission existante staff.manage : aucun élargissement des rôles autorisés.
-- Appel serveur uniquement, après requireAccount / requirePermission et Zod.
create function escen.request_teacher_digital_access(
  p_actor_id uuid, p_teacher_id uuid, p_reason text
) returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare contact text; request_id uuid; previous_actor text;
begin
  if not exists (
    select 1 from escen.accounts a
    join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = p_actor_id and a.active and a.archived_at is null
      and a.auth_user_id is not null and r.active and p.code = 'staff.manage'
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
  ) then raise exception 'Accès global au personnel requis' using errcode = '42501'; end if;
  select lower(btrim(p.email)) into contact
  from escen.teachers t join escen.staff s on s.id = t.staff_id
  join escen.people p on p.id = s.person_id
  where t.id = p_teacher_id and t.active and s.archived_at is null and p.archived_at is null;
  if contact is null then raise exception 'Enseignant actif et e-mail personnel requis' using errcode = '23514'; end if;
  previous_actor := current_setting('escen.actor_id', true);
  perform set_config('escen.actor_id', p_actor_id::text, true);
  insert into escen.teacher_digital_access(teacher_id, personal_email, requested_by, reason)
  values (p_teacher_id, contact, p_actor_id, btrim(p_reason))
  on conflict (teacher_id) do nothing;
  select id into request_id from escen.teacher_digital_access where teacher_id = p_teacher_id;
  perform set_config('escen.actor_id', coalesce(previous_actor, ''), true);
  return request_id;
end $$;
create function public.escen_teacher_digital_access_request(
  p_actor_id uuid, p_teacher_id uuid, p_reason text
) returns uuid language sql security definer set search_path = pg_catalog as $$
  select escen.request_teacher_digital_access(p_actor_id, p_teacher_id, p_reason);
$$;

-- Le snapshot générique ne doit pas diffuser le suivi de provisionnement.
alter function public.escen_backend_snapshot() rename to escen_backend_snapshot_before_teacher_access;
create function public.escen_backend_snapshot() returns jsonb
language sql security definer set search_path = pg_catalog as $$
  select public.escen_backend_snapshot_before_teacher_access() #- '{tables,teacher_digital_access}'::text[];
$$;
revoke all on escen.teacher_digital_access from public;
revoke all on function escen_private.require_teacher_personal_email() from public;
revoke all on function escen.request_teacher_digital_access(uuid, uuid, text) from public;
revoke all on function public.escen_teacher_digital_access_request(uuid, uuid, text) from public;
revoke all on function public.escen_backend_snapshot_before_teacher_access() from public;
revoke all on function public.escen_backend_snapshot() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.escen_backend_snapshot_before_teacher_access() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.escen_backend_snapshot_before_teacher_access() from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on escen.teacher_digital_access to service_role;
    grant execute on function escen.request_teacher_digital_access(uuid, uuid, text),
      public.escen_teacher_digital_access_request(uuid, uuid, text),
      public.escen_backend_snapshot() to service_role;
    revoke all on function public.escen_backend_snapshot_before_teacher_access() from service_role;
  end if;
end $$;
commit;
