/**
 * Edge Function: issue-tracker
 *
 * Middleware intelligent pour détecter et gérer les problèmes utilisateurs
 * Architecture: chatbot-handler → issue-tracker → chat-memory → OpenAI
 *
 * Fonctionnalités:
 * - Détection d'intention stricte (tutoriel vs diagnostic)
 * - Gestion d'état des problèmes (reported → in_progress → resolved → escalated)
 * - Boutons de validation interactifs
 * - Escalade intelligente après 2-3 tentatives
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// Types
// ============================================================================

interface IssueTrackerRequest {
  user_id: string;
  message: string;
  conversation_id?: string;
  button_clicked?: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other';
}

interface IssueTrackerResponse {
  intent: 'tutorial' | 'diagnostic' | 'resolved' | 'escalate';
  feature?: string; // ex: "note_creation", "vocabulary_add"
  issue_state?: UserIssueState;
  buttons?: ValidationButton[];
  should_call_chat_memory: boolean;
  response_override?: string; // Réponse directe sans appeler chat-memory
}

interface UserIssueState {
  id: string;
  user_id: string;
  feature: string;
  status: 'reported' | 'in_progress' | 'resolved' | 'escalated';
  last_step?: string;
  attempt_count: number;
  blocking_point?: string;
  original_message: string;
  interaction_history: any[];
  created_at: string;
  updated_at: string;
}

interface ValidationButton {
  id: string;
  label: string;
  action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other';
  emoji: string;
}

// ============================================================================
// Détection d'intention
// ============================================================================

/**
 * Détecte l'intention de l'utilisateur et la fonctionnalité concernée
 */
function detectIntent(message: string, buttonClicked?: string): {
  intent: 'tutorial' | 'diagnostic' | 'resolved' | 'escalate' | 'unknown';
  feature?: string;
  blockingSignal: boolean;
} {
  const lowerMsg = message.toLowerCase();

  // 1. Détecter si l'utilisateur confirme que ça fonctionne
  if (
    buttonClicked === 'works' ||
    (lowerMsg.includes('ça marche') || lowerMsg.includes('ça fonctionne') ||
     lowerMsg.includes('résolu') || lowerMsg.includes('merci') ||
     lowerMsg.includes('parfait') || lowerMsg.includes('c\'est bon')) &&
    !lowerMsg.includes('pas') && !lowerMsg.includes('non')
  ) {
    return { intent: 'resolved', blockingSignal: false };
  }

  // 2. Détecter si l'utilisateur demande explicitement le support
  if (
    lowerMsg.includes('contact support') ||
    lowerMsg.includes('parler à un humain') ||
    lowerMsg.includes('aide supplémentaire') ||
    lowerMsg.includes('ça ne marche toujours pas')
  ) {
    return { intent: 'escalate', blockingSignal: true };
  }

  // 3. Détecter les signaux de blocage
  const blockingKeywords = [
    'bloqué', 'ça ne marche pas', 'ça ne fonctionne pas',
    'problème', 'erreur', 'bug', 'impossible',
    'ne trouve pas', 'pas de bouton', 'bouton manquant',
    'toujours pas', 'encore pas', 'ne comprends pas',
    'aide', 'comment faire', 'où est'
  ];

  const hasBlockingSignal = blockingKeywords.some(kw => lowerMsg.includes(kw)) ||
                           buttonClicked === 'still_blocked' ||
                           buttonClicked === 'cant_find_button' ||
                           buttonClicked === 'save_error';

  // 4. Identifier la fonctionnalité concernée
  let feature: string | undefined;

  // Notes
  if (lowerMsg.includes('note') || lowerMsg.includes('document')) {
    if (lowerMsg.includes('créer') || lowerMsg.includes('nouvelle')) {
      feature = 'note_creation';
    } else if (lowerMsg.includes('modifier') || lowerMsg.includes('éditer')) {
      feature = 'note_edit';
    } else if (lowerMsg.includes('partager') || lowerMsg.includes('collabor')) {
      feature = 'note_share';
    } else if (lowerMsg.includes('importer') || lowerMsg.includes('import')) {
      feature = 'note_import';
    } else {
      feature = 'note_general';
    }
  }
  // Vocabulaire
  else if (lowerMsg.includes('vocabulaire') || lowerMsg.includes('mot') || lowerMsg.includes('flashcard')) {
    if (lowerMsg.includes('ajouter') || lowerMsg.includes('créer')) {
      feature = 'vocabulary_add';
    } else if (lowerMsg.includes('révision') || lowerMsg.includes('réviser')) {
      feature = 'vocabulary_review';
    } else {
      feature = 'vocabulary_general';
    }
  }
  // Automatisations
  else if (lowerMsg.includes('automation') || lowerMsg.includes('automatisation') || lowerMsg.includes('règle')) {
    if (lowerMsg.includes('créer') || lowerMsg.includes('nouvelle')) {
      feature = 'automation_create';
    } else if (lowerMsg.includes('déclenche') || lowerMsg.includes('exécute')) {
      feature = 'automation_trigger';
    } else {
      feature = 'automation_general';
    }
  }
  // Planification
  else if (lowerMsg.includes('planning') || lowerMsg.includes('rappel') || lowerMsg.includes('tâche')) {
    if (lowerMsg.includes('créer') || lowerMsg.includes('ajouter')) {
      feature = 'planning_add';
    } else if (lowerMsg.includes('notification')) {
      feature = 'planning_notification';
    } else {
      feature = 'planning_general';
    }
  }
  // Réunions
  else if (lowerMsg.includes('réunion') || lowerMsg.includes('meeting') || lowerMsg.includes('visio')) {
    feature = 'meeting_general';
  }

  // 5. Déterminer l'intention finale
  if (!feature) {
    return { intent: 'unknown', blockingSignal: hasBlockingSignal };
  }

  // Si blocage détecté → diagnostic
  if (hasBlockingSignal) {
    return { intent: 'diagnostic', feature, blockingSignal: true };
  }

  // Sinon → tutoriel
  return { intent: 'tutorial', feature, blockingSignal: false };
}

