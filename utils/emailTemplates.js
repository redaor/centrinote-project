// 📧 Email Templates - Utilitaire pour envoyer des emails via Resend
// Utilisé par les Netlify Functions pour envoyer des emails d'invitation et de résumé

let Resend;
try {
  Resend = require('resend').Resend;
} catch (error) {
  console.warn('⚠️ Resend module not available:', error.message);
  Resend = null;
}

// Initialiser Resend de manière lazy (seulement quand nécessaire)
let resend = null;
function getResend() {
  if (!Resend) {
    throw new Error('Resend module not available. Make sure resend package is installed.');
  }
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

/**
 * Templates d'email disponibles
 */
const templates = {
  invitation: {
    subject: (vars) => `Invitation à la réunion : ${vars.meetingTitle || 'Réunion'}`,
    html: (vars) => {
      const { recipientName, organizerName, meetingTitle, meetingDescription, scheduledAt, durationMinutes, tokenUrl, roomUrl } = vars;
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation à la réunion</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Invitation à la réunion</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Bonjour ${recipientName || 'Cher/Chère participant(e)'},</p>
    
    <p><strong>${organizerName || 'Un organisateur'}</strong> vous invite à participer à la réunion :</p>
    
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea;">${meetingTitle || 'Réunion'}</h2>
      ${meetingDescription ? `<p style="color: #666;">${meetingDescription}</p>` : ''}
      ${scheduledAt ? `<p><strong>📅 Date et heure :</strong> ${scheduledAt}</p>` : ''}
      ${durationMinutes ? `<p><strong>⏱ Durée :</strong> ${durationMinutes} minutes</p>` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${tokenUrl || roomUrl}" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Rejoindre la réunion
      </a>
    </div>
    
    ${roomUrl ? `<p style="text-align: center; color: #666; font-size: 14px;">Ou copiez ce lien : <br><a href="${roomUrl}" style="color: #667eea; word-break: break-all;">${roomUrl}</a></p>` : ''}
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Cet email a été envoyé depuis <strong>Centrinote</strong><br>
      Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
    </p>
  </div>
</body>
</html>
      `.trim();
    }
  },
  
  summary: {
    subject: (vars) => `Résumé de la réunion : ${vars.meetingTitle || 'Réunion'}`,
    html: (vars) => {
      const { recipientName, meetingTitle, summary, transcript, participants, roomUrl } = vars;
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Résumé de la réunion</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Résumé de la réunion</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Bonjour ${recipientName || 'Cher/Chère participant(e)'},</p>
    
    <p>Voici le résumé de la réunion <strong>${meetingTitle || 'Réunion'}</strong> :</p>
    
    ${summary ? `
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">📝 Résumé</h3>
      <div style="white-space: pre-wrap;">${summary}</div>
    </div>
    ` : ''}
    
    ${transcript ? `
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
      <h3 style="margin-top: 0; color: #28a745;">📄 Transcription</h3>
      <div style="white-space: pre-wrap; max-height: 300px; overflow-y: auto; font-size: 14px; color: #666;">${transcript}</div>
    </div>
    ` : ''}
    
    ${participants && participants.length > 0 ? `
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">👥 Participants</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${participants.map(p => `<li>${p.name || p.email}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${roomUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${roomUrl}" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Voir la réunion
      </a>
    </div>
    ` : ''}
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Cet email a été envoyé depuis <strong>Centrinote</strong>
    </p>
  </div>
</body>
</html>
      `.trim();
    }
  }
};

/**
 * Envoie un email en utilisant un template
 * @param {Object} options - Options d'envoi
 * @param {string} options.to - Adresse email du destinataire
 * @param {string} options.template - Nom du template ('invitation' ou 'summary')
 * @param {Object} options.vars - Variables pour le template
 * @param {string} [options.from] - Adresse email expéditrice (optionnel)
 * @returns {Promise<Object>} Résultat de l'envoi avec messageId
 */
async function sendEmailTemplate({ to, template, vars, from }) {
  if (!to) {
    throw new Error('Adresse email destinataire requise');
  }

  if (!template || !templates[template]) {
    throw new Error(`Template "${template}" non trouvé. Templates disponibles: ${Object.keys(templates).join(', ')}`);
  }

  const templateConfig = templates[template];
  const subject = typeof templateConfig.subject === 'function' 
    ? templateConfig.subject(vars) 
    : templateConfig.subject;
  const html = typeof templateConfig.html === 'function'
    ? templateConfig.html(vars)
    : templateConfig.html;

  try {
    const resendClient = getResend();
    const emailFrom = from || process.env.RESEND_FROM_EMAIL || process.env.VITE_RESEND_FROM_EMAIL || 'noreply@centrinote.fr';
    
    const { data, error } = await resendClient.emails.send({
      from: emailFrom,
      to: [to],
      subject,
      html
    });

    if (error) {
      console.error('❌ Erreur envoi email Resend:', error);
      throw new Error(`Erreur envoi email: ${error.message || JSON.stringify(error)}`);
    }

    console.log('✅ Email envoyé avec succès:', data?.id);
    return {
      messageId: data?.id || 'unknown',
      success: true
    };
  } catch (error) {
    console.error('❌ Erreur sendEmailTemplate:', error);
    throw error;
  }
}

module.exports = {
  sendEmailTemplate,
  templates
};

