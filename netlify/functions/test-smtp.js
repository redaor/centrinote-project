// 🧪 Fonction de test SMTP pour diagnostiquer l'envoi d'emails
const { sendEmailTemplate } = require('../../utils/emailTemplates.cjs');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🧪 [TEST-SMTP] Requête reçue');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Vérifier les variables d'environnement SMTP
    const smtpConfig = {
      SMTP_HOST: process.env.SMTP_HOST ? '✅ Configuré' : '❌ Manquant',
      SMTP_PORT: process.env.SMTP_PORT || 'Non défini',
      SMTP_USER: process.env.SMTP_USER ? '✅ Configuré' : '❌ Manquant',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '✅ Configuré' : '❌ Manquant',
      SMTP_FROM: process.env.SMTP_FROM || 'Non défini',
    };

    console.log('📋 [TEST-SMTP] Configuration SMTP:', {
      ...smtpConfig,
      SMTP_PASSWORD: smtpConfig.SMTP_PASSWORD === '✅ Configuré' ? '✅ Configuré' : '❌ Manquant',
      SMTP_USER: smtpConfig.SMTP_USER === '✅ Configuré' ? process.env.SMTP_USER : '❌ Manquant',
    });

    // Si GET, retourner juste la configuration (sans les valeurs sensibles)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          smtpConfig,
          message: 'Utilisez POST avec {to: "email@example.com"} pour envoyer un email de test'
        })
      };
    }

    // Si POST, envoyer un email de test
    const { to } = JSON.parse(event.body || '{}');
    
    if (!to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Email destinataire requis',
          usage: 'POST avec {to: "email@example.com"}'
        })
      };
    }

    // Vérifier que la configuration SMTP est complète
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Configuration SMTP incomplète',
          smtpConfig,
          required: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']
        })
      };
    }

    console.log(`📧 [TEST-SMTP] Tentative d'envoi d'email de test à: ${to}`);

    // Envoyer un email de test avec le template invitation
    const testResult = await sendEmailTemplate({
      to,
      template: 'invitation',
      vars: {
        recipientName: 'Test User',
        organizerName: 'Centrinote Test',
        meetingTitle: 'Test SMTP Configuration',
        meetingDescription: 'Cet email vérifie que la configuration SMTP fonctionne correctement.',
        scheduledAt: new Date().toLocaleString('fr-FR', {
          dateStyle: 'full',
          timeStyle: 'short'
        }),
        durationMinutes: 30,
        tokenUrl: 'https://centrinote.fr/meetings/test',
        roomUrl: 'https://centrinote.daily.co/test-room',
      }
    });

    console.log('✅ [TEST-SMTP] Email envoyé avec succès:', testResult.messageId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email de test envoyé avec succès',
        messageId: testResult.messageId,
        to,
        smtpConfig: {
          ...smtpConfig,
          SMTP_PASSWORD: '✅ Configuré (masqué)',
          SMTP_USER: process.env.SMTP_USER,
        }
      })
    };

  } catch (error) {
    console.error('❌ [TEST-SMTP] Erreur:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur lors du test SMTP',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        smtpConfig: {
          SMTP_HOST: process.env.SMTP_HOST ? '✅ Configuré' : '❌ Manquant',
          SMTP_PORT: process.env.SMTP_PORT || 'Non défini',
          SMTP_USER: process.env.SMTP_USER ? '✅ Configuré' : '❌ Manquant',
          SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '✅ Configuré' : '❌ Manquant',
        }
      })
    };
  }
};

