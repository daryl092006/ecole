import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';

const args = new Set(process.argv.slice(2));
const archiveIndex = process.argv.indexOf('--archive');
const archive = archiveIndex >= 0 ? process.argv[archiveIndex + 1] : join(homedir(), 'Downloads/Sauvegardes-ESCEN/sauvegarde-complete-2026-10-14_11-41-02.zip');
const apply = args.has('--apply');
const confirmEmails = args.has('--confirm-emails');
const keepUnconfirmed = args.has('--keep-unconfirmed');
if (apply && confirmEmails === keepUnconfirmed) {
  throw new Error('Pour appliquer, choisir exactement une option : --confirm-emails ou --keep-unconfirmed.');
}
if (args.has('--confirm-emails') && args.has('--keep-unconfirmed')) throw new Error('Options de confirmation contradictoires.');

function readLocalEnvironment() {
  const values = {};
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const env = readLocalEnvironment();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey || !supabaseUrl.includes('zmxapemyktxhppdxenzb')) throw new Error('Le projet Supabase cible ou sa clé serveur ne sont pas configurés.');
const prepared = spawnSync('python3', ['scripts/read-legacy-auth-identities.py', archive], { encoding: 'utf8', maxBuffer: 2_000_000 });
if (prepared.status !== 0) throw new Error('Contrôle local de l’archive échoué. Vérifiez la sauvegarde et les fichiers d’identités préparés.');
const credentials = JSON.parse(prepared.stdout);
const client = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });

const authUsers = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error('Lecture des comptes Supabase Auth impossible.');
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}
const byEmail = new Map(authUsers.filter(user => user.email).map(user => [user.email.toLowerCase(), user]));
const sourceEmails = new Set(credentials.map(row => row.email));
if (sourceEmails.size !== credentials.length) throw new Error('Courriels source en doublon : import arrêté.');
const existing = credentials.map(row => ({ row, user: byEmail.get(row.email) }));
const conflicts = existing.filter(({ row, user }) => user && user.app_metadata?.escen_account_id !== row.account_id);
if (conflicts.length) throw new Error(`${conflicts.length} courriel(s) correspondent déjà à un autre compte Supabase Auth ; aucune modification effectuée.`);

const accountIds = credentials.map(row => row.account_id);
const stateQuery = `select id,auth_user_id,active from escen.accounts where id = any(array[${accountIds.map(id => `${quoteSql(id)}::uuid`).join(',')}]);`;
const accountStates = remoteQuery(stateQuery);
if (accountStates.length !== credentials.length) throw new Error('Les comptes relationnels ne correspondent pas aux identités source.');
const stateById = new Map(accountStates.map(row => [row.id, row]));
for (const { row, user } of existing) {
  const account = stateById.get(row.account_id);
  if (!account || account.auth_user_id && account.auth_user_id !== user?.id) throw new Error('Lien Supabase Auth déjà présent ou incohérent ; import arrêté.');
}

const duplicateEmails = remoteQuery(`select count(*)::int as duplicate_emails from (select lower(btrim(p.email)) as normalized_email from escen.people p join escen.accounts a on a.person_id=p.id where a.id=any(array[${accountIds.map(id => `${quoteSql(id)}::uuid`).join(',')}]) and p.email is not null group by lower(btrim(p.email)) having count(*) > 1) duplicates;`)[0]?.duplicate_emails;
const profileCount = remoteQuery(`select count(*)::int as profile_count, count(*) filter (where p.email is null or lower(btrim(p.email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$')::int as invalid_emails from escen.people p join escen.accounts a on a.person_id=p.id where a.id=any(array[${accountIds.map(id => `${quoteSql(id)}::uuid`).join(',')}]);`)[0];
if (Number(duplicateEmails) > 0 || Number(profileCount?.profile_count) !== credentials.length || Number(profileCount?.invalid_emails) > 0) {
  throw new Error('Les courriels des profils importés ne sont pas complets, valides et uniques après normalisation ; import arrêté.');
}
const currentLinked = accountStates.filter(account => account.auth_user_id).length;
const currentActive = accountStates.filter(account => account.active).length;

