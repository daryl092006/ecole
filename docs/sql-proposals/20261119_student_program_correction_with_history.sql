-- PROPOSITION REVISEE : conservation des données et absence de blocage lié aux notes ou finances.
-- À valider avant création de migration. Aucun SQL de ce fichier n'a été appliqué.
begin;

create table escen.student_program_corrections (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references escen.support_tickets(id) on delete restrict,
  enrollment_id uuid not null references escen.enrollments(id) on delete restrict,
  previous_offering_id uuid not null references escen.academic_offerings(id) on delete restrict,
  offering_id uuid not null references escen.academic_offerings(id) on delete restrict,
  group_id uuid not null references escen.groups(id) on delete restrict,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  enrollment_before jsonb not null,
  membership_before jsonb,
  transaction_id bigint not null default txid_current(),
  created_at timestamptz not null default now(),
  check (previous_offering_id <> offering_id)
);
create index student_program_corrections_enrollment on escen.student_program_corrections(enrollment_id);
create index student_program_corrections_actor on escen.student_program_corrections(actor_id);
create index student_program_corrections_previous_offering on escen.student_program_corrections(previous_offering_id);
create index student_program_corrections_offering on escen.student_program_corrections(offering_id);
create index student_program_corrections_group on escen.student_program_corrections(group_id);
alter table escen.student_program_corrections enable row level security;
create trigger audit_event after insert or update on escen.student_program_corrections
for each row execute function escen_private.record_audit();
create trigger no_delete before delete on escen.student_program_corrections
for each row execute function escen_private.no_delete();

create table escen.enrollment_offering_contexts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references escen.enrollments(id) on delete restrict,
  offering_id uuid not null references escen.academic_offerings(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (enrollment_id, offering_id)
);
create index enrollment_offering_contexts_offering on escen.enrollment_offering_contexts(offering_id);
alter table escen.enrollment_offering_contexts enable row level security;
create trigger audit_event after insert or update on escen.enrollment_offering_contexts
for each row execute function escen_private.record_audit();
create trigger no_delete before delete on escen.enrollment_offering_contexts
for each row execute function escen_private.no_delete();

-- Les anciens contextes restent des références valides ; aucune note ni présence
-- n'est déplacée vers les matières ou séances de la nouvelle formation.
insert into escen.enrollment_offering_contexts(enrollment_id, offering_id)
select id, offering_id from escen.enrollments;

create function escen_private.capture_enrollment_offering() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  insert into escen.enrollment_offering_contexts(enrollment_id, offering_id)
  values (new.id, new.offering_id) on conflict (enrollment_id, offering_id) do nothing;
  return new;
end $$;
create trigger enrollment_offering_capture after insert or update of offering_id on escen.enrollments
for each row execute function escen_private.capture_enrollment_offering();

-- Les quatre anciennes FK sont remplacées par des FK tout aussi explicites
-- vers le contexte historisé de la même inscription. Toutes les autres FK restent.
alter table escen.enrollment_groups
  drop constraint enrollment_groups_enrollment_id_offering_id_fkey,
  add constraint enrollment_groups_context_fk foreign key (enrollment_id, offering_id)
  references escen.enrollment_offering_contexts(enrollment_id, offering_id) on delete restrict;
alter table escen.attendances
  drop constraint attendances_enrollment_id_offering_id_fkey,
  add constraint attendances_context_fk foreign key (enrollment_id, offering_id)
  references escen.enrollment_offering_contexts(enrollment_id, offering_id) on delete restrict;
alter table escen.evaluation_candidates
  drop constraint evaluation_candidates_enrollment_id_offering_id_fkey,
  add constraint evaluation_candidates_context_fk foreign key (enrollment_id, offering_id)
  references escen.enrollment_offering_contexts(enrollment_id, offering_id) on delete restrict;
alter table escen.jury_decisions
  drop constraint jury_decisions_enrollment_id_offering_id_fkey,
  add constraint jury_decisions_context_fk foreign key (enrollment_id, offering_id)
  references escen.enrollment_offering_contexts(enrollment_id, offering_id) on delete restrict;

-- Un ancien rattachement reste consultable, sans constituer une affectation actuelle.
alter table escen.enrollment_groups add column historical_only boolean not null default false;
create index enrollment_groups_current on escen.enrollment_groups(enrollment_id, historical_only);