// ============================================================================
// Gestion des états de problèmes
// ============================================================================

/**
 * Récupère le problème actif de l'utilisateur pour une fonctionnalité donnée
 */
async function getActiveIssue(
  userId: string, 
  feature: string,
  conversationId?: string | null
): Promise<UserIssueState | null> {
  let query = supabase
    .from('user_issue_states')
    .select('*')
    .eq('user_id', userId)
    .eq('feature', feature)
    .in('status', ['reported', 'in_progress']);
  
  // ✅ Filtrer par conversation_id si fourni
  if (conversationId) {
    query = query.eq('conversation_id', conversationId);
  }
  
  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[issue-tracker] Erreur récupération problème actif:', error);
    return null;
  }

  return data as UserIssueState | null;
}

/**
 * Crée un nouveau problème
 */
async function createIssue(
  userId: string,
  feature: string,
  originalMessage: string,
  blockingPoint?: string,
  conversationId?: string | null
): Promise<UserIssueState | null> {
  const { data, error } = await supabase
    .from('user_issue_states')
    .insert({
      user_id: userId,
      feature: feature,
      status: 'reported',
      original_message: originalMessage,
      blocking_point: blockingPoint,
      conversation_id: conversationId || null, // ✅ STOCKER conversation_id
      attempt_count: 0,
      interaction_history: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        message: originalMessage
      }]
    })
    .select()
    .single();

  if (error) {
    console.error('[issue-tracker] Erreur création problème:', error);
    return null;
  }

  console.log(`[issue-tracker] Problème créé pour ${feature}:`, data.id);
  return data as UserIssueState;
}

/**
 * Met à jour un problème existant
 */
async function updateIssue(
  issueId: string,
  updates: {
    status?: 'reported' | 'in_progress' | 'resolved' | 'escalated';
    last_step?: string;
    blocking_point?: string;
    ticket_id?: string;
  },
  interactionEntry?: any
): Promise<UserIssueState | null> {
  // Récupérer l'historique actuel
  const { data: currentIssue } = await supabase
    .from('user_issue_states')
    .select('interaction_history, attempt_count')
    .eq('id', issueId)
    .single();

  const history = currentIssue?.interaction_history || [];
  if (interactionEntry) {
    history.push({
      ...interactionEntry,
      timestamp: new Date().toISOString()
    });
  }

  // Incrémenter attempt_count si le statut passe à in_progress
  const attemptCount = updates.status === 'in_progress'
    ? (currentIssue?.attempt_count || 0) + 1
    : currentIssue?.attempt_count || 0;

  const { data, error } = await supabase
    .from('user_issue_states')
    .update({
      ...updates,
      attempt_count: attemptCount,
      interaction_history: history
    })
    .eq('id', issueId)
    .select()
    .single();

  if (error) {
    console.error('[issue-tracker] Erreur mise à jour problème:', error);
    return null;
  }

  console.log(`[issue-tracker] Problème mis à jour:`, data.id, updates);
  return data as UserIssueState;
}

