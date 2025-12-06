/**
 * Edge Function pour le Chatbot Centrinote
 * Gère les interactions avec l'IA et l'escalation vers email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface ChatbotRequest {
  action: 'chat' | 'escalate';
  message?: string;
  userId: string;
  userEmail: string;
  userName: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  ticketId?: string;
}

interface ChatbotResponse {
  message: string;
  requiresEscalation: boolean;
  confidence?: number;
  ticketId?: string;
  emailDraft?: string;
}

interface EscalationResponse {
  ticketId: string;
  status: 'created' | 'sent';
  estimatedResponseTime: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders
    });
  }

  // Vérifier que c'est une requête POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Vérifier que OPENAI_API_KEY est configuré
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: OPENAI_API_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parser le body de la requête
    let request: ChatbotRequest;
    try {
      request = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.action === 'chat') {
      return await handleChat(request, supabase);
    } else if (request.action === 'escalate') {
      return await handleEscalation(request, supabase);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Erreur chatbot-handler:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Gère les messages de chat avec l'IA
 */
async function handleChat(
  request: ChatbotRequest,
  supabase: any
): Promise<Response> {
  if (!request.message) {
    return new Response(
      JSON.stringify({ error: 'Message is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Compter le nombre d'échanges dans l'historique
    const exchangeCount = (request.conversationHistory || []).length;
    const shouldEscalate = exchangeCount >= 3; // Escalation après 3 échanges minimum

    // Construire le contexte pour l'IA
    const systemPrompt = `Tu es l'assistant Centrinote, un assistant intelligent pour l'application Centrinote.

Centrinote est une plateforme de gestion de connaissances avec les fonctionnalités suivantes:

1. **Gestion de documents et notes** : Création, édition, organisation de notes avec recherche IA
2. **Vocabulaire et flashcards** : Apprentissage de vocabulaire avec système de révision adaptatif
3. **Planification de tâches** : Gestion de tâches avec notifications et rappels
4. **Collaboration et réunions** : Réunions vidéo intégrées, partage de documents
5. **Recherche IA** : Recherche intelligente dans tout le contenu
6. **Automatisations** : Système d'automatisation pour :
   - Citations quotidiennes de motivation
   - Résumés hebdomadaires de progression
   - Bilans mensuels
   - Rappels de révision
   - Notifications personnalisées

**Comment fonctionnent les automatisations dans Centrinote :**
- Les automatisations sont des règles "Si... Alors..." (style IFTTT)
- Elles peuvent être déclenchées par des événements (heure, date, action utilisateur)
- Elles peuvent envoyer des emails, des notifications, ou exécuter des actions
- Elles sont configurables dans la section "Automatisations" des paramètres
- Exemples : "Tous les jours à 9h, envoyer une citation de motivation", "Chaque lundi, envoyer un résumé hebdomadaire"

Ton rôle est d'aider les utilisateurs à:
- Comprendre comment utiliser les fonctionnalités de Centrinote
- Expliquer en détail comment fonctionnent les automatisations
- Résoudre des problèmes techniques
- Guider les utilisateurs vers les bonnes sections

**IMPORTANT** : 
- Réponds TOUJOURS d'abord à la question de l'utilisateur de manière complète et détaillée
- Ne propose l'escalation vers email QUE si :
  1. Tu as déjà répondu à la question mais l'utilisateur indique que ça ne fonctionne pas
  2. OU si tu ne peux vraiment pas répondre après avoir essayé
  3. OU si l'utilisateur demande explicitement à contacter le support
- Réponds toujours en français de manière amicale et professionnelle
- Sois précis et donne des exemples concrets quand c'est possible`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(request.conversationHistory || []).slice(-5),
      { role: 'user', content: request.message }
    ];

    // Appel à OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const openaiData = await openaiResponse.json();
    const aiMessage = openaiData.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.';
    
    // Calculer la confiance (amélioré)
    const confidence = calculateConfidence(aiMessage, request.message, exchangeCount);

    // Vérifier si l'utilisateur demande explicitement de l'aide supplémentaire
    const userMessageLower = request.message.toLowerCase();
    const needsEscalation = 
      shouldEscalate || // Après 3+ échanges
      confidence < 0.5 || // Confiance très faible
      userMessageLower.includes('ça ne marche pas') ||
      userMessageLower.includes('ça ne fonctionne pas') ||
      userMessageLower.includes('problème persiste') ||
      userMessageLower.includes('toujours pas') ||
      userMessageLower.includes('contact support') ||
      userMessageLower.includes('parler à un humain');

    // Si besoin d'escalation, proposer après la réponse
    if (needsEscalation && exchangeCount >= 2) {
      const ticketId = await createSupportTicket(request, supabase, false);
      const emailDraft = generateEmailDraft(request, aiMessage);

      const response: ChatbotResponse = {
        message: `${aiMessage}\n\n---\n\nSi le problème persiste ou si vous avez besoin d'aide supplémentaire, je peux vous aider à rédiger un email à notre équipe de support. Souhaitez-vous que je crée cet email ?`,
        requiresEscalation: true,
        confidence,
        ticketId,
        emailDraft
      };

      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Réponse normale sans escalation
    const response: ChatbotResponse = {
      message: aiMessage,
      requiresEscalation: false,
      confidence
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erreur handleChat:', error);
    
    // En cas d'erreur technique, proposer l'escalation
    const ticketId = await createSupportTicket(request, supabase, false);
    const emailDraft = generateEmailDraft(request, 'Erreur technique lors du traitement de la demande.');

    const response: ChatbotResponse = {
      message: 'Je rencontre une difficulté technique. Souhaitez-vous que je vous aide à rédiger un email à notre équipe de support ?',
      requiresEscalation: true,
      confidence: 0,
      ticketId,
      emailDraft
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Gère l'escalation vers email
 */
async function handleEscalation(
  request: ChatbotRequest,
  supabase: any
): Promise<Response> {
  try {
    // Créer ou mettre à jour le ticket
    const ticketId = request.ticketId || await createSupportTicket(request, supabase, true);
    
    // Envoyer l'email à l'équipe admin
    await sendEmailToAdmin(request, ticketId, supabase);

    const response: EscalationResponse = {
      ticketId,
      status: 'sent',
      estimatedResponseTime: '24h'
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erreur handleEscalation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Calcule la confiance de la réponse (amélioré)
 */
function calculateConfidence(aiMessage: string, userMessage: string, exchangeCount: number): number {
  // Mots-clés indiquant une réponse complète et utile
  const positiveKeywords = [
    'voici', 'vous pouvez', 'pour cela', 'étapes', 'solution', 'comment',
    'dans', 'section', 'paramètres', 'cliquez', 'allez', 'utilisez',
    'fonctionne', 'automatisation', 'règle', 'déclencheur', 'action'
  ];
  const negativeKeywords = [
    'je ne sais pas', 'désolé je ne peux pas', 'impossible de',
    'je ne comprends pas', 'je ne peux pas vous aider'
  ];
  
  let confidence = 0.75; // Base plus élevée
  
  const lowerMessage = aiMessage.toLowerCase();
  const lowerUserMessage = userMessage.toLowerCase();
  
  // Augmenter la confiance si la réponse contient des mots-clés positifs
  positiveKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      confidence += 0.05;
    }
  });
  
  // Diminuer la confiance si la réponse contient des mots-clés négatifs
  negativeKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      confidence -= 0.3;
    }
  });
  
  // Si la réponse est très courte, diminuer la confiance
  if (aiMessage.length < 50) {
    confidence -= 0.15;
  }
  
  // Si la réponse est longue et détaillée, augmenter la confiance
  if (aiMessage.length > 200) {
    confidence += 0.1;
  }
  
  // Augmenter la confiance si la réponse contient des instructions spécifiques
  if (lowerMessage.includes('1.') || lowerMessage.includes('étape') || lowerMessage.includes('première')) {
    confidence += 0.1;
  }
  
  // Après plusieurs échanges, la confiance diminue légèrement
  if (exchangeCount > 2) {
    confidence -= 0.1;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Crée un ticket de support dans la base de données
 */
async function createSupportTicket(
  request: ChatbotRequest,
  supabase: any,
  escalated: boolean
): Promise<string> {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: request.userId === 'anonymous' ? null : request.userId,
      user_email: request.userEmail,
      user_name: request.userName,
      subject: escalated 
        ? `Demande de support - ${request.userName}`
        : `Question chatbot - ${request.userName}`,
      content: formatConversationHistory(request.conversationHistory || []),
      status: 'open',
      priority: 'normal',
      source: 'chatbot',
      escalated: escalated,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur création ticket:', error);
    // Générer un ID temporaire si la création échoue
    return `temp-${Date.now()}`;
  }

  return data.id;
}

/**
 * Formate l'historique de conversation pour le ticket
 */
function formatConversationHistory(history: Array<{ role: string; content: string }>): string {
  return history
    .map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
}

/**
 * Génère un brouillon d'email
 */
function generateEmailDraft(request: ChatbotRequest, aiMessage: string): string {
  return `Bonjour,

Je contacte le support Centrinote concernant une question que j'ai posée via le chatbot.

Question initiale: ${request.message}

Réponse du chatbot: ${aiMessage}

Je souhaiterais obtenir de l'aide supplémentaire sur ce sujet.

Cordialement,
${request.userName}
${request.userEmail}`;
}

/**
 * Envoie l'email à l'équipe admin
 */
async function sendEmailToAdmin(
  request: ChatbotRequest,
  ticketId: string,
  supabase: any
): Promise<void> {
  try {
    // Appeler l'Edge Function automation-email pour envoyer l'email
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/automation-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        to: 'contact@centrinote.fr',
        subject: `[Ticket #${ticketId}] Demande de support - ${request.userName}`,
        html: `
          <h2>Nouvelle demande de support via chatbot</h2>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Utilisateur:</strong> ${request.userName} (${request.userEmail})</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <h3>Historique de la conversation:</h3>
          <pre>${formatConversationHistory(request.conversationHistory || [])}</pre>
          <p><a href="${SUPABASE_URL.replace('/rest/v1', '')}/admin/tickets/${ticketId}">Voir le ticket</a></p>
        `,
        text: `
          Nouvelle demande de support via chatbot
          
          Ticket ID: ${ticketId}
          Utilisateur: ${request.userName} (${request.userEmail})
          Date: ${new Date().toLocaleString('fr-FR')}
          
          Historique de la conversation:
          ${formatConversationHistory(request.conversationHistory || [])}
        `
      })
    });

    if (!emailResponse.ok) {
      console.error('Erreur envoi email:', await emailResponse.text());
    }
  } catch (error) {
    console.error('Erreur sendEmailToAdmin:', error);
    // Ne pas faire échouer la requête si l'email échoue
  }
}

