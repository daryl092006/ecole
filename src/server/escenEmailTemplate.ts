import 'server-only';

/**
 * Template officiel ESCEN aligné sur la charte graphique des e-mails du projet CRM ESCEN
 * (En-tête avec logo officiel LOGO_ESCEN_WEB.png, bordure #01b4d5, cartes d'identifiants et pied de page réseaux sociaux).
 */
export function buildEscenEmailHtml(bodyContent: string, footerNote = 'Support Informatique ESCEN — support.informatique@escen.university'): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESCEN</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td style="background: #ffffff; padding: 36px 20px 28px 20px; text-align: center; border-bottom: 4px solid #01b4d5;">
              <a href="https://escen.university/" target="_blank" style="text-decoration:none; display:block;">
                <img src="https://escen.university/logo/LOGO_ESCEN_WEB.png" alt="ESCEN" width="500" style="width: 500px; max-width: 95%; height: auto; display: block; margin: 0 auto 12px auto; border:0;" />
              </a>
              <p style="color:#01b4d5; font-size:13px; margin:6px 0 0 0; text-transform:uppercase; letter-spacing:0.22em; font-weight: 900;">ÉCOLE SUPÉRIEURE DE COMMERCE ET D'ÉCONOMIE NUMÉRIQUE</p>
            </td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="padding: 36px 40px; color:#1e293b; font-size:15px; line-height:1.7;">
              ${bodyContent}
            </td>
          </tr>

          <!-- ═══ DIVIDER ═══ -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height:1px; background:linear-gradient(90deg, transparent, #e2e8f0, transparent);"></div>
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background: #f8fafc; padding: 28px 32px; text-align:center; border-top: 1px solid #e2e8f0;">

              <p style="color:#475569; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 16px 0; font-weight:600;">Retrouvez-nous sur</p>

              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="https://escen.university/" target="_blank" style="display:inline-block; background:rgba(34,199,232,0.1); border:1px solid rgba(34,199,232,0.2); border-radius:50%; width:36px; height:36px; text-align:center; text-decoration:none;" title="Site Web">
                      <img src="https://img.icons8.com/ios-filled/20/22c7e8/globe.png" width="20" height="20" alt="Site Web" style="display:block; margin:8px auto 0 auto; border:0;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://www.linkedin.com/company/escenofficiel/" target="_blank" style="display:inline-block; background:rgba(34,199,232,0.1); border:1px solid rgba(34,199,232,0.2); border-radius:50%; width:36px; height:36px; text-align:center; text-decoration:none;" title="LinkedIn">
                      <img src="https://img.icons8.com/ios-filled/20/22c7e8/linkedin.png" width="20" height="20" alt="LinkedIn" style="display:block; margin:8px auto 0 auto; border:0;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://www.facebook.com/escenofficiel" target="_blank" style="display:inline-block; background:rgba(34,199,232,0.1); border:1px solid rgba(34,199,232,0.2); border-radius:50%; width:36px; height:36px; text-align:center; text-decoration:none;" title="Facebook">
                      <img src="https://img.icons8.com/ios-filled/20/22c7e8/facebook-new.png" width="20" height="20" alt="Facebook" style="display:block; margin:8px auto 0 auto; border:0;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://www.instagram.com/escenofficiel?igsh=aGk4eWl6OGkycHd6" target="_blank" style="display:inline-block; background:rgba(34,199,232,0.1); border:1px solid rgba(34,199,232,0.2); border-radius:50%; width:36px; height:36px; text-align:center; text-decoration:none;" title="Instagram">
                      <img src="https://img.icons8.com/ios-filled/20/22c7e8/instagram-new.png" width="20" height="20" alt="Instagram" style="display:block; margin:8px auto 0 auto; border:0;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://wa.me/22898012727" target="_blank" style="display:inline-block; background:rgba(34,199,232,0.1); border:1px solid rgba(34,199,232,0.2); border-radius:50%; width:36px; height:36px; text-align:center; text-decoration:none;" title="WhatsApp">
                      <img src="https://img.icons8.com/ios-filled/20/22c7e8/whatsapp.png" width="20" height="20" alt="WhatsApp" style="display:block; margin:8px auto 0 auto; border:0;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="http://tiktok.com/@escen_university" target="_blank" style="display:inline-block; background:rgba(34,199,232,0.1); border:1px solid rgba(34,199,232,0.2); border-radius:50%; width:36px; height:36px; text-align:center; text-decoration:none;" title="TikTok">
                      <img src="https://img.icons8.com/ios-filled/20/22c7e8/tiktok.png" width="20" height="20" alt="TikTok" style="display:block; margin:8px auto 0 auto; border:0;" />
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#0f172a; font-size:12px; font-weight:700; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:0.08em;">ESCEN</p>
              <p style="color:#475569; font-size:11px; margin:0 0 12px 0;">École Supérieure de Commerce et d'Économie Numérique</p>
              <p style="color:#64748b; font-size:10px; margin:0; line-height:1.5;">${footerNote}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
