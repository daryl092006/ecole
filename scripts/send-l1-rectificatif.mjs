
const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();
const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();
const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const senderEmail = process.env.ESCEN_EMAIL_FROM || 'noreply@escen.university';

const students = [
  {
    matricule: '152-ESC-2026',
    name: 'EMMANUEL YANIS ALVIN BOLOUVI',
    firstname: 'Emmanuel',
    lastname: 'BOLOUVI',
    personalEmail: 'alvinbolouvi4@icloud.com',
    m365Email: 'b.emmanuel.etudiant@escen.university',
    pass: 'Escen2026#5167'
  },
  {
    matricule: '153-ESC-2026',
    name: 'Ablavi Natacha EKLO',
    firstname: 'Natacha',
    lastname: 'EKLO',
    personalEmail: 'eklonatacha@gmail.com',
    m365Email: 'e.ablavi.etudiant@escen.university',
    pass: 'Escen2026#4395'
  },
  {
    matricule: '157-ESC-2026',
    name: 'Ilyassa BAMOGO',
    firstname: 'Ilyassa',
    lastname: 'BAMOGO',
    personalEmail: 'bamogoilyassa586@gmail.com',
    m365Email: 'b.ilyassa.etudiant@escen.university',
    pass: 'Escen2026#2394'
  },
  {
    matricule: '158-ESC-2026',
    name: 'John Bienvenu Andreano Ayite AHYEE',
    firstname: 'John',
    lastname: 'AHYEE',
    personalEmail: 'andreanoahyee3@gmail.com',
    m365Email: 'a.john.etudiant@escen.university',
    pass: 'Escen2026#8311'
  },
  {
    matricule: '160-ESC-2026',
    name: 'Mawunyon Verra AHOSSI',
    firstname: 'Verra',
    lastname: 'AHOSSI',
    personalEmail: 'ravesmomahossi@gmail.com',
    m365Email: 'a.mawunyon.etudiant@escen.university',
    pass: 'Escen2026#3685'
  },
  {
    matricule: '163-ESC-2026',
    name: 'Abide TELOU',
    firstname: 'Abide',
    lastname: 'TELOU',
    personalEmail: 'abiretelou73@gmail.com',
    m365Email: 't.abide.etudiant@escen.university',
    pass: 'Escen2026#8595'
  }
];

async function main() {
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: msClientId,
      client_secret: msClientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const token = (await tokenRes.json()).access_token;

  for (const s of students) {
    const subject = 'ESCEN — Lien officiel direct de votre Portail Étudiant : portail.escen.university';
    const htmlBody = `<!doctype html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Portail Étudiant ESCEN</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Accès direct officiel</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; margin-top: 0;">Bonjour <strong>${s.firstname} ${s.lastname}</strong>,</p>

      <p style="font-size: 15px; color: #334155;">
        Veuillez utiliser l’adresse officielle ci-dessous pour accéder directement à votre espace étudiant :
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://portail.escen.university/" style="display: inline-block; background: #0f4c81; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(15, 76, 129, 0.3);">
          👉 Accéder à portail.escen.university
        </a>
      </div>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #0f4c81;">Rappel de vos identifiants</h3>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Matricule :</strong> ${s.matricule}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Identifiant (Email) :</strong> <code style="font-weight: 700; color: #0f4c81;">${s.m365Email}</code></p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Mot de passe initial :</strong> <code style="font-weight: 700; color: #047857; background: #e6f4ea; padding: 2px 6px; border-radius: 4px;">${s.pass}</code></p>
      </div>

      <p style="font-size: 14px; color: #475569;">
        Ce même mot de passe vous permet également de vous connecter à vos applications <strong>Microsoft 365</strong> (Word, Excel, Teams, OneDrive) sur <a href="https://office.com" style="color: #0f4c81; font-weight: 600;">office.com</a>.
      </p>

      <p style="margin-top: 24px; font-size: 14px; color: #334155;">
        Bonne rentrée académique à l'ESCEN !<br>
        <strong>La Direction & l'Équipe Informatique ESCEN</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

    console.log(`Envoi du lien officiel à ${s.personalEmail} (${s.name})...`);
    const sendRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: htmlBody },
          toRecipients: [{ emailAddress: { address: s.personalEmail } }],
        },
      }),
    });

    if (sendRes.status === 202) {
      console.log(`  ✓ Envoyé avec succès !`);
    } else {
      console.error(`  ✗ Erreur (HTTP ${sendRes.status}):`, await sendRes.text());
    }
  }
}

main().catch(console.error);
