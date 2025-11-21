/**
 * Service d'envoi d'emails
 * Utilise Resend ou peut être adapté pour Nodemailer
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoyer un email (implémentation générique)
 * ⚠️ À adapter selon votre service d'email (Resend, Nodemailer, SendGrid, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // Option 1 : Utiliser Resend (recommandé)
  if (import.meta.env.VITE_RESEND_API_KEY) {
    return sendWithResend(options);
  }

  // Option 2 : Utiliser une Netlify Function qui envoie l'email
  return sendViaNetlifyFunction(options);
}

/**
 * Envoyer via Resend API
 */
async function sendWithResend(options: EmailOptions): Promise<void> {
  const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    throw new Error('VITE_RESEND_API_KEY is required');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Centrinote <noreply@centrinote.fr>',
      to: options.to,
      subject: options.subject,
      html: options.html
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erreur Resend:', error);
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  console.log('✅ Email envoyé via Resend à:', options.to);
}

/**
 * Envoyer via Netlify Function (proxy)
 */
async function sendViaNetlifyFunction(options: EmailOptions): Promise<void> {
  const response = await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erreur envoi email:', error);
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  console.log('✅ Email envoyé via Netlify Function à:', options.to);
}

/**
 * Générer le HTML de l'email de confirmation
 */
export function generateConfirmationEmailHTML(
  email: string,
  confirmationUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmez votre compte Centrinote</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">

  <!-- Container principal -->
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Carte email -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%); padding: 40px 30px; text-align: center;">

              <!-- Logo Centrinote -->
              <div style="width: 80px; height: 80px; background-color: #ffffff; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>

              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3;">
                Bienvenue sur Centrinote !
              </h1>

              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Plus qu'une étape pour commencer
              </p>
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Message de bienvenue -->
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${email}</strong> 👋
              </p>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Merci d'avoir créé un compte sur <strong>Centrinote</strong>, votre assistant intelligent pour organiser vos notes, réunions et connaissances.
              </p>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Pour activer votre compte et commencer à utiliser toutes nos fonctionnalités, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :
              </p>

              <!-- Bouton CTA principal -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${confirmationUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      ✅ Confirmer mon email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien alternatif -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Le bouton ne fonctionne pas ?
                </p>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                  Copiez et collez ce lien dans votre navigateur :
                </p>
                <p style="margin: 10px 0 0 0; word-break: break-all;">
                  <a href="${confirmationUrl}" style="color: #3b82f6; text-decoration: none; font-size: 13px;">
                    ${confirmationUrl}
                  </a>
                </p>
              </div>

              <!-- Note de sécurité -->
              <div style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                  <strong>⏰ Important :</strong> Ce lien de confirmation est valide pendant <strong>24 heures</strong>. Si vous n'avez pas créé de compte sur Centrinote, vous pouvez ignorer cet email en toute sécurité.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">

              <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                L'équipe Centrinote
              </p>

              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Des questions ? Consultez notre <a href="https://centrinote.fr/faq" style="color: #3b82f6; text-decoration: none;">FAQ</a> ou contactez notre <a href="https://centrinote.fr/support" style="color: #3b82f6; text-decoration: none;">support</a>.
              </p>

              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 11px;">
                © 2025 Centrinote. Tous droits réservés.<br>
                Cet email a été envoyé à ${email}
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * Envoyer un email de confirmation
 */
export async function sendConfirmationEmail(
  email: string,
  token: string
): Promise<void> {
  const confirmationUrl = `${window.location.origin}/confirm-email?token=${token}`;

  const html = generateConfirmationEmailHTML(email, confirmationUrl);

  await sendEmail({
    to: email,
    subject: 'Confirmez votre compte Centrinote',
    html
  });

  console.log('✅ Email de confirmation envoyé à:', email);
}
