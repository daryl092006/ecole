import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { chmod, readFile, writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply');
const resetAll = process.argv.includes('--reset-all') || process.argv.includes('--all');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error('Lecture des comptes Auth indisponible. Aucun secret affiché.');
  users.push(...data.users);
  if (data.users.length < 1000) break;
}
const counts = { accounts: users.length, pending: 0, existingPreserved: 0, alreadyPrepared: 0, updated: 0, failed: 0 };
for (const user of users) {
  let current = user;
  if (apply) {
    const loaded = await client.auth.admin.getUserById(user.id);
    if (loaded.error || !loaded.data.user) { counts.failed++; continue; }
    current = loaded.data.user;
  }
  if (!resetAll && current.app_metadata.escen_first_login?.version === 1) { counts.alreadyPrepared++; continue; }
  const used = !resetAll && !!current.last_sign_in_at;
  if (used) counts.existingPreserved++; else counts.pending++;
  if (!apply) continue;
  const metadata = {
    ...current.app_metadata,
    escen_first_login: { version: 1, ...(used ? { exempt: true } : {}) },
    must_change_password: true,
  };
  const saved = await client.auth.admin.updateUserById(current.id, { app_metadata: metadata });
  if (saved.error || !saved.data.user) counts.failed++; else counts.updated++;
}
console.log(JSON.stringify(counts));
if (counts.failed) throw new Error('Préparation incomplète. Le parcours n’a pas été activé. Relancer la commande pour reprendre sans écraser les états déjà préparés.');
if (apply) {
  const source = await readFile('.env.local', 'utf8');
  const line = 'ESCEN_FIRST_LOGIN_ENABLED=true';
  await writeFile('.env.local', /^ESCEN_FIRST_LOGIN_ENABLED=.*$/m.test(source) ? source.replace(/^ESCEN_FIRST_LOGIN_ENABLED=.*$/m, line) : `${source.trimEnd()}\n${line}\n`, { mode: 0o600 });
  await chmod('.env.local', 0o600);
  console.log(resetAll ? 'Tous les comptes réinitialisés en première connexion obligatoire. Aucun email envoyé.' : 'Parcours activé dans .env.local. Les comptes déjà utilisés sont préservés. Aucun email envoyé.');
}