const ready = credentials.filter(row => row.has_mapped_role);
const report = {
  project: 'zmxapemyktxhppdxenzb',
  sourceAccounts: credentials.length,
  existingAuthUsersForSource: existing.filter(item => item.user).length,
  existingAuthUsersConfirmed: existing.filter(item => item.user?.email_confirmed_at).length,
  alreadyLinkedAccounts: currentLinked,
  alreadyActiveAccounts: currentActive,
  accountsWithMappedRole: ready.length,
  accountsHeldWithoutMappedRole: credentials.length - ready.length,
  bcryptHashes: credentials.filter(row => row.password_hash.startsWith('$2y$')).length,
  passwordChangesRequired: credentials.filter(row => row.must_change_password).length,
  sourceEmailsPreviouslyVerified: credentials.filter(row => row.email_verified_at).length,
  emailsNormalizedForAuth: credentials.filter(row => row.email_normalization_needed).length,
  emailNormalization: 'trim + lowercase (profiles and Supabase Auth)',
  chosenEmailPolicy: confirmEmails ? 'CONFIRMED_BY_IMPORT_POLICY' : 'UNCONFIRMED',
  mode: apply ? 'APPLY' : 'DRY_RUN',
};
if (existing.some(({ user }) => user && confirmEmails && !user.email_confirmed_at)) {
  throw new Error('Un compte Auth correspondant existe sans adresse confirmée ; vérification manuelle requise avant toute modification.');
}
if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const linkedUsers = [];
for (let offset = 0; offset < existing.length; offset += 10) {
  const batch = await Promise.all(existing.slice(offset, offset + 10).map(async ({ row, user: existingUser }) => {
    if (existingUser) return { account_id: row.account_id, auth_user_id: existingUser.id, active: row.has_mapped_role };
    const { data, error } = await client.auth.admin.createUser({
      email: row.email,
      password_hash: row.password_hash,
      email_confirm: confirmEmails,
      app_metadata: { escen_account_id: row.account_id, legacy_import: true, must_change_password: row.must_change_password },
      user_metadata: { must_change_password: row.must_change_password },
    });
    if (error || !data.user) throw new Error('Création Auth interrompue. Les utilisateurs créés portent un marqueur idempotent ; relancez après diagnostic.');
    return { account_id: row.account_id, auth_user_id: data.user.id, active: row.has_mapped_role };
  }));
  linkedUsers.push(...batch);
}

const update = `begin; update escen.people p set email=lower(btrim(p.email)) from escen.accounts a where a.person_id=p.id and a.id=any(array[${accountIds.map(id => `${quoteSql(id)}::uuid`).join(',')}]) and p.email is not null; with wanted as (select * from jsonb_to_recordset(${quoteSql(JSON.stringify(linkedUsers))}::jsonb) as x(account_id uuid,auth_user_id uuid,active boolean)), changed as (update escen.accounts a set auth_user_id=w.auth_user_id,active=w.active from wanted w where a.id=w.account_id and (a.auth_user_id is null or a.auth_user_id=w.auth_user_id) returning a.id) select count(*)::int as linked_accounts from changed; commit;`;
const linked = remoteQuery(update)[0]?.linked_accounts;
if (Number(linked) !== linkedUsers.length) throw new Error('Comptes Auth créés, mais tous les liens relationnels n’ont pas été confirmés ; le script peut être relancé sans doublons.');
console.log(JSON.stringify({ ...report, createdOrMatchedAuthUsers: linkedUsers.length, linkedAccounts: Number(linked), activatedAccounts: ready.length, emailsNormalizedInProfiles: Number(profileCount.profile_count), status: 'RESTORED' }, null, 2));
