-- PROPOSITION NON APPLIQUEE : seconde étape, à approuver séparément.
-- Correction d'une erreur d'inscription sans activité pédagogique ni finance.
-- Les autres dossiers restent ouverts pour régularisation explicite.
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

-- La FK reste vérifiée ; seul son contrôle est différé pendant la commande.
alter table escen.enrollment_groups
  alter constraint enrollment_groups_enrollment_id_offering_id_fkey deferrable initially immediate;

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
      and c.membership_before->>'id' = old.id::text
      and c.previous_offering_id = old.offering_id and c.offering_id = new.offering_id
      and c.group_id = new.group_id and c.actor_id = new.changed_by
      and (to_jsonb(new) - 'offering_id' - 'group_id' - 'changed_by' - 'reason')
        = (to_jsonb(old) - 'offering_id' - 'group_id' - 'changed_by' - 'reason')
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
  if enrollment.status not in ('INSCRIT','REINSCRIT') or coalesce((to_jsonb(enrollment)->>'double_degree')::boolean, false)
    or not exists (select 1 from escen.academic_years y where y.id = source.academic_year_id and y.status = 'OUVERTE')
  then raise exception 'Inscription active et année ouverte requises ; double diplomation à régulariser séparément' using errcode = '23514'; end if;
  select * into target from escen.academic_offerings where id = p_offering_id;
  if not found or target.id = source.id or target.academic_year_id <> source.academic_year_id
    or target.site_id <> source.site_id or to_jsonb(target)->>'archived_at' is not null
    or not exists (select 1 from escen.group_offerings go join escen.groups g on g.id = go.group_id
      where go.offering_id = target.id and go.group_id = p_group_id
        and to_jsonb(g)->>'archived_at' is null and to_jsonb(go)->>'archived_at' is null)
  then raise exception 'Choisir une formation et un groupe actifs de la même année et du même site' using errcode = '23514'; end if;
  if exists (select 1 from escen.financial_contracts where enrollment_id = enrollment.id)
    or exists (select 1 from escen.payments where enrollment_id = enrollment.id)
    or exists (select 1 from escen.attendances where enrollment_id = enrollment.id)
    or exists (select 1 from escen.evaluation_candidates where enrollment_id = enrollment.id)
    or exists (select 1 from escen.jury_decisions where enrollment_id = enrollment.id)
    or exists (select 1 from escen.generated_documents where enrollment_id = enrollment.id)
    or exists (select 1 from escen.enrollment_groups where enrollment_id = enrollment.id and valid_until is not null)
    or (select count(*) from escen.enrollment_groups where enrollment_id = enrollment.id) > 1
  then raise exception 'Notes, présences, documents, finance ou historique de groupes : régularisation nécessaire ; demande maintenue ouverte' using errcode = '23514'; end if;
  select * into membership from escen.enrollment_groups where enrollment_id = enrollment.id;
  previous_actor := current_setting('escen.actor_id', true);
  perform set_config('escen.actor_id', p_actor_id::text, true);
  insert into escen.student_program_corrections(ticket_id, enrollment_id, previous_offering_id, offering_id,
    group_id, actor_id, reason, enrollment_before, membership_before)
  values (ticket.id, enrollment.id, source.id, target.id, p_group_id, p_actor_id, btrim(p_reason),
    to_jsonb(enrollment), case when membership.id is not null then to_jsonb(membership) end);
  set constraints escen.enrollment_groups_enrollment_id_offering_id_fkey deferred;
  update escen.enrollments set offering_id = target.id where id = enrollment.id;
  if membership.id is not null then
    update escen.enrollment_groups set offering_id = target.id, group_id = p_group_id,
      changed_by = p_actor_id, reason = btrim(p_reason) where id = membership.id;
  else
    insert into escen.enrollment_groups(enrollment_id, offering_id, group_id, valid_from, changed_by, reason)
    select enrollment.id, target.id, p_group_id, coalesce(enrollment.enrolled_on, y.starts_on), p_actor_id, btrim(p_reason)
    from escen.academic_years y where y.id = target.academic_year_id;
  end if;
  set constraints escen.enrollment_groups_enrollment_id_offering_id_fkey immediate;
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
revoke all on escen.student_program_corrections from public;
revoke all on function escen.correct_student_program(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.escen_student_program_correction(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from public;
do $$ declare browser_role text; begin
  foreach browser_role in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = browser_role) then
      execute format('revoke all on escen.student_program_corrections from %I', browser_role);
      execute format('revoke all on function escen.correct_student_program(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from %I', browser_role);
      execute format('revoke all on function public.escen_student_program_correction(uuid,text,bigint,uuid,uuid,uuid,uuid,text) from %I', browser_role);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on escen.student_program_corrections from service_role;
    grant execute on function escen.correct_student_program(uuid,text,bigint,uuid,uuid,uuid,uuid,text),
      public.escen_student_program_correction(uuid,text,bigint,uuid,uuid,uuid,uuid,text) to service_role;
  end if;
end $$;
commit;
