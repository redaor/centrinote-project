// 📧 Service d'envoi d'emails avec templates MJML
const nodemailer = require('nodemailer');
const mjml = require('mjml');
const fs = require('fs').promises;
const path = require('path');

// Configuration SMTP depuis variables d'environnement
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'Centrinote <contact@centrinote.fr>';

let transporter = null;

/**
 * Initialise le transporteur SMTP
 */
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('Configuration SMTP manquante (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true pour 465 (SSL/TLS), false pour 587 (STARTTLS)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
    // Configuration SSL/TLS pour Ionos
    tls: {
      rejectUnauthorized: false, // Pour éviter les erreurs de certificat
    },
  });

  return transporter;
}

/**
 * Templates MJML intégrés directement (car Netlify Functions n'a pas accès aux fichiers)
 */
const templates = {
  invitation: `<mjml>
  <mj-head>
    <mj-title>Invitation à une réunion Centrinote</mj-title>
    <mj-style>
      .primary-button {
        background-color: #2563eb;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        display: inline-block;
        font-weight: 600;
      }
    </mj-style>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#1f2937">
          Bonjour {{recipientName}} !
        </mj-text>
        <mj-text color="#4b5563">
          <strong>{{organizerName}}</strong> vous invite à une réunion sur Centrinote.
        </mj-text>
        
        <mj-divider border-color="#e5e7eb" />
        
        <mj-text font-size="18px" font-weight="bold" color="#1f2937">
          {{meetingTitle}}
        </mj-text>
        
        {{#if meetingDescription}}
        <mj-text color="#6b7280">
          {{meetingDescription}}
        </mj-text>
        {{/if}}
        
        {{#if scheduledAt}}
        <mj-text>
          📅 <strong>Date :</strong> {{scheduledAt}}
        </mj-text>
        {{/if}}
        
        <mj-text>
          ⏱️ <strong>Durée :</strong> {{durationMinutes}} minutes
        </mj-text>
        
        <mj-spacer height="20px" />
        
        <mj-button css-class="primary-button" href="{{roomUrl}}">
          Rejoindre la réunion
        </mj-button>
        
        <mj-spacer height="20px" />
        
        <mj-text font-size="12px" color="#9ca3af">
          Vous pouvez également rejoindre directement via ce lien :<br />
          <a href="{{roomUrl}}" style="color: #2563eb;">{{roomUrl}}</a>
        </mj-text>
        
        <mj-text font-size="12px" color="#9ca3af">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br />
          <span style="word-break: break-all;">{{roomUrl}}</span>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
  relance: `<mjml>
  <mj-head>
    <mj-title>Rappel : Réunion Centrinote</mj-title>
    <mj-style>
      .primary-button {
        background-color: #2563eb;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        display: inline-block;
        font-weight: 600;
      }
    </mj-style>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#1f2937">
          Rappel de réunion
        </mj-text>
        <mj-text color="#4b5563">
          Nous vous rappelons que vous êtes invité(e) à la réunion <strong>{{meetingTitle}}</strong>.
        </mj-text>

        {{#if scheduledAt}}
        <mj-text>
          📅 <strong>Date :</strong> {{scheduledAt}}
        </mj-text>
        {{/if}}

        <mj-spacer height="20px" />

        <mj-button css-class="primary-button" href="{{roomUrl}}">
          Rejoindre maintenant
        </mj-button>

        <mj-text font-size="12px" color="#9ca3af">
          Lien direct : <a href="{{roomUrl}}" style="color: #2563eb;">{{roomUrl}}</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
  summary: `<mjml>
  <mj-head>
    <mj-title>Résumé de réunion - {{meetingTitle}}</mj-title>
    <mj-style>
      .primary-button {
        background-color: #2563eb;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        display: inline-block;
        font-weight: 600;
      }
      .info-box {
        background-color: #f3f4f6;
        padding: 16px;
        border-radius: 6px;
        margin: 16px 0;
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f9fafb">
    <mj-section background-color="#ffffff" padding="40px">
      <mj-column>
        <mj-text font-size="24px" font-weight="bold" color="#1f2937" padding-bottom="20px">
          📊 Résumé de réunion
        </mj-text>

        <mj-text font-size="16px" color="#4b5563">
          Bonjour <strong>{{recipientName}}</strong> !
        </mj-text>

        <mj-divider border-color="#e5e7eb" padding="20px 0" />

        <mj-text font-size="18px" font-weight="bold" color="#1f2937">
          {{meetingTitle}}
        </mj-text>

        <mj-text font-size="14px" color="#6b7280" padding-bottom="10px">
          📅 {{meetingDate}}
        </mj-text>

        <mj-text font-size="16px" color="#374151" line-height="1.6" padding="20px 0">
          {{summaryText}}
        </mj-text>

        <mj-spacer height="30px" />

        <mj-text font-size="12px" color="#9ca3af" align="center">
          Ce résumé a été généré automatiquement par Centrinote
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f9fafb" padding="20px">
      <mj-column>
        <mj-text font-size="11px" color="#9ca3af" align="center">
          © 2025 Centrinote - Votre assistant de réunions intelligent
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
};

/**
 * Charge un template MJML (depuis templates intégrés ou fichier)
 */
async function loadTemplate(templateName) {
  // D'abord essayer les templates intégrés (pour Netlify Functions)
  if (templates[templateName]) {
    return templates[templateName];
  }
  
  // Sinon essayer de charger depuis un fichier (pour développement local)
  try {
    // Plusieurs chemins possibles selon l'environnement
    const possiblePaths = [
      path.join(__dirname, '../templates', `${templateName}.mjml`),
      path.join(process.cwd(), 'templates', `${templateName}.mjml`),
      path.join(__dirname, '../../templates', `${templateName}.mjml`),
    ];
    
    for (const templatePath of possiblePaths) {
      try {
        const template = await fs.readFile(templatePath, 'utf8');
        return template;
      } catch (err) {
        // Continuer avec le chemin suivant
        continue;
      }
    }
    
    throw new Error(`Template ${templateName} non trouvé dans aucun chemin`);
  } catch (error) {
    throw new Error(`Template ${templateName} non trouvé: ${error.message}`);
  }
}

/**
 * Remplace les variables dans un template
 */
function replaceVariables(template, vars) {
  let result = template;
  
  // Remplacer {{variable}} par la valeur
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }

  return result;
}

/**
 * Compile un template MJML en HTML
 */
function compileMJML(mjmlTemplate) {
  const { html, errors } = mjml(mjmlTemplate, {
    validationLevel: 'soft',
    minify: false,
  });

  if (errors && errors.length > 0) {
    console.warn('⚠️ [EMAIL] Erreurs MJML (non bloquant):', errors);
  }

  return html;
}

/**
 * Envoie un email avec un template
 */
async function sendEmailTemplate({ to, template, vars, attachments = [] }) {
  console.log(`📧 [EMAIL] Début envoi email:`, {
    to,
    template,
    from: SMTP_FROM,
    hasVars: !!vars,
  });

  // Vérifier la configuration SMTP
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    const missing = [];
    if (!SMTP_HOST) missing.push('SMTP_HOST');
    if (!SMTP_USER) missing.push('SMTP_USER');
    if (!SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
    throw new Error(`Configuration SMTP manquante: ${missing.join(', ')}`);
  }

  const transporter = getTransporter();
  console.log(`✅ [EMAIL] Transporteur SMTP initialisé:`, {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    user: SMTP_USER,
  });

  // Charger le template
  const mjmlTemplate = await loadTemplate(template);
  console.log(`✅ [EMAIL] Template ${template} chargé`);
  
  // Remplacer les variables
  const mjmlWithVars = replaceVariables(mjmlTemplate, vars);
  
  // Compiler en HTML
  const html = compileMJML(mjmlWithVars);
  console.log(`✅ [EMAIL] Template compilé en HTML (${html.length} caractères)`);

  // Générer le sujet depuis les variables (si présent)
  let subject = vars.subject;
  if (!subject) {
    if (template === 'invitation') {
      subject = 'Centrinote - Invitation à une réunion';
    } else if (template === 'relance') {
      subject = 'Centrinote - Relance réunion';
    } else if (template === 'summary') {
      subject = `Résumé de réunion : ${vars.meetingTitle || 'Réunion'}`;
    } else {
      subject = 'Centrinote';
    }
  }

  console.log(`📤 [EMAIL] Envoi en cours...`, {
    from: SMTP_FROM,
    to,
    subject,
    attachmentsCount: attachments.length,
  });

  // Envoyer l'email
  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
    attachments,
  });

  console.log('✅ [EMAIL] Email envoyé avec succès:', {
    to,
    template,
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  return info;
}

module.exports = {
  sendEmailTemplate,
  getTransporter,
  compileMJML,
};

