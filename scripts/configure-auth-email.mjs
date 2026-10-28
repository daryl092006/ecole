import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nextEnv from '@next/env';

// Never emit subprocess output: configuration diffs and provider errors may contain secrets.
const mode = process.argv[2] || 'check';
if (!['check', 'deploy', 'activate', 'disable'].includes(mode)) throw new Error('Mode attendu : check, deploy, activate ou disable.');
nextEnv.loadEnvConfig(process.cwd());
const env = { ...process.env };
const origin = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
const reference = origin.hostname.split('.')[0];
if (!/^[a-z]{20}$/.test(reference) || origin.hostname !== `${reference}.supabase.co` || origin.protocol !== 'https:') throw new Error('Projet Supabase invalide.');
const endpoint = `${origin.origin}/functions/v1/auth-email`;
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
if (!uuid.test(env.MICROSOFT_TENANT_ID || '') || !uuid.test(env.MICROSOFT_CLIENT_ID || '') || !env.MICROSOFT_CLIENT_SECRET?.trim()) throw new Error('Identifiants Microsoft incomplets.');

if (!env.ESCEN_AUTH_EMAIL_HOOK_SECRET) {
  if (mode !== 'check') throw new Error('Exécuter le mode check pour préparer le secret de signature.');
  env.ESCEN_AUTH_EMAIL_HOOK_SECRET = `v1,whsec_${randomBytes(32).toString('base64')}`;
  const source = await readFile('.env.local', 'utf8');
  const line = `ESCEN_AUTH_EMAIL_HOOK_SECRET=${env.ESCEN_AUTH_EMAIL_HOOK_SECRET}`;
  await writeFile('.env.local', /^ESCEN_AUTH_EMAIL_HOOK_SECRET=.*$/m.test(source)
    ? source.replace(/^ESCEN_AUTH_EMAIL_HOOK_SECRET=.*$/m, () => line)
    : `${source.trimEnd()}\n${line}\n`, { mode: 0o600 });
  await chmod('.env.local', 0o600);
  console.log('Secret de signature préparé dans .env.local, sans affichage.');
}

function cli(args) {
  const result = spawnSync('npx', ['--no-install', 'supabase', ...args, '--project-ref', reference], {
    env, encoding: 'utf8', maxBuffer: 8_000_000, timeout: 120000,
  });
  if (result.status !== 0) {
    let reason = `${result.stdout || ''}\n${result.stderr || ''}`;
    for (const value of Object.values(env)) if (typeof value === 'string' && value.length >= 8) reason = reason.replaceAll(value, '[masqué]');
    reason = reason.replace(/[A-Za-z\d_+/.=~-]{20,}/g, '[masqué]').slice(0, 1000);
    throw new Error(`Commande Supabase ${args.slice(0, 2).join(' ')} échouée (code ${result.status ?? 'indisponible'}). ${reason}`);
  }
  return result.stdout;
}

function preview(directory) {
  let parsed;
  try { parsed = JSON.parse(cli(['config', 'diff', '--workdir', directory, '--output-format', 'json'])); }
  catch { throw new Error('Comparaison Supabase indisponible. Activation non effectuée.'); }
  if (!Array.isArray(parsed.changes)) throw new Error('Comparaison Supabase inattendue.');
  for (const change of parsed.changes) {
    const path = Array.isArray(change.path) ? change.path.join('.') : change.path;
    if (typeof path !== 'string' || !/^[a-zA-Z\d_.[\]-]+$/.test(path)) throw new Error('Chemin de configuration inattendu.');
    console.log(`${change.declared ? 'Déclaré' : 'Non déclaré, conservé'} : ${path}`);
    if (change.declared && !['auth.hook.send_email.enabled', 'auth.hook.send_email.uri', 'auth.hook.send_email.secrets'].includes(path)) throw new Error('Modification hors du hook refusée.');
  }
}

const directory = await mkdtemp(join(tmpdir(), 'escen-auth-email-'));
try {
  await mkdir(join(directory, 'supabase'));
  // Sparse configuration: declare only this hook. Never push the complete local project config.
  await writeFile(join(directory, 'supabase/config.toml'), `project_id = "escen-auth-email"\n[auth.hook.send_email]\nenabled = ${mode !== 'disable'}\nuri = "${endpoint}"\nsecrets = "env(ESCEN_AUTH_EMAIL_HOOK_SECRET)"\n`, { mode: 0o600 });
  if (mode === 'check') {
    const response = await fetch(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.MICROSOFT_CLIENT_ID, client_secret: env.MICROSOFT_CLIENT_SECRET,
        grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' }),
    });
    const token = await response.json();
    if (!response.ok || typeof token.access_token !== 'string') throw new Error(`Authentification Microsoft refusée (HTTP ${response.status}). Vérifier la Valeur du secret client.`);
    console.log('Authentification Microsoft vérifiée, sans envoi de mail.');
    preview(directory);
  } else if (mode === 'deploy') {
    const file = join(directory, 'secrets.env');
    const values = { MICROSOFT_TENANT_ID: env.MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID: env.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: env.MICROSOFT_CLIENT_SECRET, ESCEN_AUTH_EMAIL_HOOK_SECRET: env.ESCEN_AUTH_EMAIL_HOOK_SECRET, ESCEN_AUTH_EMAIL_ENABLED: 'true' };
    await writeFile(file, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
    cli(['secrets', 'set', '--env-file', file]);
    cli(['functions', 'deploy', 'auth-email', '--use-api', '--no-verify-jwt']);
    const response = await fetch(endpoint, { method: 'POST', body: '{}', signal: AbortSignal.timeout(15000) });
    if (response.status !== 401) throw new Error(`Fonction déployée mais vérification de signature non confirmée (HTTP ${response.status}). Hook non activé.`);
    console.log('Fonction auth-email déployée et refus des demandes non signées vérifié. Hook non activé.');
  } else {
    preview(directory);
    cli(['config', 'push', '--workdir', directory, '--yes']);
    console.log(mode === 'activate' ? 'Hook d’envoi Auth activé sur la fonction auth-email.' : 'Hook d’envoi Auth désactivé ; le service SMTP Supabase reprend la main.');
  }
} finally {
  // Only task-created temporary files, including the short-lived secret upload file.
  await rm(directory, { recursive: true, force: true });
}