/**
 * Marque un problème comme résolu
 */
async function resolveIssue(issueId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .rpc('resolve_user_issue', {
      p_issue_id: issueId,
      p_user_id: userId
    });

  return data === true;
}

/**
 * Escalade un problème au support
 */
async function escalateIssue(
  issueId: string,
  userId: string,
  ticketId: string
): Promise<boolean> {
  const { data } = await supabase
    .rpc('escalate_user_issue', {
      p_issue_id: issueId,
      p_user_id: userId,
      p_ticket_id: ticketId
    });

  return data === true;
}

// ============================================================================
// Boutons de validation
// ============================================================================

/**
 * Génère les boutons de validation appropriés selon le contexte
 */
function generateValidationButtons(
  intent: 'tutorial' | 'diagnostic',
  feature: string,
  attemptCount: number
): ValidationButton[] {
  // Tutoriel : boutons simples
  if (intent === 'tutorial') {
    return [
      { id: 'works', label: 'Oui, super !', action: 'works', emoji: '👍' },
      { id: 'still_blocked', label: 'Pas encore, aidons-nous', action: 'still_blocked', emoji: '🤔' }
    ];
  }

  // Diagnostic : boutons détaillés
  const buttons: ValidationButton[] = [
    { id: 'works', label: 'Oui, super !', action: 'works', emoji: '👍' },
    { id: 'still_blocked', label: 'Pas encore, aidons-nous', action: 'still_blocked', emoji: '🤔' }
  ];

  // Ajouter des boutons contextuels selon la fonctionnalité
  if (feature.includes('note') || feature.includes('vocabulary')) {
    buttons.push(
      { id: 'cant_find_button', label: 'Je ne trouve pas le bouton', action: 'cant_find_button', emoji: '🔍' },
      { id: 'save_error', label: 'J\'ai une erreur', action: 'save_error', emoji: '⚠️' }
    );
  }

  // Si plusieurs tentatives, proposer "Autre problème"
  if (attemptCount >= 1) {
    buttons.push(
      { id: 'other', label: 'Autre problème', action: 'other', emoji: '💬' }
    );
  }

  return buttons;
}

