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

const raw = execSync('npx supabase db query --linked "select s.id, s.matricule, p.firstname, p.lastname, s.m365_email, s.m365_status from escen.students s join escen.people p on p.id = s.person_id;"', { encoding: 'utf-8' });
const jsonMatch = raw.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])/);
const students = jsonMatch ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows : [];

const matched = [];
const missing = [];

for (const s of students) {
  const email = s.m365_email ? s.m365_email.toLowerCase() : null;
  const m365 = email ? m365Map.get(email) : null;
  if (m365) {
    matched.push({ id: s.id, matricule: s.matricule, name: `${s.firstname} ${s.lastname}`, email, azureId: m365.id });
  } else {
    missing.push({ id: s.id, matricule: s.matricule, name: `${s.firstname} ${s.lastname}`, email });
  }
}

console.log('--- BILAN RÉCONCILIATION MICROSOFT 365 ---');
console.log(`Total étudiants ESCEN : ${students.length}`);
console.log(`✓ Étudiants qui ont DÉJÀ leur compte actif dans Microsoft 365 : ${matched.length}`);
console.log(`○ Étudiants qui N'ONT PAS de compte dans Microsoft 365 : ${missing.length}`);

console.log('\nExemples d\'étudiants déjà existants dans M365 (à lier en ACTIVE sans recréer) :');
matched.slice(0, 10).forEach(m => console.log(`  ✓ ${m.matricule.padEnd(14)} ${m.name.padEnd(30)} -> ${m.email}`));

console.log('\nExemples d\'étudiants sans compte M365 (les seuls à créer) :');
missing.slice(0, 15).forEach(m => console.log(`  ○ ${m.matricule.padEnd(14)} ${m.name.padEnd(30)} -> ${m.email}`));

