import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const identity = z.object({ accountId: z.uuid(), personId: z.uuid(), authUserId: z.uuid(), grantId: z.uuid() }).strict();
const planSchema = z.object({
  version: z.literal(1), createdAt: z.iso.datetime(), expectedRevision: z.number().int().nonnegative(),
  actor: identity,
  targets: z.array(identity.extend({ staffId: z.uuid(), teacherId: z.uuid() })).length(19),
}).strict();

const current = (grant, now) => Date.parse(grant.valid_from) <= now
  && (!grant.valid_until || Date.parse(grant.valid_until) > now);

export function missingTeacherAccounts(snapshot, now = Date.now()) {
  const { accounts, people, roles, role_grants: grants, staff, teachers } = snapshot.tables;
  if (![accounts, people, roles, grants, staff, teachers].every(Array.isArray)) throw new Error('Snapshot des identités incomplet.');
  const role = roles.find(row => row.code === 'ENS' && row.active && row.name === 'Enseignant');
  if (!role) throw new Error('Rôle Enseignant absent ou incompatible.');
  return accounts.filter(account => account.active && !account.archived_at
    && grants.some(grant => grant.account_id === account.id && grant.role_id === role.id && current(grant, now))
    && !teachers.some(teacher => staff.some(member => member.id === teacher.staff_id && member.person_id === account.person_id)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function validateRecoveryPlan(value) {
  const plan = planSchema.parse(value);
  for (const field of ['accountId', 'personId', 'authUserId', 'grantId', 'staffId', 'teacherId']) {
    if (new Set(plan.targets.map(row => row[field])).size !== 19) throw new Error(`Doublon de ${field} dans le lot.`);
  }
  if (plan.targets.some(row => row.accountId === plan.actor.accountId)) throw new Error('Le compte auteur ne peut pas être une cible.');
  return plan;
}

export function buildRecoveryPlan(snapshot, auditSnapshot, now = new Date()) {
  const timestamp = now.getTime();
  const approved = missingTeacherAccounts(auditSnapshot, Date.parse(auditSnapshot.checkedAt));
  const targets = missingTeacherAccounts(snapshot, timestamp);
  if (approved.length !== 19 || JSON.stringify(approved.map(row => row.id)) !== JSON.stringify(targets.map(row => row.id))) {
    throw new Error('Les 19 comptes audités ont changé : un nouvel examen est nécessaire.');
  }
  const { tables } = snapshot;
  const it = tables.roles.find(role => role.code === 'IT' && role.name === 'Informaticien' && role.active);
  const staffPermission = tables.permissions.find(permission => permission.code === 'staff.manage');
  if (!it || !tables.role_permissions.some(link => link.role_id === it.id && link.permission_id === staffPermission?.id)) {
    throw new Error('Permission de gestion du personnel absente pour IT.');
  }
  const authorizations = tables.role_grants.filter(grant => grant.role_id === it.id && current(grant, timestamp)
    && !grant.site_id && !grant.group_id && !grant.academic_year_id);
  const actors = tables.accounts.filter(account => account.active && !account.archived_at && account.auth_user_id
    && tables.people.some(person => person.id === account.person_id && !person.archived_at)
    && authorizations.some(grant => grant.account_id === account.id));
  if (actors.length !== 1) throw new Error('Un unique compte IT global doit être identifié pour proposer l’auteur de la correction.');
  const actor = actors[0];
  const teacherRole = tables.roles.find(role => role.code === 'ENS');
  return validateRecoveryPlan({
    version: 1, createdAt: now.toISOString(), expectedRevision: snapshot.revision,
    actor: { accountId: actor.id, personId: actor.person_id, authUserId: actor.auth_user_id,
      grantId: authorizations.find(grant => grant.account_id === actor.id).id },
    targets: targets.map(account => {
      const original = approved.find(row => row.id === account.id);
      const person = tables.people.find(row => row.id === account.person_id);
      const grant = tables.role_grants.find(row => row.account_id === account.id && row.role_id === teacherRole.id && current(row, timestamp));
      if (!person || person.archived_at || !account.auth_user_id || original.person_id !== account.person_id
        || original.auth_user_id !== account.auth_user_id || tables.staff.some(row => row.person_id === person.id)) {
        throw new Error('Une identité, une liaison Auth ou un dossier personnel a changé depuis l’audit.');
      }
      const originalGrant = auditSnapshot.tables.role_grants.find(row => row.id === grant.id && row.account_id === original.id);
      if (!originalGrant || !grant.legacy_source_row_id || originalGrant.legacy_source_row_id !== grant.legacy_source_row_id) {
        throw new Error('Provenance de l’attribution ENS non confirmée.');
      }
      return { accountId: account.id, personId: person.id, authUserId: account.auth_user_id, grantId: grant.id,
        staffId: randomUUID(), teacherId: randomUUID() };
    }),
  });
}

export function recoveryChanges(value) {
  const plan = validateRecoveryPlan(value);
  return plan.targets.flatMap(target => {
    const reason = `Régularisation des profils enseignants audités le 23/10/2026 ; compte ${target.accountId} ; attribution ENS ${target.grantId}.`;
    return [
      { table: 'staff', operation: 'insert', record: { id: target.staffId, person_id: target.personId,
        employee_number: `INT-${target.staffId}`, reason } },
      { table: 'teachers', operation: 'insert', record: { id: target.teacherId, staff_id: target.staffId,
        specialty: null, active: true, reason } },
    ];
  });
}

export function recoverySql(value) {
  const plan = validateRecoveryPlan(value);
  // One SQL statement is one transaction, including the postconditions. No schema changes.
  const literal = input => `'${JSON.stringify(input).replaceAll("'", "''")}'::jsonb`;
  return `-- Lot préparé uniquement ; application distante soumise à validation explicite.
-- 19 dossiers du personnel + 19 profils enseignants ; aucun compte ni rôle modifié.
do $teacher_profile_recovery$
declare
  plan jsonb := ${literal(plan)};
  changes jsonb := ${literal(recoveryChanges(plan))};
  target jsonb;
  current_revision bigint;
  new_revision bigint;
  author uuid := (plan->'actor'->>'accountId')::uuid;
begin
  perform set_config('lock_timeout', '5s', true);
  select revision into current_revision from escen_private.portal_revision where singleton for update;
  if current_revision <> (plan->>'expectedRevision')::bigint then
    raise exception 'CONCURRENT_UPDATE : préparer de nouveau le lot';
  end if;
  -- Freeze the identities and authorizations while validating and writing the lot.
  lock table escen.accounts, escen.people, escen.roles, escen.role_grants,
    escen.role_permissions, escen.permissions in share mode;
  if not exists (
    select 1 from escen.accounts a join escen.people p on p.id=a.person_id
    join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id
    join escen.role_permissions rp on rp.role_id=r.id join escen.permissions permission on permission.id=rp.permission_id
    where a.id=author and a.person_id=(plan->'actor'->>'personId')::uuid
      and a.auth_user_id=(plan->'actor'->>'authUserId')::uuid
      and a.active and a.archived_at is null and p.archived_at is null
      and g.id=(plan->'actor'->>'grantId')::uuid and r.code='IT' and r.name='Informaticien' and r.active
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
      and permission.code='staff.manage'
  ) then raise exception 'Auteur IT global non autorisé'; end if;
  for target in select value from jsonb_array_elements(plan->'targets') loop
    if not exists (
      select 1 from escen.accounts a join escen.people p on p.id=a.person_id
      join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id
      where a.id=(target->>'accountId')::uuid and a.person_id=(target->>'personId')::uuid
        and a.auth_user_id=(target->>'authUserId')::uuid and a.active and a.archived_at is null and p.archived_at is null
        and g.id=(target->>'grantId')::uuid and r.code='ENS' and r.name='Enseignant' and r.active
        and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
    ) then raise exception 'Identité ou attribution ENS modifiée : %', target->>'accountId'; end if;
    if exists(select 1 from escen.staff where person_id=(target->>'personId')::uuid) then
      raise exception 'Dossier déjà présent : %', target->>'accountId';
    end if;
  end loop;
  new_revision := public.escen_backend_transaction(author, current_revision, changes);
  if new_revision <> current_revision+1 then raise exception 'Révision après correction incohérente'; end if;
  for target in select value from jsonb_array_elements(plan->'targets') loop
    if not exists (
      select 1 from escen.staff s join escen.teachers t on t.staff_id=s.id
      where s.id=(target->>'staffId')::uuid and s.person_id=(target->>'personId')::uuid
        and s.archived_at is null and t.id=(target->>'teacherId')::uuid and t.active and t.specialty is null
    ) then raise exception 'Rattachement après correction incohérent'; end if;
    if public.escen_account_session((target->>'authUserId')::uuid)->'teacher'->>'id' is distinct from target->>'teacherId' then
      raise exception 'Profil de session non rétabli';
    end if;
    if (select count(*) from escen_private.audit_events e where e.actor_id=author and e.action='INSERT'
      and e.reason is not null and e.old_value is null and e.new_value->>'reason'=e.reason
      and ((e.table_name='staff' and e.entity_id=(target->>'staffId')::uuid)
        or (e.table_name='teachers' and e.entity_id=(target->>'teacherId')::uuid))) <> 2 then
      raise exception 'Audit incomplet : annulation du lot';
    end if;
  end loop;
end;
$teacher_profile_recovery$;
`;
}