create function escen_private.require_current_enrollment_offering() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if not exists (select 1 from escen.enrollments e
    where e.id = new.enrollment_id and e.offering_id = new.offering_id) then
    raise exception 'Nouvelle activité incompatible avec la formation actuelle' using errcode = '23514';
  end if;
  return new;
end $$;
-- Les mises à jour des anciennes présences et des candidats restent possibles
-- selon leurs protections existantes. Les nouvelles activités utilisent la formation actuelle.
create trigger current_offering_guard before insert on escen.attendances
for each row execute function escen_private.require_current_enrollment_offering();
create trigger current_offering_guard before insert on escen.evaluation_candidates
for each row execute function escen_private.require_current_enrollment_offering();

create or replace function escen_private.check_context_stability() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_table_name = 'enrollments' then
  if exists (
    select 1 from escen.student_program_corrections c
    where c.enrollment_id = old.id and c.transaction_id = txid_current()
      and c.actor_id::text = current_setting('escen.actor_id', true)
      and c.previous_offering_id = old.offering_id and c.offering_id = new.offering_id
      and (to_jsonb(new) - 'offering_id') = (to_jsonb(old) - 'offering_id')
  ) then return new; end if;
  end if;
  if tg_table_name = 'enrollment_groups' then
  if exists (
    select 1 from escen.student_program_corrections c
    where c.enrollment_id = old.enrollment_id and c.transaction_id = txid_current()
      and c.actor_id::text = current_setting('escen.actor_id', true)
      and c.actor_id = new.changed_by
      and ((new.historical_only and old.offering_id = c.previous_offering_id)
        or (not new.historical_only and old.offering_id = c.offering_id and old.group_id = c.group_id))
      and (to_jsonb(new) - 'historical_only' - 'changed_by' - 'reason')
        = (to_jsonb(old) - 'historical_only' - 'changed_by' - 'reason')
  ) then return new; end if;
  end if;
  -- Protections historiques conservées pour tous les autres appels.
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

create function escen.correct_student_program(
  p_actor_id uuid, p_role_code text, p_expected_revision bigint,
  p_ticket_id uuid, p_enrollment_id uuid, p_offering_id uuid, p_group_id uuid, p_reason text
) returns bigint language plpgsql security definer set search_path = pg_catalog as $$
declare
  enrollment escen.enrollments%rowtype;
  ticket escen.support_tickets%rowtype;
  source escen.academic_offerings%rowtype;
  target escen.academic_offerings%rowtype;
  membership escen.enrollment_groups%rowtype;
  revision bigint;
  previous_actor text;
