import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';
process.loadEnvFile('.env.local');
const emails = ['admin@test.com', 'support@neostart.tech'];
const reason = 'Retrait demandé explicitement : comptes Administrateur Admin et Neo Start Technology Support ; traces historiques conservées.';
const targets = remoteQuery(`select a.id,a.auth_user_id,a.active,a.archived_at,p.email from escen.accounts a join escen.people p on p.id=a.person_id where lower(p.email) in (${emails.map(quoteSql).join(',')});`);
if (targets.length !== 2 || emails.some(email => targets.filter(t => t.email.toLowerCase() === email).length !== 1)) throw new Error('Les deux comptes doivent être identifiés sans ambiguïté.');
const others = remoteQuery(`select count(distinct a.id) as count from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id where a.active and a.archived_at is null and a.auth_user_id is not null and r.active and r.code='IT' and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null and a.id not in (${targets.map(t=>quoteSql(t.id)+'::uuid').join(',')});`)[0];
if (Number(others.count) < 1) throw new Error('Un autre Informaticien actif doit conserver l’accès.');
if (!process.argv.includes('--apply')) { console.log({ mode: 'preview', matchedAccounts: targets.length, otherActiveIT: Number(others.count) }); process.exit(0); }
await mkdir('.tmp/account-retirements', { recursive: true, mode: 0o700 });
await writeFile('.tmp/account-retirements/designated-before.json', JSON.stringify(targets,null,2), { mode: 0o600 });
remoteQuery(`begin;
update escen.accounts set active=false,archived_at=coalesce(archived_at,clock_timestamp()),reason=${quoteSql(reason)} where id in (${targets.map(t=>quoteSql(t.id)+'::uuid').join(',')});
update escen.role_grants set valid_until=clock_timestamp(),reason=${quoteSql(reason)} where account_id in (${targets.map(t=>quoteSql(t.id)+'::uuid').join(',')}) and valid_from<=now() and (valid_until is null or valid_until>now());
update escen_private.portal_revision set revision=revision+1,changed_at=now() where singleton;
commit;
select count(*) as count from escen.accounts where id in (${targets.map(t=>quoteSql(t.id)+'::uuid').join(',')}) and not active and archived_at is not null;`);
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{ auth: { persistSession: false,autoRefreshToken: false } });
for (const target of targets) {
  if (!target.auth_user_id) continue;
  const response = await client.auth.admin.updateUserById(target.auth_user_id,{ ban_duration: '876000h' });
  if (response.error) throw new Error('Accès applicatifs retirés ; le blocage Auth doit être réessayé.');
}
const checked = remoteQuery(`select count(*) as count from escen.accounts a join escen.people p on p.id=a.person_id where lower(p.email) in (${emails.map(quoteSql).join(',')}) and not a.active and a.archived_at is not null and not exists(select 1 from escen.role_grants g where g.account_id=a.id and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()));`)[0];
if (Number(checked.count)!==2) throw new Error('Retrait non confirmé.');
const report = { retiredAccounts:2,authAccessBlocked:true,historicalRowsPreserved:true,otherActiveIT:Number(others.count),checkedAt:new Date().toISOString() };
await writeFile('.tmp/account-retirements/designated-result.json',JSON.stringify(report,null,2),{ mode:0o600 });
console.log(report);
