/**
 * Rapprochement des comptes Microsoft 365 déjà existants avec les fiches étudiants ESCEN
 */
import { execSync } from 'child_process';

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const body = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  scope: 'https://graph.microsoft.com/.default',
  grant_type: 'client_credentials',
});
const res = await fetch(tokenUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
});
const token = (await res.json()).access_token;

let url = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,givenName,surname&$top=999';
const m365Users = [];
while (url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await r.json();
  if (json.value) m365Users.push(...json.value);
  url = json['@odata.nextLink'] || null;
}

const m365Map = new Map();
for (const u of m365Users) {
  if (u.userPrincipalName) {
    m365Map.set(u.userPrincipalName.toLowerCase(), u);
  }
}

const raw = execSync('npx supabase db query --linked "select s.id, s.matricule, p.firstname, p.lastname, s.m365_email from escen.students s join escen.people p on p.id = s.person_id where s.m365_status <> \'ACTIVE\';"', { encoding: 'utf-8' });
const jsonMatch = raw.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])/);
const students = jsonMatch ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows : [];

console.log(`Vérification de ${students.length} étudiants...`);
const toActivate = [];

for (const s of students) {
  const email = s.m365_email ? s.m365_email.toLowerCase() : null;
  const m365 = email ? m365Map.get(email) : null;
  if (m365) {
    toActivate.push({ id: s.id, matricule: s.matricule, email, azureId: m365.id });
  }
}

console.log(`Liaison de ${toActivate.length} comptes déjà existants dans Microsoft 365...`);

// Mettre à jour par lot SQL
if (toActivate.length > 0) {
  const values = toActivate.map(a => `('${a.id}'::uuid, '${a.azureId}', '${a.email}')`).join(',\n');
  const sql = `
update escen.students as s
set m365_user_id = v.azure_id,
    m365_email = v.email,
    m365_status = 'ACTIVE',
    m365_provisioned_at = coalesce(s.m365_provisioned_at, now())
from (values
${values}
) as v(id, azure_id, email)
where s.id = v.id;
  `;

  execSync(`npx supabase db query --linked "${sql.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  console.log(`✓ ${toActivate.length} comptes étudiants ont été liés et passés en ACTIVE avec succès !`);
}

