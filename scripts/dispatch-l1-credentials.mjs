/**
 * Envoi des identifiants d'accès Microsoft 365 et Portail Étudiant ESCEN aux étudiants de Licence 1 (L1)
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Variables Supabase manquantes");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Azure Graph credentials
const tenantId = process.env.AZURE_TENANT_ID?.trim();
const azureClientId = process.env.AZURE_CLIENT_ID?.trim();
const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();
const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const skuId = process.env.AZURE_STUDENT_SKU_ID;
const senderEmail = process.env.ESCEN_EMAIL_FROM || 'noreply@escen.university';

async function getAzureToken() {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: azureClientId,
      client_secret: azureClientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erreur token Azure: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function getMailSenderToken() {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: msClientId,
      client_secret: msClientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erreur token Mail Sender: ${JSON.stringify(data)}`);
  return data.access_token;
}

function buildWelcomeEmail(student, tempPassword) {
  const subject = 'Bienvenue à l’ESCEN — Vos accès officiels au Portail Étudiant et à Microsoft 365';

  const textBody = `Bonjour ${student.firstname} ${student.lastname},

Félicitations pour votre inscription à l’ESCEN en Licence 1 !

Vos comptes et accès officiels aux outils numériques de l'ESCEN sont désormais actifs :
• Matricule étudiant : ${student.matricule}
• Identifiant officiel (Microsoft 365 & Portail) : ${student.m365_email}
• Mot de passe initial temporaire : ${tempPassword}

Comment vous connecter dès maintenant :

1. Votre Portail Étudiant ESCEN :
   👉 https://portail.escen.university/
   (Utilisez votre adresse email institutionnelle ${student.m365_email} et votre mot de passe temporaire)

2. Vos outils Microsoft 365 (Word, Excel, PowerPoint, Teams, OneDrive) :
   👉 https://office.com
   (Connectez-vous avec ${student.m365_email} et le même mot de passe temporaire)

Lors de votre première connexion sur Microsoft 365, il vous sera demandé de configurer votre mot de passe personnel définitif.

En cas de difficulté de connexion, contactez le support informatique : support.informatique@escen.university

La Direction et l'équipe pédagogique de l'ESCEN vous souhaitent une excellente réussite académique !`;

  const htmlBody = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Accès Numériques ESCEN</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
    
    <div style="background: linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Bienvenue à l’ESCEN</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">École Supérieure de Commerce et d’Économie Numérique</p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; margin-top: 0;">Bonjour <strong>${student.firstname} ${student.lastname}</strong>,</p>
      
      <p style="font-size: 15px; color: #334155;">
        Félicitations pour votre admission et votre inscription en <strong>Licence 1</strong> pour l'année académique 2026-2027.
      </p>

      <p style="font-size: 15px; color: #334155;">
        Vos accès numériques officiels ont été activés. Votre adresse institutionnelle est votre clé unique pour accéder à l'ensemble des services de l'école :
      </p>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #cbd5e1;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f4c81;">Vos identifiants d’accès</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;">Matricule officiel :</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${student.matricule}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Identifiant / Email :</td>
            <td style="padding: 6px 0; font-family: monospace; font-size: 14px; font-weight: 700; color: #0f4c81;">${student.m365_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Mot de passe temporaire :</td>
            <td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: 700; color: #047857; background: #e6f4ea; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tempPassword}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 28px 0;">
        <h3 style="font-size: 16px; margin: 0 0 16px 0; color: #0f172a;">Accéder à vos espaces de travail :</h3>
        
        <div style="margin-bottom: 16px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <strong style="color: #0f4c81; font-size: 15px;">1. Portail Étudiant ESCEN</strong>
          <p style="margin: 4px 0 12px 0; font-size: 13px; color: #64748b;">Consultation de vos cours, planning, notes, présences et attestations.</p>
          <a href="https://portail.escen.university/" style="display: inline-block; background: #0f4c81; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 6px;">Ouvrir le Portail Étudiant &rarr;</a>
        </div>

        <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <strong style="color: #0078d4; font-size: 15px;">2. Microsoft 365 (Office, Teams, OneDrive)</strong>
          <p style="margin: 4px 0 12px 0; font-size: 13px; color: #64748b;">Suite bureautique complète (Word, Excel, PowerPoint) et cours en direct sur Microsoft Teams.</p>
          <a href="https://office.com" style="display: inline-block; background: #0078d4; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 6px;">Se connecter à Microsoft 365 &rarr;</a>
        </div>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; margin-top: 24px; font-size: 13px; color: #92400e;">
        💡 <strong>Sécurité :</strong> Lors de votre première connexion, il vous sera demandé de personnaliser votre mot de passe temporaire.
      </div>

      <p style="margin-top: 32px; font-size: 14px; color: #334155;">
        Bienvenue dans la communauté ESCEN !<br>
        <strong>L’équipe pédagogique et administrative</strong>
      </p>
    </div>

    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      ESCEN Lomé — campus@escen.university — Support technique : support.informatique@escen.university
    </div>
  </div>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}

async function main() {
  console.log('=== DISPATCH DES ACCÈS AUX ÉTUDIANTS DE L1 ===\n');

  // 1. Obtenir les tokens
  const azureToken = await getAzureToken();
  const mailToken = await getMailSenderToken();
  console.log('✓ Tokens Microsoft Graph obtenus.');

  // 2. Récupérer les étudiants de L1 2026-2027
  const sql = `
select 
  s.id as student_id,
  s.matricule, 
  p.firstname, 
  p.lastname, 
  p.email as personal_email, 
  s.m365_email,
  s.m365_user_id
from escen.students s
join escen.people p on p.id = s.person_id
join escen.enrollments e on e.student_id = s.id
join escen.academic_offerings o on o.id = e.offering_id
join escen.academic_years y on y.id = o.academic_year_id and y.name = '2026-2027'
join escen.levels l on l.id = o.level_id
where s.archived_at is null 
  and l.code = 'L1'
  and s.matricule like '%-ESC-2026'
order by s.matricule;
`;

  const raw = execSync(`npx supabase db query --linked "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  const jsonMatch = raw.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])/);
  const students = jsonMatch ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows : [];

  console.log(`Trouvé ${students.length} étudiant(s) de L1.\n`);

  const { data: authList } = await supabase.auth.admin.listUsers();
  const results = [];

  for (const s of students) {
    console.log(`--------------------------------------------------`);
    console.log(`Traitement de ${s.matricule} : ${s.firstname} ${s.lastname}`);
    console.log(`  • Email personnel : ${s.personal_email}`);
    console.log(`  • Email M365     : ${s.m365_email}`);

    // Générer un mot de passe temporaire unique
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Escen2026#${randCode}`;

    // 1. Recréer l'utilisateur dans Entra ID pour appliquer le mot de passe initial
    let newM365Id = null;
    try {
      // Trouver l'utilisateur existant
      const existingRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(s.m365_email)}`, {
        headers: { Authorization: `Bearer ${azureToken}` }
      });

      if (existingRes.ok) {
        const u = await existingRes.json();
        // Supprimer
        await fetch(`https://graph.microsoft.com/v1.0/users/${u.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${azureToken}` }
        });
        // Purger de la corbeille
        await fetch(`https://graph.microsoft.com/v1.0/directory/deletedItems/${u.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${azureToken}` }
        });
      }

      // Créer avec le mot de passe temporaire
      const createRes = await fetch('https://graph.microsoft.com/v1.0/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${azureToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`  ✗ Erreur création Entra ID: ${errText}`);
      } else {
        const created = await createRes.json();
        newM365Id = created.id;
        console.log(`  ✓ Compte Microsoft 365 activé (ID: ${newM365Id})`);

        // Assigner la licence étudiante
        if (skuId) {
          await fetch(`https://graph.microsoft.com/v1.0/users/${newM365Id}/assignLicense`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${azureToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              addLicenses: [{ skuId }],
              removeLicenses: [],
            }),
          });
          console.log(`  ✓ Licence Office 365 Étudiant assignée`);
        }

        // Mettre à jour l'ID dans Supabase escen.students
        execSync(`npx supabase db query --linked "update escen.students set m365_user_id = '${newM365Id}', m365_status = 'ACTIVE' where id = '${s.student_id}';"`, { stdio: 'ignore' });
      }
    } catch (e) {
      console.error(`  ✗ Erreur M365: ${e.message}`);
    }

    // 2. Mettre à jour le mot de passe dans Supabase Auth
    const authUser = authList?.users?.find(u => u.email?.toLowerCase() === s.m365_email.toLowerCase());
    if (authUser) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: tempPassword,
      });
      if (authErr) console.error(`  ✗ Erreur Supabase Auth: ${authErr.message}`);
      else console.log(`  ✓ Mot de passe synchronisé sur le Portail Étudiant ESCEN`);
    }

    // 3. Envoyer l'email officiel à l'adresse personnelle de l'étudiant
    const emailData = buildWelcomeEmail(s, tempPassword);
    let emailSent = false;
    try {
      const sendRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mailToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: emailData.subject,
            body: { contentType: 'HTML', content: emailData.htmlBody },
            toRecipients: [{ emailAddress: { address: s.personal_email } }],
          },
        }),
      });

      if (sendRes.status === 202) {
        emailSent = true;
        console.log(`  ✓ Email officiel d’accès envoyé avec succès à : ${s.personal_email}`);
      } else {
        const sendErr = await sendRes.text();
        console.error(`  ✗ Échec envoi email (HTTP ${sendRes.status}): ${sendErr}`);
      }
    } catch (e) {
      console.error(`  ✗ Exception envoi email: ${e.message}`);
    }

    results.push({
      matricule: s.matricule,
      nom: `${s.lastname} ${s.firstname}`,
      personalEmail: s.personal_email,
      m365Email: s.m365_email,
      tempPassword,
      emailSent: emailSent ? 'ENVOYÉ' : 'ÉCHEC',
    });
  }

  console.log('\n========================================================================');
  console.log('RÉCAPITULATIF DES ACCÈS DISPATCHÉS :');
  console.table(results);
}

main().catch(console.error);
