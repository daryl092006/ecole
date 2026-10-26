import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const stable = (digest, key) => {
  const bytes = Buffer.from(hash(`${digest}:OPERATIONAL_REFERENCES_V1:${key}`).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const keyOf = (row, index) => String(row.id ?? row.email ?? index);
const missing = value => value == null || value === '' ? null : value;
const secret = /password|remember_token|session_token|draft_token|qr_token|access_token|refresh_token|api_key|secret|^token$|authorization/i;
function sanitized(value) {
  if (Array.isArray(value)) return value.map(sanitized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secret.test(key) ? '[REDACTED]' : sanitized(item)]));
  if (typeof value === 'string' && /^[\[{]/.test(value)) {
    try { return JSON.stringify(sanitized(JSON.parse(value))); } catch { /* A plain string remains a plain string. */ }
  }
  return value;
}
export const operationalTables = ['people', 'students', 'staff', 'teachers', 'subjects', 'annual_fee_schedules'];

/** First additive lot only. No inferred enrollment, account, role, mark or payment. */
export function buildOperationalReferences({ source, baseline, snapshot, index, archiveSha256, sourceName, now = new Date() }) {
  for (const digest of [source.sql_sha256, baseline.sql_sha256, archiveSha256]) assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(source.sql_sha256, baseline.sql_sha256, 'La source est déjà le lot de référence.');
  assert.ok(index.batches.some(batch => batch.sql_sha256 === baseline.sql_sha256), 'Lot initial non confirmé.');
  assert.ok(!index.batches.some(batch => batch.sql_sha256 === source.sql_sha256), 'Sauvegarde déjà préparée en base : reprendre son état, sans second import.');
  const t = snapshot.tables;
  for (const table of [...operationalTables, 'accounts', 'roles', 'role_grants', 'permissions', 'role_permissions', 'academic_years', 'levels', 'programs']) assert.ok(Array.isArray(t[table]), `Collection absente : ${table}`);
  const current = grant => Date.parse(grant.valid_from) <= now.getTime() && (!grant.valid_until || Date.parse(grant.valid_until) > now.getTime());
  const it = t.roles.find(role => role.code === 'IT' && role.active);
  const grants = t.role_grants.filter(grant => grant.role_id === it?.id && current(grant) && !grant.site_id && !grant.group_id && !grant.academic_year_id);
  const actors = t.accounts.filter(account => account.active && !account.archived_at && account.auth_user_id && grants.some(grant => grant.account_id === account.id)
    && t.people.some(person => person.id === account.person_id && !person.archived_at));
  assert.equal(actors.length, 1, 'Un auteur IT global unique est requis.');
  for (const code of ['student.update', 'staff.manage', 'academic.structure.manage']) {
    const permission = t.permissions.find(row => row.code === code);
    assert.ok(permission && t.role_permissions.some(row => row.role_id === it.id && row.permission_id === permission.id), `Permission absente : ${code}`);
  }
  const actor = actors[0];
  const resolve = (table, id, target) => {
    const matches = index.mappings.filter(row => row.source_table === table && row.source_id === String(id) && row.target_table === target);
    const ids = [...new Set(matches.map(row => row.target_id))];
    assert.equal(ids.length, 1, `Correspondance absente ou ambiguë : ${table}/${id}/${target}`);
    const result = t[target].find(row => row.id === ids[0]);
    assert.ok(result && !result.archived_at, `Référence absente ou archivée : ${target}`);
    return result;
  };
  const sourceRows = Object.entries(source.tables).flatMap(([name, rows]) => rows.map((row, i) => {
    const payload = sanitized(row);
    if (['current_envs', 'configurations', 'jobs', 'failed_jobs'].includes(name)) for (const key of ['value', 'valeur', 'options', 'payload']) if (key in payload) payload[key] = '[REDACTED]';
    return { id: stable(source.sql_sha256, `source:${name}:${keyOf(row, i)}`), source_table: name, source_id: keyOf(row, i), payload };
  }));
  assert.equal(new Set(sourceRows.map(row => `${row.source_table}:${row.source_id}`)).size, sourceRows.length, 'Clé source répétée.');
  const changes = []; const mappings = []; const deferred = [];
  const evidence = (table, row) => sourceRows.find(item => item.source_table === table && item.source_id === String(row.id));
  const add = (table, sourceTable, row, record, suffix = '') => {
    assert.ok(operationalTables.includes(table));
    const id = stable(source.sql_sha256, `${table}:${sourceTable}:${row.id}${suffix}`);
    assert.ok(!t[table].some(existing => existing.id === id), 'Identifiant cible déjà présent.');
    changes.push({ table, operation: 'insert', record: { id, ...record } });
    mappings.push({ row_id: evidence(sourceTable, row).id, target_table: table, target_id: id });
    return id;
  };
  const added = name => {
    const before = new Set((baseline.tables[name] || []).map(keyOf));
    return (source.tables[name] || []).filter((row, i) => !before.has(keyOf(row, i)));
  };
  const reason = 'Reprise opérationnelle vérifiée de la sauvegarde du 26 octobre 2026 ; correspondance source exacte.';
  for (const sourceTable of ['etudiants', 'users']) for (const row of added(sourceTable)) {
    const roles = source.tables.role_user.filter(grant => grant.user_id === row.id && String(grant.user_type).replaceAll('\\', '').endsWith(sourceTable === 'users' ? 'User' : 'Etudiant'));
    if (sourceTable === 'users' && !roles.some(grant => source.tables.roles.some(role => role.id === grant.role_id && role.slug === 'enseignant'))) {
      deferred.push({ table: sourceTable, id: row.id, code: 'PERSONNEL_FUNCTION_REVIEW' }); continue;
    }
    assert.ok(row.prenom?.trim() && row.nom?.trim(), 'Identité source incomplète.');
    const email = missing(row.email);
    assert.ok(!email || ![...t.people, ...changes.filter(c => c.table === 'people').map(c => c.record)].some(person => person.email?.trim().toLowerCase() === email.trim().toLowerCase()), 'Email déjà présent : rapprochement explicite requis.');
    const date = missing(row.date_naissance)?.slice(0, 10) ?? null;
    assert.ok(!date || /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date).toISOString().slice(0, 10) === date, 'Date source invalide.');
    const personId = add('people', sourceTable, row, { firstname: row.prenom, lastname: row.nom, maiden_name: missing(row.nom_jeune_fille), birth_date: date,
      birth_place: missing(row.lieu_naissance), nationality: missing(row.nationalite), gender: missing(row.genre), email, phone: missing(row.tel) });
    if (sourceTable === 'etudiants') {
      assert.ok(row.matricule?.trim() && !t.students.some(student => student.matricule.toLowerCase() === row.matricule.toLowerCase()), 'Matricule absent ou déjà présent.');
      add('students', sourceTable, row, { person_id: personId, matricule: row.matricule, reason });
    } else {
      const staffId = stable(source.sql_sha256, `staff:${sourceTable}:${row.id}`);
      add('staff', sourceTable, row, { person_id: personId, employee_number: `INT-${staffId}`, reason });
      add('teachers', sourceTable, row, { staff_id: staffId, specialty: null, active: true, reason });
    }
    deferred.push({ table: sourceTable, id: row.id, code: 'AUTH_PROVISIONING_SEPARATE' });
  }
  for (const row of added('frais_scolarites')) {
    const year = resolve('annee_scolaires', row.annee_scolaire_id, 'academic_years');
    const level = row.niveau_id == null ? null : resolve('niveaux', row.niveau_id, 'levels');
    const program = row.filiere_id == null ? null : resolve('filieres', row.filiere_id, 'programs');
    const record = { academic_year_id: year.id, category: 'SCOLARITE', level_id: level?.id ?? null, program_id: program?.id ?? null,
      amount: Number(row.montant), delivery_mode: missing(row.mode_formation), reason };
    assert.ok(Number.isSafeInteger(record.amount) && record.amount >= 0);
    assert.ok(!row.genre, 'Tarif lié au genre : correspondance métier requise.');
    assert.ok(![...t.annual_fee_schedules, ...changes.filter(c => c.table === 'annual_fee_schedules').map(c => c.record)].some(existing => !existing.archived_at && ['academic_year_id', 'category', 'level_id', 'program_id', 'delivery_mode'].every(key => (existing[key] ?? null) === record[key])), 'Variante tarifaire déjà présente : aucun remplacement automatique.');
    add('annual_fee_schedules', 'frais_scolarites', row, record);
  }
  for (const row of added('matieres')) {
    const uses = source.tables.unite_valeurs.filter(uv => uv.matiere_id === row.id);
    const years = [...new Set(uses.map(uv => uv.annee_scolaire_id))];
    if (years.length !== 1) { deferred.push({ table: 'matieres', id: row.id, code: 'SUBJECT_YEAR_AMBIGUOUS' }); continue; }
    const year = resolve('annee_scolaires', years[0], 'academic_years');
    assert.ok(row.code?.trim() && row.nom?.trim());
    assert.ok(!t.subjects.some(subject => subject.academic_year_id === year.id && subject.code === row.code), 'Matière annuelle déjà présente.');
    add('subjects', 'matieres', row, { academic_year_id: year.id, code: row.code, name: row.nom, active: true });
    for (const uv of uses) if (uv.filiere_id != null && !index.mappings.some(m => m.source_table === 'filieres' && m.source_id === uv.filiere_id && m.target_table === 'programs')) deferred.push({ table: 'unite_valeurs', id: uv.id, code: 'PROGRAM_SOURCE_MISSING' });
  }
  assert.ok(changes.length > 0 && changes.length <= 100);
  return { version: 1, sourceName, sourceSha256: source.sql_sha256, archiveSha256, baselineSha256: baseline.sql_sha256,
    expectedRevision: snapshot.revision, actorId: actor.id, actorGrantId: grants.find(grant => grant.account_id === actor.id).id,
    batchId: stable(source.sql_sha256, 'batch'), runId: stable(source.sql_sha256, 'run'), sourceTotalRows: sourceRows.length,
    // Only evidence for the active records in this lot is transmitted. The ZIP
    // remains the complete source; a later lot hydrates its own source evidence.
    sourceRows: sourceRows.filter(row => mappings.some(mapping => mapping.row_id === row.id)), changes, mappings, deferred,
    counts: Object.fromEntries(operationalTables.map(table => [table, changes.filter(change => change.table === table).length])) };
}

/** One statement: a late failed check rolls back provenance, business rows, audit and revision. */
export function operationalReferenceSql(plan) {
  assert.equal(plan.version, 1);
  assert.ok(plan.changes.length > 0 && plan.changes.length <= 100);
  assert.ok(plan.changes.every(change => operationalTables.includes(change.table) && change.operation === 'insert'));
  const literal = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  return `do $operational_references$
declare
  plan jsonb := ${literal(plan)};
  author uuid := (plan->>'actorId')::uuid;
  current_revision bigint;
  target jsonb;
begin
  perform set_config('lock_timeout','5s',true);
  select revision into current_revision from escen_private.portal_revision where singleton for update;
  if current_revision is distinct from (plan->>'expectedRevision')::bigint then raise exception 'CONCURRENT_UPDATE'; end if;
  lock table escen.accounts, escen.people, escen.roles, escen.role_grants, escen.permissions, escen.role_permissions in share mode;
  if not exists(select 1 from escen.accounts a join escen.people p on p.id=a.person_id
    join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id
    where a.id=author and a.active and a.archived_at is null and a.auth_user_id is not null and p.archived_at is null
      and g.id=(plan->>'actorGrantId')::uuid and r.code='IT' and r.active
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
      and (select count(distinct permission.code) from escen.role_permissions rp join escen.permissions permission on permission.id=rp.permission_id
        where rp.role_id=r.id and permission.code in ('student.update','staff.manage','academic.structure.manage'))=3
  ) then raise exception 'Auteur IT global non autorisé'; end if;
  if exists(select 1 from escen_private.import_batches where sql_sha256=plan->>'sourceSha256') then raise exception 'Sauvegarde déjà reprise : préparer une suite explicite'; end if;
  if not exists(select 1 from escen_private.import_batches where sql_sha256=plan->>'baselineSha256') then raise exception 'Source initiale absente'; end if;
  -- Identity collisions are checked again under lock, not just during preparation.
  for target in select value from jsonb_array_elements(plan->'changes') where value->>'table'='people' loop
    if nullif(target->'record'->>'email','') is not null and exists(select 1 from escen.people
      where lower(btrim(email))=lower(btrim(target->'record'->>'email'))) then raise exception 'Identité déjà présente'; end if;
  end loop;
  insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows)
    values((plan->>'batchId')::uuid,plan->>'sourceName',plan->>'archiveSha256',plan->>'sourceSha256',(plan->>'sourceTotalRows')::integer);
  insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload,status)
    select (r->>'id')::uuid,(plan->>'batchId')::uuid,r->>'source_table',r->>'source_id',r->'payload','PENDING'
    from jsonb_array_elements(plan->'sourceRows') r;
  insert into escen_private.import_runs(id,batch_id,run_code,actor_account_id,counts)
    values((plan->>'runId')::uuid,(plan->>'batchId')::uuid,'OPERATIONAL_REFERENCES_V1',author,plan->'counts');
  current_revision:=public.escen_backend_transaction(author,current_revision,plan->'changes');
  insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
    select (r->>'row_id')::uuid,r->>'target_table',(r->>'target_id')::uuid,'SOURCE_EXACT',(plan->>'runId')::uuid,
      'Reprise dans les tables métier actives ; source exacte du 26 octobre 2026.' from jsonb_array_elements(plan->'mappings') r;
  update escen_private.legacy_rows l set status='MAPPED' where l.batch_id=(plan->>'batchId')::uuid
    and exists(select 1 from escen_private.source_mappings m where m.row_id=l.id);
  for target in select value from jsonb_array_elements(plan->'changes') loop
    if (select count(*) from escen_private.audit_events where entity_id=(target->'record'->>'id')::uuid
      and table_name=target->>'table' and action='INSERT' and actor_id=author and old_value is null)<>1 then
      raise exception 'Audit incomplet';
    end if;
  end loop;
  if current_revision<>(plan->>'expectedRevision')::bigint+1 then raise exception 'Révision inattendue'; end if;
end;
$operational_references$;
`;
}
