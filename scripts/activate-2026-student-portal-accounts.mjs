/**
 * Activation des comptes d'accès au portail pour les étudiants 2026-2027
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Variables Supabase manquantes dans l'environnement");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('1. Recherche des étudiants 2026-2027 sans compte portail...');
  const sql = `
select s.id as student_id, s.matricule, p.id as person_id, p.firstname, p.lastname, s.m365_email
from escen.students s
join escen.people p on p.id = s.person_id
left join escen.accounts a on a.person_id = p.id
where s.matricule like '%-ESC-2026'
  and a.id is null
  and s.m365_email is not null
order by s.matricule;
`;

  const raw = execSync(`npx supabase db query --linked "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  const jsonMatch = raw.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])/);
  const students = jsonMatch ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows : [];

  console.log(`Trouvé ${students.length} étudiant(s) à activer sur le portail.`);

  // Trouver un administrateur pour granted_by
  const rawAdmin = execSync('npx supabase db query --linked "select a.id from escen.accounts a join escen.people p on p.id = a.person_id where p.email = \'g.nobel@escen.university\' limit 1;"', { encoding: 'utf-8' });
  const adminId = JSON.parse(rawAdmin.slice(rawAdmin.indexOf('{'), rawAdmin.lastIndexOf('}') + 1)).rows[0]?.id;

  const roleId = '8296938e-1a3d-45b6-b4c5-448a3d5bdfad'; // STUD

  for (const s of students) {
    console.log(`\nActivation de ${s.matricule} : ${s.firstname} ${s.lastname} (${s.m365_email})...`);

    // 1. Créer ou récupérer l'utilisateur Auth Supabase
    let authUserId = null;
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingAuth = listData?.users?.find(u => u.email?.toLowerCase() === s.m365_email.toLowerCase());

    const defaultPassword = 'Escen2026#' + Math.floor(1000 + Math.random() * 9000);

    if (existingAuth) {
      authUserId = existingAuth.id;
      console.log(`  ℹ Compte Auth Supabase existant (ID: ${authUserId})`);
    } else {
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: s.m365_email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          firstname: s.firstname,
          lastname: s.lastname,
          must_change_password: true,
        },
      });

      if (createErr) {
        console.error(`  ✗ Erreur création Auth: ${createErr.message}`);
        continue;
      }
      authUserId = createData.user.id;
      console.log(`  ✓ Compte Auth Supabase créé (ID: ${authUserId})`);
    }

    // 2. Créer l'entrée escen.accounts et escen.role_grants
    const accountSql = `
do $$
declare
  v_account_id uuid := gen_random_uuid();
begin
  insert into escen.accounts (id, person_id, auth_user_id, active)
  values (v_account_id, '${s.person_id}', '${authUserId}', true);

  insert into escen.role_grants (account_id, role_id, valid_from, reason, granted_by)
  values (
    v_account_id,
    '${roleId}',
    now(),
    'Attribution automatique du rôle Étudiant lors de l’admission 2026-2027',
    '${adminId}'
  );
end $$;
    `;

    try {
      execSync(`npx supabase db query --linked "${accountSql.replace(/\n/g, ' ')}"`, { stdio: 'ignore' });
      console.log('  ✓ Compte ESCEN et rôle Étudiant (STUD) activés avec succès.');
    } catch (e) {
      console.error(`  ✗ Erreur SQL account/role: ${e.message}`);
    }
  }

  console.log('\n==========================================');
  console.log('Tous les comptes portail étudiants ont été activés !');
}

run();