// ============================================================================
// Handler principal
// ============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body: IssueTrackerRequest = await req.json();
    const { user_id, message, conversation_id, button_clicked } = body;

    if (!user_id || !message) {
      throw new Error('user_id et message requis');
    }

    console.log('[issue-tracker] Requête reçue:', {
      userId: user_id.substring(0, 8) + '...',
      messagePreview: message.substring(0, 50),
      buttonClicked: button_clicked || 'none'
    });

    // 1. Détecter l'intention
    const { intent, feature, blockingSignal } = detectIntent(message, button_clicked);

    console.log('[issue-tracker] Intention détectée:', { intent, feature, blockingSignal });

    // 2. Gérer selon l'intention
    let response: IssueTrackerResponse;

    // CAS 1: Résolution confirmée
    if (intent === 'resolved') {
      // Marquer le problème comme résolu si existe
      if (feature) {
        const activeIssue = await getActiveIssue(user_id, feature, conversation_id); // ✅ PASSER conversation_id
        if (activeIssue) {
          await resolveIssue(activeIssue.id, user_id);
          console.log('[issue-tracker] Problème résolu:', activeIssue.id);
        }
      }

      response = {
        intent: 'resolved',
        feature: feature,
        should_call_chat_memory: true, // Laisser chat-memory générer l'astuce
        buttons: []
      };
    }
    // CAS 2: Escalade demandée
    else if (intent === 'escalate') {
      response = {
        intent: 'escalate',
        feature: feature,
        should_call_chat_memory: false,
        response_override: 'Je comprends que le problème persiste. Je vais vous mettre en contact avec notre équipe de support.'
      };
    }
    // CAS 3: Tutoriel (pas de blocage)
    else if (intent === 'tutorial' && feature) {
      response = {
        intent: 'tutorial',
        feature: feature,
        should_call_chat_memory: true, // Laisser chat-memory générer le tutoriel
        buttons: generateValidationButtons('tutorial', feature, 0)
      };
    }
    // CAS 4: Diagnostic (blocage détecté)
    else if (intent === 'diagnostic' && feature) {
      // Récupérer ou créer le problème
      let issue = await getActiveIssue(user_id, feature, conversation_id); // ✅ PASSER conversation_id

      if (!issue) {
        // Nouveau problème
        const blockingPoint = button_clicked === 'cant_find_button'
          ? 'cannot_find_button'
          : button_clicked === 'save_error'
          ? 'save_error'
          : undefined;

        issue = await createIssue(user_id, feature, message, blockingPoint, conversation_id); // ✅ PASSER conversation_id
      } else {
        // Problème existant : mettre à jour
        const blockingPoint = button_clicked === 'cant_find_button'
          ? 'cannot_find_button'
          : button_clicked === 'save_error'
          ? 'save_error'
          : issue.blocking_point;

        issue = await updateIssue(
          issue.id,
          {
            status: 'in_progress',
            blocking_point: blockingPoint
          },
          {
            action: button_clicked || 'message',
            message: message,
            button: button_clicked
          }
        );
      }

      // Vérifier si escalade nécessaire (2-3 tentatives)
      if (issue && issue.attempt_count >= 2) {
        response = {
          intent: 'escalate',
          feature: feature,
          issue_state: issue,
          should_call_chat_memory: false,
          response_override: `Je vois que vous rencontrez des difficultés après ${issue.attempt_count} tentatives. Je vous recommande de contacter notre équipe de support pour une aide personnalisée.`
        };
      } else {
        // 🎯 CAS SPÉCIAL : Si l'utilisateur a cliqué "Pas encore, aidons-nous"
        if (button_clicked === 'still_blocked' && issue) {
          const featureLower = feature.toLowerCase();
          
          // Messages spécifiques selon la fonctionnalité
          const solutionsByFeature: Record<string, string> = {
            // Notes (toutes variantes)
            notes: `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton "+ Nouvelle note" ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`,
            
            note_creation: `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton "+ Nouvelle note" ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`,
            
            note: `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton "+ Nouvelle note" ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`,
            
            reunion: `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton de création de réunion ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`,
            
            vocabulary: `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton "+ Ajouter un mot" ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`,
            
            planning: `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton "+ Ajouter un rappel" ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`
          };

          const defaultSolution = `🤔 Pas de souci, on va regarder ça ensemble ! 

Peux-tu me dire à quelle étape ça bloque exactement ? Est-ce que tu vois le bouton dont on parle ? Ou est-ce que tu as un message d'erreur qui s'affiche ? 

Dis-moi un peu plus pour qu'on puisse avancer !`;

          // Chercher dans les clés (note_creation, notes, note, etc.)
          let solutionMessage = solutionsByFeature[featureLower];
          
          // Si pas trouvé, chercher par préfixe (note_creation -> note)
          if (!solutionMessage && featureLower.includes('note')) {
            solutionMessage = solutionsByFeature['notes'];
          }
          
          // Si toujours pas trouvé, utiliser le défaut
          if (!solutionMessage) {
            solutionMessage = defaultSolution;
          }

          response = {
            intent: 'diagnostic',
            feature: feature,
            issue_state: issue,
            should_call_chat_memory: false, // ✅ FORCER le message exact, ne pas laisser OpenAI générer
            response_override: solutionMessage, // ✅ MESSAGE EXACT
            buttons: generateValidationButtons('diagnostic', feature, issue.attempt_count)
          };
        } else {
          response = {
            intent: 'diagnostic',
            feature: feature,
            issue_state: issue || undefined,
            should_call_chat_memory: true, // Laisser chat-memory poser des questions
            buttons: issue ? generateValidationButtons('diagnostic', feature, issue.attempt_count) : []
          };
        }
      }
    }
    // CAS 5: Intention inconnue
    else {
      response = {
        intent: 'tutorial', // Par défaut, traiter comme tutoriel
        should_call_chat_memory: true,
        buttons: []
      };
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[issue-tracker] Erreur:', error);

    return new Response(JSON.stringify({
      intent: 'tutorial',
      should_call_chat_memory: true,
      buttons: [],
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 200, // Toujours 200 pour ne pas bloquer le pipeline
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
