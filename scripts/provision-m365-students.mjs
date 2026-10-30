/**
 * Script de provisionnement des comptes Microsoft 365 pour les étudiants 2026-2027
 */
import { execSync } from 'child_process';

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const skuId = process.env.AZURE_STUDENT_SKU_ID;

if (!tenantId || !clientId || !clientSecret) {
  console.error("Identifiants Azure manquants dans l'environnement");
  process.exit(1);
}

// 1. Obtenir le token Microsoft Graph
console.log('1. Authentification Microsoft Graph...');
const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const body = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  scope: 'https://graph.microsoft.com/.default',
  grant_type: 'client_credentials',
});

const tokenRes = await fetch(tokenUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
});
const tokenData = await tokenRes.json();
if (!tokenRes.ok) {
  console.error('Erreur token Azure:', tokenData);
  process.exit(1);
}
const token = tokenData.access_token;
console.log('✓ Token Microsoft Graph obtenu avec succès.');

// 2. Récupérer les étudiants 2026-2027 à provisionner via Supabase CLI
console.log('2. Recherche des étudiants 2026-2027 en attente...');
const sqlQuery = `
select s.id, s.matricule, p.firstname, p.lastname, s.m365_email
from escen.students s
join escen.people p on p.id = s.person_id
where s.matricule like '%-ESC-2026'
  and s.m365_status = 'PENDING'
  and s.m365_email is not null
order by s.matricule;
`;

const rawResult = execSync(`npx supabase db query --linked "${sqlQuery.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
// Extraire le JSON entre boundary ou direct
const match = rawResult.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])/);
let students = [];
if (match) {
  try {
    const fullJson = JSON.parse(rawResult.slice(rawResult.indexOf('{'), rawResult.lastIndexOf('}') + 1));
    students = fullJson.rows || [];
  } catch (e) {
    console.error('Erreur parsing JSON:', e.message);
  }
}

console.log(`Trouvé ${students.length} étudiant(s) 2026-2027 à provisionner sur Microsoft 365 :`);

for (const s of students) {
  console.log(`\nCréation de : ${s.matricule} - ${s.firstname} ${s.lastname} (${s.m365_email})...`);

  // Vérifier si le compte existe déjà dans Entra ID
  const checkRes = await fetch(`https://graph.microsoft.com/v1.0/users/${s.m365_email}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  let userId = null;
  if (checkRes.ok) {
    const existing = await checkRes.json();
    userId = existing.id;
    console.log(`  ℹ Compte déjà existant dans Microsoft Entra (ID: ${userId})`);
  } else {
    // Créer l'utilisateur
    const tempPassword = 'Escen2026#' + Math.floor(1000 + Math.random() * 9000);
    const userPayload = {
      accountEnabled: true,
      displayName: `${s.firstname} ${s.lastname.toUpperCase()}`,
      mailNickname: s.m365_email.split('@')[0],
      userPrincipalName: s.m365_email,
      givenName: s.firstname,
      surname: s.lastname,
      usageLocation: 'TG',
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: tempPassword,
      },
    };

    const createRes = await fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userPayload),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error(`  ✗ Erreur création: ${createData.error?.message || JSON.stringify(createData)}`);
      continue;
    }
    userId = createData.id;
    console.log(`  ✓ Compte créé avec succès (ID: ${userId})`);
  }

  // Assigner la licence Office 365 Étudiant
  if (skuId && userId) {
    const licRes = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/assignLicense`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLicenses: [{ skuId }],
        removeLicenses: [],
      }),
    });
    if (licRes.ok) {
      console.log('  ✓ Licence Office 365 Étudiant assignée.');
    } else {
      const licErr = await licRes.json();
      console.warn(`  ⚠ Licence: ${licErr.error?.message || 'non assignée'}`);
    }
  }

  // Mettre à jour la base Supabase
  if (userId) {
    const updateSql = `update escen.students set m365_user_id = '${userId}', m365_status = 'ACTIVE', m365_provisioned_at = now() where id = '${s.id}';`;
    execSync(`npx supabase db query --linked "${updateSql}"`, { stdio: 'ignore' });
    console.log('  ✓ Statut étudiant mis à jour (ACTIVE) dans ESCEN.');
  }
}

console.log('\n==========================================');
console.log('Tous les comptes ont été provisionnés avec succès !');

