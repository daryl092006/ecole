import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildRecoveryPlan, recoverySql } from './teacher-profile-recovery.mjs';
import { rehearseTeacherRecovery } from './verify-teacher-profile-recovery.mjs';

const { values } = parseArgs({ options: { audit: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('Usage : node scripts/prepare-teacher-profile-recovery.mjs --audit <snapshot-audité.json> --out <nouveau-répertoire-privé>\nPréparation et recette locale uniquement. Aucune option d’application distante.');
} else {
  if (!values.audit || !values.out) throw new Error('Les options --audit et --out sont obligatoires.');
  const audit = JSON.parse(await readFile(resolve(values.audit), 'utf8'));
  process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuration Supabase serveur absente.');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(30000) }) },
  });
  // This is the only RPC called against the remote database: it is read-only.
  const { data, error } = await client.rpc('escen_backend_snapshot');
  if (error) throw new Error(`Lecture du snapshot refusée (${error.code || 'indisponible'}).`);
  const snapshot = { checkedAt: new Date().toISOString(), revision: data.revision, tables: {} };
  for (const name of ['people', 'accounts', 'roles', 'permissions', 'role_permissions', 'role_grants', 'staff', 'teachers', 'students']) {
    if (!Array.isArray(data.tables[name])) throw new Error(`Collection absente : ${name}.`);
    snapshot.tables[name] = data.tables[name];
  }
  const plan = buildRecoveryPlan(snapshot, audit);
  const identities = [plan.actor, ...plan.targets];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < identities.length) {
      const identity = identities[next++];
      const result = await client.auth.admin.getUserById(identity.authUserId);
      const user = result.data?.user;
      if (result.error || !user || !user.email_confirmed_at || (user.banned_until && Date.parse(user.banned_until) > Date.now())) {
        throw new Error(`État Auth non conforme pour le compte ${identity.accountId}.`);
      }
    }
  }));
  const validation = await rehearseTeacherRecovery(snapshot, plan);
  const sql = recoverySql(plan);
  const sha256 = createHash('sha256').update(sql).digest('hex');
  const directory = resolve(values.out);
  // A new private directory avoids overwriting an already reviewed lot or protected staging files.
  await mkdir(directory, { mode: 0o700 });
  const save = (filename, content) => writeFile(`${directory}/${filename}`, content, { mode: 0o600, flag: 'wx' });
  await save('plan.json', `${JSON.stringify(plan, null, 2)}\n`);
  await save('correction.sql', sql);
  await save('validation.json', `${JSON.stringify({ ...validation, checkedAt: snapshot.checkedAt, project: new URL(url).hostname, sqlSha256: sha256 }, null, 2)}\n`);
  const person = id => snapshot.tables.people.find(row => row.id === id);
  const safe = value => String(value || '').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
  const author = person(plan.actor.personId);
  await save('RELECTURE.md', `# Lot de régularisation des 19 enseignants\n\nPréparé le ${plan.createdAt}. **Non appliqué à distance.**\n\n`
    + `Projet : ${new URL(url).hostname}. Révision attendue : ${plan.expectedRevision}.\n\n`
    + `Auteur proposé pour l’audit : ${safe(author.firstname)} ${safe(author.lastname)} (${safe(author.email)}), compte IT ${plan.actor.accountId}.\n\n`
    + '19 dossiers du personnel et 19 profils enseignants seront créés sur les personnes existantes. Références internes INT-UUID non affichées, spécialités nulles. Aucun contrat, enseignement, compte ou rôle créé ou modifié.\n\n'
    + 'Le lot est atomique. Une révision périmée, une identité modifiée, un rôle retiré, un dossier déjà créé ou un audit incomplet provoque son annulation intégrale. Une réexécution est refusée.\n\n'
    + '| Personne | Email | Compte existant | Attribution ENS existante |\n| --- | --- | --- | --- |\n'
    + plan.targets.map(target => { const p = person(target.personId); return `| ${safe(p.firstname)} ${safe(p.lastname)} | ${safe(p.email)} | ${target.accountId} | ${target.grantId} |`; }).join('\n')
    + `\n\nRecette locale : ${validation.activeSessionsReady} sessions actives acceptées par le contrôle serveur après correction, dont les 19 enseignants précédemment bloqués ; 38 événements d’audit.\n\nSHA-256 de correction.sql : ${sha256}\n\n`
    + 'L’application distante doit être autorisée séparément après lecture de ce lot. Si la révision change, préparer et relire un nouveau lot ; ne pas remplacer simplement le numéro de révision dans le SQL.\n');
  console.log(JSON.stringify({ directory, ...validation, expectedRevision: plan.expectedRevision, sqlSha256: sha256 }));
}
