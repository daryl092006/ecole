export const AUTH_EMAIL_TEMPLATES = [
  { type: 'recovery', subject: 'ESCEN · Réinitialisez votre mot de passe', title: 'Choisissez un nouveau mot de passe',
    paragraphs: ['Vous avez demandé à réinitialiser le mot de passe de votre compte ESCEN.', 'Utilisez le bouton ci-dessous pour choisir votre nouveau mot de passe et retrouver votre espace.'],
    action: 'Réinitialiser mon mot de passe', notice: 'Si vous n’avez pas fait cette demande, ignorez ce message. Votre mot de passe reste inchangé.' },
  { type: 'confirmation', subject: 'ESCEN · Confirmez votre adresse email', title: 'Confirmez votre adresse email',
    paragraphs: ['Une confirmation de votre adresse email a été demandée pour votre compte ESCEN.', 'Utilisez le bouton ci-dessous pour confirmer cette adresse.'],
    action: 'Confirmer mon adresse email', notice: 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.' },
  { type: 'invite', subject: 'ESCEN · Votre invitation au portail', title: 'Votre accès au portail ESCEN',
    paragraphs: ['ESCEN vous invite à accéder à son portail de gestion universitaire.', 'Utilisez le bouton ci-dessous pour accepter votre invitation et définir votre mot de passe.'],
    action: 'Activer mon accès', notice: 'Si cette invitation ne vous est pas destinée, ignorez ce message.' },
  { type: 'magic_link', subject: 'ESCEN · Votre lien de connexion', title: 'Connectez-vous à votre espace',
    paragraphs: ['Un lien de connexion à votre compte ESCEN a été demandé.', 'Utilisez le bouton ci-dessous pour accéder à votre espace.'],
    action: 'Accéder à mon espace', notice: 'Si vous n’avez pas demandé ce lien, ignorez ce message.' },
  { type: 'email_change', subject: 'ESCEN · Confirmez le changement d’adresse email', title: 'Confirmez votre adresse email',
    paragraphs: ['Un changement d’adresse email a été demandé pour votre compte ESCEN.', 'Suivez le lien ci-dessous pour confirmer cette étape du changement.'],
    action: 'Confirmer le changement', notice: 'Si vous n’avez pas demandé ce changement, ne le confirmez pas et contactez l’administration ESCEN.' },
  { type: 'reauthentication', subject: 'ESCEN · Votre code de vérification', title: 'Vérifiez votre identité',
    paragraphs: ['Une vérification de votre identité est nécessaire pour poursuivre une action sur votre compte ESCEN.', 'Saisissez ce code dans le portail pour continuer :'],
    notice: 'Ne partagez ce code avec personne. Si vous n’avez pas demandé cette vérification, ignorez ce message.' },
];

export function renderAuthEmail(template) {
  const action = template.action
    ? `<p style="margin:26px 0"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 20px;border-radius:6px;font-weight:bold;line-height:24px;text-decoration:none">${template.action}</a></p>
<p style="margin:0 0 22px;color:#475569;font-size:14px">Si le bouton ne fonctionne pas, <a href="{{ .ConfirmationURL }}" style="color:#1d4ed8;text-decoration:underline">ouvrez ce lien</a>.</p>`
    : '<p style="margin:26px 0;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:28px;font-weight:bold;letter-spacing:4px;text-align:center">{{ .Token }}</p>';
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${template.subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.6">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0">
<tr><td style="padding:24px;border-bottom:4px solid #2563eb"><p style="margin:0;color:#0f172a;font-size:28px;font-weight:bold;letter-spacing:2px">ESCEN</p><p style="margin:4px 0 0;color:#475569;font-size:13px">École supérieure de commerce et d’économie numérique</p></td></tr>
<tr><td style="padding:28px 24px;overflow-wrap:anywhere">
<p style="margin:0 0 10px;color:#475569;font-size:12px;font-weight:bold;letter-spacing:1px">VOTRE ESPACE ESCEN</p>
<h1 style="margin:0 0 22px;font-size:24px;line-height:1.35">${template.title}</h1>
<p style="margin:0 0 18px">Bonjour,</p>
${template.paragraphs.map(text => `<p style="margin:0 0 18px">${text}</p>`).join('\n')}
${action}
<p style="margin:0 0 22px;color:#475569;font-size:14px">${template.notice}</p>
<p style="margin:0">L’équipe ESCEN</p>
</td></tr>
<tr><td style="padding:20px 24px;border-top:1px solid #e2e8f0;color:#475569;font-size:12px">ESCEN · Gestion universitaire<br>Lomé, Togo<br>Message lié à la sécurité de votre compte ESCEN.</td></tr>
</table>
</td></tr></table>
</body>
</html>
`;
}
