import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const directory = resolve('.tmp/legacy-database');
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`,'utf8'));
const sourceText = await readFile(`${directory}/legacy-rows.jsonl`,'utf8');
if (createHash('sha256').update(sourceText).digest('hex') !== manifest.file_sha256['legacy-rows.jsonl']) throw new Error('Empreinte des lignes source incorrecte.');
const rows = sourceText.split('\n').filter(Boolean).map(line => JSON.parse(line));
const issues = (await readFile(`${directory}/quarantine-issues.jsonl`,'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line));
const issueKeys = new Set(issues.map(item => `${item.source_table}:${item.source_id}`));
const source = new Map(rows.map(item => [`${item.source_table}:${item.source_id}`,item]));
const roleTargets = new Map([
  ['etudiant','STUD'],['enseignant','ENS'],['directeur-general','DG'],['directeur-academique','DA'],
  ['surveillant','SURV'],['responsable-du-site','SITE'],['directeur-general-adjoint','DGA'],
  ['logiticien-academique','LOG'],['responsable-administratif-et-financier','RAF'],
  ['responsable-marketing','MKT'],['informaticien','IT'],
]);
const rolesBySourceId = new Map(rows.filter(row => row.source_table === 'roles').map(row => [row.source_id,row.payload]));
const idFor = (table,sourceId) => {
  const digest = createHash('sha256').update(`${manifest.sql_sha256}:${table}:${sourceId}`).digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0,16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const isoDate = value => {
  if (!value) return null;
  const text = String(value).slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0,10) !== text ? null : text;
};
const people = []; const students = []; const accounts = []; const memberships = [];
for (const row of rows.filter(item => item.source_table === 'users' || item.source_table === 'etudiants')) {
  const table = row.source_table; const p = row.payload;
  if (!p.prenom?.trim() || !p.nom?.trim()) throw new Error(`Identité incomplète dans ${table} ; import interrompu.`);
  const personId = idFor(table,row.source_id);
  const accountId = idFor(`${table}_account`,row.source_id);
  const dateOfBirth = isoDate(p.date_naissance);
  people.push({ id:personId,firstname:p.prenom.trim(),lastname:p.nom.trim(),maiden_name:p.nom_jeune_fille || null,
    birth_date:dateOfBirth,birth_place:p.lieu_naissance || null,nationality:p.nationalite || null,
    gender:p.genre || null,email:p.email || null,phone:p.tel || null,source_table:table,source_id:row.source_id });
  accounts.push({ id:accountId,person_id:personId,active:false,source_table:table,source_id:row.source_id });
  if (table === 'etudiants') {
    if (!p.matricule?.trim()) throw new Error('Matricule étudiant absent ; import interrompu.');
    students.push({ id:idFor('etudiants',row.source_id),person_id:personId,matricule:p.matricule.trim(),source_table:'etudiants',source_id:row.source_id });
  }
}
const userSourceIds = new Set(rows.filter(row => row.source_table === 'users').map(row => row.source_id));
const studentSourceIds = new Set(rows.filter(row => row.source_table === 'etudiants').map(row => row.source_id));
for (const row of rows.filter(item => item.source_table === 'role_user')) {
  if (issueKeys.has(`role_user:${row.source_id}`)) continue;
  const p = row.payload;
  const role = rolesBySourceId.get(String(p.role_id));
  const targetRole = roleTargets.get(String(role?.slug));
  const isStudent = String(p.user_type).toLowerCase().includes('etudiant');
  const principalTable = isStudent ? 'etudiants' : 'users';
  const principalId = String(p.user_id);
  if (!targetRole || !(isStudent ? studentSourceIds : userSourceIds).has(principalId) || role?.active !== '1') continue;
  const legacy = source.get(`role_user:${row.source_id}`);
  if (!legacy || legacy.status === 'QUARANTINED') continue;
  memberships.push({ id:idFor('role_grants',row.source_id),source_id:row.source_id,source_role_id:String(p.role_id),
    target_role_code:targetRole,account_id:idFor(`${principalTable}_account`,principalId),source_table:'role_user',
    reason:`Reprise exacte de l’attribution source « ${role.slug} » ; compte conservé inactif, réactivation Auth non effectuée.` });
}
const roleSources = [];
for (const row of rows.filter(item => item.source_table === 'roles')) {
  const targetRole = roleTargets.get(String(row.payload.slug));
  if (targetRole) roleSources.push({ source_id:row.source_id,source_table:'roles',target_role_code:targetRole });
}
const outputs = { 'identity-profiles.jsonl':people,'identity-accounts.jsonl':accounts,'identity-students.jsonl':students,
  'identity-role-grants.jsonl':memberships,'identity-roles.jsonl':roleSources };
for (const [filename,items] of Object.entries(outputs)) {
  const path = `${directory}/${filename}`;
  await mkdir(dirname(path),{ recursive:true,mode:0o700 });
  await writeFile(path,items.map(item => JSON.stringify(item)).join('\n')+'\n',{ mode:0o600 });
}
const summary = { archive_sha256:manifest.archive_sha256,sql_sha256:manifest.sql_sha256,profiles:people.length,accounts:accounts.length,
  students:students.length,activeSourceRoleAssignments:memberships.length,mappedSourceRoles:roleSources.length,
  accountsAuthActivated:0,passwordsTransferred:0,tokensTransferred:0,studentBlockedSourceRows:rows.filter(row => row.source_table === 'etudiants' && row.payload.statut === 'bloque').length,
  sourceRoleAssignmentsUnresolved:rows.filter(row => row.source_table === 'role_user').length-memberships.length };
await writeFile(`${directory}/identity-preparation-report.json`,JSON.stringify(summary,null,2)+'\n',{ mode:0o600 });
console.log(JSON.stringify(summary));