begin
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'Motif obligatoire de 3 à 1000 caractères' using errcode = '23514';
  end if;
  select r.revision into revision from escen_private.portal_revision r where singleton for update;
  if p_expected_revision is null or revision <> p_expected_revision then
    raise exception 'CONCURRENT_UPDATE' using errcode = 'PT409';
  end if;
  select * into enrollment from escen.enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'Inscription introuvable' using errcode = '23503'; end if;
  select * into source from escen.academic_offerings where id = enrollment.offering_id;
  if not exists (
    select 1 from escen.accounts a join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
      and r.active and r.code = p_role_code and r.code in ('DA','LOG','IT')
      and p.code = 'student.correction.manage'
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null
      and (g.academic_year_id is null or g.academic_year_id = source.academic_year_id)
  ) then raise exception 'Responsable scolaire habilité requis' using errcode = '42501'; end if;
  select * into ticket from escen.support_tickets where id = p_ticket_id for update;
  if not found or ticket.status not in ('OPEN','IN_PROGRESS') or ticket.academic_year_id is distinct from source.academic_year_id
    or not exists (select 1 from escen.support_categories c where c.id = ticket.category_id and c.code = 'STUDENT_PROGRAM_CORRECTION')
    or not exists (select 1 from escen.accounts a join escen.students s on s.person_id = a.person_id
      where a.id = ticket.author_id and s.id = enrollment.student_id and s.archived_at is null)
  then raise exception 'Demande scolaire incompatible avec cette inscription' using errcode = '23514'; end if;
  if enrollment.status not in ('INSCRIT','REINSCRIT')
    or not exists (select 1 from escen.academic_years y where y.id = source.academic_year_id and y.status = 'OUVERTE')
  then raise exception 'Inscription active et année ouverte requises' using errcode = '23514'; end if;
  select * into target from escen.academic_offerings where id = p_offering_id;
  if not found or target.id = source.id or target.academic_year_id <> source.academic_year_id
    or target.site_id <> source.site_id or to_jsonb(target)->>'archived_at' is not null
    or not exists (select 1 from escen.group_offerings go join escen.groups g on g.id = go.group_id
      where go.offering_id = target.id and go.group_id = p_group_id
        and to_jsonb(g)->>'archived_at' is null and to_jsonb(go)->>'archived_at' is null)
  then raise exception 'Choisir une formation et un groupe actifs de la même année et du même site' using errcode = '23514'; end if;
  previous_actor := current_setting('escen.actor_id', true);
  perform set_config('escen.actor_id', p_actor_id::text, true);
  insert into escen.student_program_corrections(ticket_id, enrollment_id, previous_offering_id, offering_id,
    group_id, actor_id, reason, enrollment_before, membership_before)
  values (ticket.id, enrollment.id, source.id, target.id, p_group_id, p_actor_id, btrim(p_reason),
    to_jsonb(enrollment), coalesce((select jsonb_agg(to_jsonb(eg)) from escen.enrollment_groups eg where eg.enrollment_id = enrollment.id), '[]'::jsonb));
  update escen.enrollment_groups set historical_only = true,
    changed_by = p_actor_id, reason = btrim(p_reason)
  where enrollment_id = enrollment.id and offering_id = source.id and not historical_only;
  -- La capture AFTER UPDATE ajoute le nouveau contexte avant la nouvelle affectation.
  update escen.enrollments set offering_id = target.id where id = enrollment.id;
  select * into membership from escen.enrollment_groups
  where enrollment_id = enrollment.id and offering_id = target.id and group_id = p_group_id
    and valid_until is null and (valid_from is null or valid_from <= current_date)
  order by valid_from desc nulls last, id limit 1;
  if membership.id is not null then
    update escen.enrollment_groups set historical_only = false,
      changed_by = p_actor_id, reason = btrim(p_reason) where id = membership.id;
  else
    insert into escen.enrollment_groups(enrollment_id, offering_id, group_id, valid_from, changed_by, reason)
    select enrollment.id, target.id, p_group_id, coalesce(enrollment.enrolled_on, y.starts_on),
      p_actor_id, btrim(p_reason) from escen.academic_years y where y.id = target.academic_year_id;
  end if;
  update escen.support_tickets set status = 'RESOLVED', assigned_to = p_actor_id where id = ticket.id;
  insert into escen.support_messages(ticket_id, author_id, body)
  values (ticket.id, p_actor_id, 'Correction de formation enregistrée : ' || btrim(p_reason));
  update escen_private.portal_revision r set revision = r.revision + 1, changed_at = now(), actor_id = p_actor_id
  where singleton returning r.revision into revision;
  perform set_config('escen.actor_id', coalesce(previous_actor, ''), true);
  return revision;
end $$;

create function public.escen_student_program_correction(
  p_actor_id uuid, p_role_code text, p_expected_revision bigint, p_ticket_id uuid,
  p_enrollment_id uuid, p_offering_id uuid, p_group_id uuid, p_reason text
) returns bigint language sql security definer set search_path = pg_catalog as $$
  select escen.correct_student_program(p_actor_id, p_role_code, p_expected_revision,
    p_ticket_id, p_enrollment_id, p_offering_id, p_group_id, p_reason);
$$;
revoke all on escen.enrollment_offering_contexts from public;
revoke all on function escen_private.capture_enrollment_offering() from public;
revoke all on function escen_private.require_current_enrollment_offering() from public;
revoke all on escen.student_program_corrections from public;
revoke all on function escen.correct_student_program(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.escen_student_program_correction(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from public;
do $$ declare browser_role text; begin
  foreach browser_role in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = browser_role) then
      execute format('revoke all on escen.enrollment_offering_contexts from %I', browser_role);
      execute format('revoke all on function escen_private.capture_enrollment_offering() from %I', browser_role);
      execute format('revoke all on function escen_private.require_current_enrollment_offering() from %I', browser_role);
      execute format('revoke all on escen.student_program_corrections from %I', browser_role);
      execute format('revoke all on function escen.correct_student_program(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from %I', browser_role);
      execute format('revoke all on function public.escen_student_program_correction(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from %I', browser_role);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on escen.enrollment_offering_contexts from service_role;
    revoke all on escen.student_program_corrections from service_role;
    grant execute on function escen.correct_student_program(uuid,text,bigint,uuid,uuid,uuid,uuid,text),
      public.escen_student_program_correction(uuid,text,bigint,uuid,uuid,uuid,uuid,text) to service_role;
  end if;
end $$;
commit;
