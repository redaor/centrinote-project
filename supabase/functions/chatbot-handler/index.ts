/**
 * Edge Function pour le Chatbot Centrinote
 * Gère les interactions avec l'IA et l'escalation vers email
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Variables d'environnement
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Interfaces TypeScript
interface ChatbotRequest {
  action: 'chat' | 'escalate' | 'confirm-escalation';
  message?: string;
  userId: string;
  userEmail: string;
  userName: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  ticketId?: string;
  problemResolved?: boolean;
}

interface ChatbotResponse {
  message: string;
  requiresEscalation: boolean;
  confidence?: number;
  ticketId?: string;
  emailDraft?: string;
  showConfirmationButtons?: boolean;
}

interface EscalationResponse {
  ticketId: string;
  status: 'created' | 'sent';
  estimatedResponseTime: string;
}

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Handler principal de l'Edge Function
 */
Deno.serve(async (req) => {
  console.log(`[chatbot-handler] ${req.method} request received at ${new Date().toISOString()}`);

  // 1. CORS OPTIONS d'abord - CRITIQUE
  if (req.method === 'OPTIONS') {
    console.log('[chatbot-handler] OPTIONS preflight request - returning CORS headers');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }

  // 2. Vérifier que c'est une requête POST
  if (req.method !== 'POST') {
    console.log(`[chatbot-handler] Method ${req.method} not allowed`);
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 3. Validation des variables d'environnement
  if (!OPENAI_API_KEY) {
    console.error('[chatbot-handler] OPENAI_API_KEY is not configured');
    return new Response(JSON.stringify({ error: 'Erreur de configuration serveur: OPENAI_API_KEY manquant' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[chatbot-handler] Supabase configuration missing');
    return new Response(JSON.stringify({ error: 'Erreur de configuration serveur: Supabase non configuré' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 4. Parser le body de la requête
    let request: ChatbotRequest;
    try {
      const body = await req.json();
      request = body;
      console.log(`[chatbot-handler] Request parsed: action=${request.action}, userId=${request.userId}`);
    } catch (error) {
      console.error('[chatbot-handler] Error parsing JSON:', error);
      return new Response(JSON.stringify({ error: 'Format JSON invalide dans le corps de la requête' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Validation de la requête
    if (!request.action) {
      return new Response(JSON.stringify({ error: 'Action requise (chat ou escalate)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Créer le client Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('[chatbot-handler] Supabase client created');

    // 7. Router vers le bon handler
    if (request.action === 'chat') {
      console.log('[chatbot-handler] Routing to handleChat');
      return await handleChat(request, supabase);
    } else if (request.action === 'escalate') {
      console.log('[chatbot-handler] Routing to handleEscalation');
      return await handleEscalation(request, supabase);
    } else if (request.action === 'confirm-escalation') {
      console.log('[chatbot-handler] Routing to handleConfirmEscalation');
      return await handleConfirmEscalation(request, supabase);
    } else {
      console.error(`[chatbot-handler] Invalid action: ${request.action}`);
      return new Response(JSON.stringify({ error: 'Action invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('[chatbot-handler] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Erreur serveur inattendue',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Gère les messages de chat avec l'IA
 */
async function handleChat(
  request: ChatbotRequest,
  supabase: any
): Promise<Response> {
  try {
    // Validation du message
    if (!request.message || request.message.trim().length === 0) {
      console.error('[chatbot-handler] Empty message received');
      return new Response(JSON.stringify({ error: 'Le message est requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[chatbot-handler] Processing chat message: "${request.message.substring(0, 100)}..."`);

    // Compter le nombre d'échanges dans l'historique
    const exchangeCount = (request.conversationHistory || []).length;
    const shouldEscalate = exchangeCount >= 3; // Escalation après 3 échanges minimum
    console.log(`[chatbot-handler] Exchange count: ${exchangeCount}, shouldEscalate: ${shouldEscalate}`);

    // Construire le contexte pour l'IA
    const systemPrompt = `Tu es l'assistant Centrinote, un assistant intelligent et moderne pour l'application Centrinote. Ton style est chaleureux, naturel et engageant, comme un collègue qui aide avec bienveillance.

**CENTRINOTE - GUIDE COMPLET DES FONCTIONNALITÉS :**

1. **GESTION DE NOTES ET DOCUMENTS** :
   - Création de notes : Menu "Notes" → "+ Nouvelle note" → Écrire titre et contenu (sauvegarde automatique)
   - Édition : Cliquer sur une note → Icône crayon (édition) en haut à droite → Modifier → Sauvegarder
   - Organisation : Tags, catégories, épinglage (pin), recherche
   - Import : Menu "Notes" → "Importer" → PDF ou Google Drive (transformation automatique en texte modifiable)
   - Export : Paramètres → Export → PDF, Markdown ou ZIP complet
   - Formatage : Support Markdown (# titre, **gras**, *italique*)
   - Pièces jointes : Possibilité d'ajouter des fichiers aux notes

2. **VOCABULAIRE ET FLASHCARDS** :
   - Ajout de mots : Menu "Vocabulaire" → "+ Ajouter un mot" → Remplir mot, définition, exemple, catégorie
   - Mode révision : "Vocabulaire" → "🎴 Mode révision" → Cartes avec "Je sais" / "À revoir"
   - Système de maîtrise : Score 0-100, priorité aux mots moins maîtrisés
   - Catégories : Organisation par catégories personnalisées
   - Difficulté : Niveaux 1-5
   - Limite Free : 100 mots max, illimité en Pro

3. **PLANIFICATION ET TÂCHES** :
   - Création : Menu "📅 Planning" → "+ Ajouter un rappel" → Choisir matière, date, heure
   - Notifications : Alertes automatiques aux moments programmés
   - Rappels récurrents : Possibilité de créer des rappels hebdomadaires/mensuels
   - Gestion : Vue calendrier, liste des tâches, filtres

4. **RECHERCHE IA (AI SEARCH)** :
   - Accès : Menu "🔍 Recherche"
   - Utilisation : Questions en langage naturel (ex: "c'était quoi la formule des intégrales ?")
   - Fonctionnement : Recherche sémantique, pas besoin de mots-clés exacts
   - Disponibilité : Base gratuite, illimitée en Pro

5. **COLLABORATION ET RÉUNIONS** :
   - Partage de notes : Ouvrir note → "👥 Partager" → Entrer email → "Peut modifier" ou "Lecture seule"
   - Édition temps réel : Modifications visibles instantanément (style Google Docs)
   - Réunions vidéo : Intégration Jitsi Meet et Zoom
   - Chat temps réel : Communication pendant les sessions de collaboration
   - Limite Free : 2 collaborateurs max, illimité en Pro

6. **AUTOMATISATIONS** :
   - Concept : Règles "Si... Alors..." (style IFTTT)
   - Accès : Menu "⚡ Automatisation" → "Créer une règle"
   - Déclencheurs : Heure, date, action utilisateur, événements
   - Actions : Envoi d'emails, notifications, exécution d'actions
   - Exemples :
     * "Tous les jours à 9h, envoyer une citation de motivation"
     * "Chaque lundi, envoyer un résumé hebdomadaire"
     * "Si j'ajoute #urgent à une note, envoyer un rappel demain matin"
     * "Tous les vendredis, envoyer un résumé de la semaine par email"
   - Configuration : Section "Automatisations" dans les paramètres
   - Disponibilité : Fonctionnalités avancées en Pro

7. **FORFAITS ET LIMITES** :
   - **Free** : Notes illimitées, recherche de base, vocabulaire (100 mots max), partage (2 collaborateurs max)
   - **Pro (5€/mois)** : AI Search illimitée, automatisations avancées, réunions enregistrées + transcriptions, stockage illimité, essai gratuit 14 jours
   - Passage Pro : Menu "💳 Plan" → Comparer → "Passer Pro"

**MÉTHODES DE DÉPANNAGE :**

**Problèmes de notes :**
- Note ne s'enregistre pas : Vérifier la connexion internet, actualiser la page, vérifier les permissions
- Note introuvable : Utiliser la recherche IA, vérifier les filtres/tags, vérifier les archives
- Import échoue : Vérifier le format du fichier (PDF supporté), taille du fichier, connexion internet
- Formatage perdu : Vérifier le support Markdown, réessayer avec syntaxe correcte

**Problèmes de vocabulaire :**
- Mot ne s'ajoute pas : Vérifier la limite (100 mots en Free), actualiser la page
- Révision ne fonctionne pas : Vérifier qu'il y a des mots à réviser, réinitialiser le mode révision
- Score de maîtrise incorrect : Les scores se mettent à jour après chaque révision

**Problèmes de tâches/planning :**
- Notification ne s'affiche pas : Vérifier les paramètres de notifications du navigateur, vérifier l'heure système
- Rappel ne se déclenche pas : Vérifier que le rappel est actif, vérifier la date/heure

**Problèmes d'automatisations :**
- Automatisation ne se déclenche pas : Vérifier qu'elle est active, vérifier la configuration du déclencheur, vérifier les logs
- Email non reçu : Vérifier les spams, vérifier l'adresse email, vérifier les logs d'exécution
- Double exécution : Problème connu résolu, vérifier la dernière version

**Problèmes généraux :**
- Lenteur : Vérifier la connexion internet, vider le cache du navigateur, fermer les onglets inutiles
- Erreur de chargement : Actualiser la page (F5), vérifier la connexion, réessayer dans quelques instants
- Données perdues : Vérifier la sauvegarde automatique, vérifier l'historique, contacter le support si persistant
- Connexion : Vérifier internet, se déconnecter/reconnecter, vider le cache

**STYLE D'ÉCRITURE MODERNE ET ENGAGEANT :**

- **Tone** : Conversationnel, amical et professionnel. Parle comme un expert bienveillant, pas comme un manuel d'instruction
- **Structure** : Évite les listes numérotées rigides (1. 2. 3.). Préfère des paragraphes fluides avec des transitions naturelles
- **Approche** : Commence par comprendre le besoin réel de l'utilisateur, puis guide-le de manière intuitive
- **Exemples** : Utilise des exemples concrets et des scénarios réels plutôt que des instructions abstraites
- **Engagement** : Pose des questions de clarification si nécessaire, montre de l'empathie
- **Actionnable** : Donne des conseils pratiques et des astuces, pas juste des étapes mécaniques
- **Personnalisation** : Adapte ton langage au contexte (débutant vs expert)

**EXEMPLE DE BONNE RÉPONSE :**
Au lieu de "1. Accéder à vos notes : Ouvrez l'application... 2. Sélectionner la note...", préfère :
"Pour corriger une note, c'est très simple ! Ouvre Centrinote et va dans tes notes. Tu verras toutes tes notes listées - clique simplement sur celle que tu veux modifier. Une fois ouverte, tu trouveras l'icône d'édition (un petit crayon) en haut à droite. Clique dessus et tu peux commencer à modifier directement. N'oublie pas de sauvegarder quand tu as terminé - le bouton est bien visible en haut de l'écran. Si tu veux, je peux te guider étape par étape en temps réel !"

**IMPORTANT - MÉTHODE DE DIAGNOSTIC PROGRESSIF :**

1. **COMPRENDRE LE PROBLÈME** :
   - Pose TOUJOURS des questions ciblées pour comprendre précisément la situation
   - Exemples de questions : "À quelle étape l'enregistrement bloque-t-il ?", "Voyez-vous le bouton Enregistrer ?", "Quel message d'erreur apparaît ?", "Sur quelle page êtes-vous actuellement ?"
   - Ne devine JAMAIS, demande toujours des précisions avant de proposer une solution

2. **SOLUTIONS PROGRESSIVES** :
   - Commence par la solution la plus simple et la plus probable
   - Si ça ne fonctionne pas, propose la solution suivante en fonction de la réponse de l'utilisateur
   - Adapte tes solutions en fonction des réponses : "Ah, vous ne voyez pas le bouton ? Alors essayons ceci..."
   - Structure tes réponses avec des étapes claires et numérotées quand c'est pertinent

3. **AFFICHAGE STRUCTURÉ** :
   - Utilise des marqueurs visuels pour structurer tes réponses :
     * 🔍 Pour les questions de diagnostic
     * ✅ Pour les solutions/étapes
     * ⚠️ Pour les avertissements
     * 💡 Pour les astuces
   - Organise les étapes de manière claire et lisible
   - Utilise des encadrés conceptuels pour séparer les différentes parties de ta réponse

4. **RÈGLES D'ESCALATION STRICTES** :
   - L'escalation vers email est UNIQUEMENT en dernier recours
   - Ne propose l'escalation QUE si :
     * Tu as posé au moins 2-3 questions de diagnostic
     * Tu as proposé au moins 2-3 solutions progressives
     * L'utilisateur confirme que rien ne fonctionne après toutes tes tentatives
     * OU si l'utilisateur demande explicitement à contacter le support
   - Ne propose JAMAIS l'escalation dès la première réponse
   - Après avoir donné une solution, demande TOUJOURS : "Est-ce que le problème est réglé ?" pour vérifier

5. **STYLE DE RÉPONSE** :
   - Réponds toujours en français de manière naturelle et engageante
   - Sois précis, donne des exemples concrets
   - Montre de l'empathie : "Je comprends que c'est frustrant, essayons ensemble de résoudre ça"
   - Utilise les méthodes de dépannage ci-dessus pour résoudre les problèmes avant de proposer l'escalation`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(request.conversationHistory || []).slice(-5),
      { role: 'user', content: request.message }
    ];

    console.log(`[chatbot-handler] Calling OpenAI API with ${messages.length} messages`);

    // Appel à OpenAI avec gestion d'erreurs
    let openaiResponse: Response;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.8,
          max_tokens: 800
        })
      });
    } catch (fetchError) {
      console.error('[chatbot-handler] OpenAI fetch error:', fetchError);
      throw new Error('Erreur de connexion à l\'API OpenAI');
    }

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[chatbot-handler] OpenAI API error:', openaiResponse.status, errorText);
      throw new Error(`Erreur API OpenAI: ${openaiResponse.status}`);
    }

    let openaiData: any;
    try {
      openaiData = await openaiResponse.json();
    } catch (parseError) {
      console.error('[chatbot-handler] Error parsing OpenAI response:', parseError);
      throw new Error('Erreur lors du parsing de la réponse OpenAI');
    }

    const aiMessage = openaiData.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.';
    console.log(`[chatbot-handler] OpenAI response received, length: ${aiMessage.length} characters`);

    // Calculer la confiance (amélioré)
    const confidence = calculateConfidence(aiMessage, request.message, exchangeCount);
    console.log(`[chatbot-handler] Confidence calculated: ${confidence.toFixed(2)}`);

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
      userMessageLower.includes('parler à un humain') ||
      userMessageLower.includes('aide supplémentaire') ||
      userMessageLower.includes('besoin d\'aide') ||
      userMessageLower.includes('ne comprends pas') ||
      userMessageLower.includes('ne fonctionne toujours pas');

    console.log(`[chatbot-handler] Needs escalation: ${needsEscalation}`);

    // Détecter si c'est une question de diagnostic (ne pas afficher les boutons)
    const isDiagnosticQuestion = 
      aiMessage.toLowerCase().includes('quelle étape') ||
      aiMessage.toLowerCase().includes('voyez-vous') ||
      aiMessage.toLowerCase().includes('quel message') ||
      aiMessage.toLowerCase().includes('sur quelle page') ||
      aiMessage.toLowerCase().includes('pouvez-vous me dire') ||
      aiMessage.toLowerCase().includes('🔍');

    // Vérifier si la réponse contient une question de confirmation
    const hasConfirmationQuestion = 
      aiMessage.toLowerCase().includes('est-ce que le problème est réglé') ||
      aiMessage.toLowerCase().includes('est-ce que le problème') ||
      aiMessage.toLowerCase().includes('ça fonctionne maintenant') ||
      aiMessage.toLowerCase().includes('problème résolu') ||
      aiMessage.toLowerCase().includes('est-ce que ça marche') ||
      aiMessage.toLowerCase().includes('fonctionne-t-il') ||
      aiMessage.toLowerCase().includes('est-ce que c\'est bon');

    // Détecter si l'utilisateur a confirmé que le problème n'est PAS résolu
    const userConfirmedProblemNotResolved = 
      (userMessageLower.includes('non') || userMessageLower.includes('pas')) && 
      (userMessageLower.includes('résolu') || 
       userMessageLower.includes('marche') || 
       userMessageLower.includes('fonctionne') ||
       userMessageLower.includes('toujours pas') ||
       userMessageLower.includes('ne marche pas') ||
       userMessageLower.includes('ça ne fonctionne pas') ||
       userMessageLower.includes('problème persiste'));

    // Détecter si l'utilisateur a confirmé que le problème EST résolu
    const userConfirmedProblemResolved = 
      (userMessageLower.includes('oui') || 
       userMessageLower.includes('résolu') || 
       userMessageLower.includes('fonctionne') ||
       userMessageLower.includes('ça marche') ||
       userMessageLower.includes('c\'est bon') ||
       userMessageLower.includes('parfait') ||
       userMessageLower.includes('merci')) &&
      !userMessageLower.includes('pas') &&
      !userMessageLower.includes('non');

    // Si l'utilisateur confirme que le problème est résolu, proposer une astuce
    if (userConfirmedProblemResolved) {
      console.log('[chatbot-handler] User confirmed problem is resolved, suggesting tip');
      
      // Générer une astuce basée sur le contexte de la conversation
      const conversationContext = (request.conversationHistory || [])
        .slice(-3)
        .map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      const tipPrompt = `L'utilisateur vient de résoudre un problème avec Centrinote. Voici le contexte de la conversation :

${conversationContext}

Propose-lui une astuce ou suggestion d'utilisation intéressante et pertinente liée à Centrinote, en lien avec ce qu'il vient de faire. Sois créatif, utile et moderne. Réponds en une phrase ou deux maximum, de manière amicale et engageante. Ne répète pas ce qui a déjà été dit.`;
      
      try {
        const tipResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'Tu es un assistant Centrinote expert qui propose des astuces utiles, créatives et contextuelles. Tu connais toutes les fonctionnalités de Centrinote (notes, vocabulaire, flashcards, automatisations, collaboration, recherche IA).' 
              },
              { role: 'user', content: tipPrompt }
            ],
            temperature: 0.9,
            max_tokens: 150
          })
        });

        let tipMessage = 'Super ! Je suis content que ça fonctionne maintenant. 😊\n\n💡 Astuce : Explore les automatisations pour gagner du temps sur tes tâches répétitives !';
        
        if (tipResponse.ok) {
          const tipData = await tipResponse.json();
          const generatedTip = tipData.choices[0]?.message?.content?.trim();
          if (generatedTip) {
            tipMessage = `Super ! Je suis content que ça fonctionne maintenant. 😊\n\n💡 ${generatedTip}`;
          }
        }

        const response: ChatbotResponse = {
          message: tipMessage,
          requiresEscalation: false,
          confidence: 1.0
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[chatbot-handler] Error generating tip:', error);
        const response: ChatbotResponse = {
          message: 'Super ! Je suis content que ça fonctionne maintenant. 😊\n\n💡 Astuce : Explore les automatisations pour gagner du temps sur tes tâches répétitives !',
          requiresEscalation: false,
          confidence: 1.0
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Si besoin d'escalation ET que l'utilisateur a confirmé que le problème n'est pas résolu
    if (needsEscalation && exchangeCount >= 1 && userConfirmedProblemNotResolved) {
      console.log('[chatbot-handler] User confirmed problem not resolved, creating support message');
      // Créer le message dans support_messages avec escalated=true
      const ticketId = await createSupportTicket(request, supabase, true);
      console.log('[chatbot-handler] Support message created with ID:', ticketId);
      const emailDraft = generateEmailDraft(request, aiMessage);

      const response: ChatbotResponse = {
        message: `${aiMessage}\n\n---\n\nJe comprends que le problème persiste. Je peux t'aider à contacter directement notre équipe de support pour qu'ils puissent t'aider plus en profondeur. On peut rédiger un email ensemble pour expliquer ta situation. Ça te dit ?`,
        requiresEscalation: true,
        confidence,
        ticketId,
        emailDraft
      };

      console.log('[chatbot-handler] Returning response with escalation option');
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Détecter si c'est une réponse de dépannage/solution qui nécessite une confirmation
    const isTroubleshootingResponse = 
      !isDiagnosticQuestion && (
        aiMessage.toLowerCase().includes('vérifier') ||
        aiMessage.toLowerCase().includes('essayer') ||
        aiMessage.toLowerCase().includes('solution') ||
        aiMessage.toLowerCase().includes('étape') ||
        aiMessage.toLowerCase().includes('clique') ||
        aiMessage.toLowerCase().includes('menu') ||
        aiMessage.toLowerCase().includes('ouvre') ||
        aiMessage.toLowerCase().includes('va dans') ||
        aiMessage.toLowerCase().includes('clique sur') ||
        aiMessage.toLowerCase().includes('✅')
      );

    // Afficher les boutons de confirmation après une réponse de dépannage
    // Ne pas afficher si c'est une question de diagnostic ou si l'utilisateur a déjà répondu
    const shouldShowConfirmationButtons = 
      isTroubleshootingResponse && 
      !isDiagnosticQuestion &&
      !userConfirmedProblemNotResolved && 
      !userConfirmedProblemResolved &&
      !hasConfirmationQuestion &&
      exchangeCount >= 1; // Au moins un échange pour avoir du contexte

    if (shouldShowConfirmationButtons) {
      // Retirer la question de confirmation du message si elle existe déjà
      let cleanMessage = aiMessage;
      if (hasConfirmationQuestion) {
        cleanMessage = aiMessage.replace(/\n\nEst-ce que.*\?/gi, '').trim();
      }

      const response: ChatbotResponse = {
        message: cleanMessage,
        requiresEscalation: false,
        confidence,
        showConfirmationButtons: true
      };

      console.log('[chatbot-handler] Returning response with confirmation buttons');
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Réponse normale sans escalation
    const response: ChatbotResponse = {
      message: aiMessage,
      requiresEscalation: false,
      confidence
    };

    console.log('[chatbot-handler] Returning normal response');
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[chatbot-handler] Error in handleChat:', error);
    
    // En cas d'erreur technique, proposer l'escalation
    try {
      const ticketId = await createSupportTicket(request, supabase, false);
      const emailDraft = generateEmailDraft(request, 'Erreur technique lors du traitement de la demande.');

      const response: ChatbotResponse = {
        message: 'Oups, je rencontre un petit souci technique de mon côté. Pas de panique ! Je peux t\'aider à contacter directement notre équipe de support pour qu\'ils puissent t\'aider. On rédige un email ensemble ?',
        requiresEscalation: true,
        confidence: 0,
        ticketId,
        emailDraft
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (ticketError) {
      console.error('[chatbot-handler] Error creating ticket:', ticketError);
      return new Response(JSON.stringify({ 
        error: 'Erreur technique. Veuillez réessayer plus tard.',
        requiresEscalation: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
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
    console.log('[chatbot-handler] Handling escalation request');
    
    // Créer un nouveau message via notify-support (qui envoie aussi l'email)
    // On crée toujours un nouveau message pour l'escalation
    const ticketId = await createSupportTicket(request, supabase, true);
    
    console.log(`[chatbot-handler] Support message created via notify-support, ID: ${ticketId}`);
    // Note: notify-support envoie déjà l'email automatiquement, pas besoin d'appeler sendEmailToAdmin

    const response: EscalationResponse = {
      ticketId,
      status: 'sent',
      estimatedResponseTime: '24h'
    };

    console.log('[chatbot-handler] Escalation completed successfully');
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[chatbot-handler] Error in handleEscalation:', error);
    return new Response(JSON.stringify({ 
      error: 'Erreur lors de l\'escalation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Gère la confirmation d'escalation - vérifie si le problème est résolu avant d'envoyer l'email
 */
async function handleConfirmEscalation(
  request: ChatbotRequest,
  supabase: any
): Promise<Response> {
  try {
    console.log('[chatbot-handler] Handling confirmation escalation request');
    
    // Vérifier si le problème est résolu
    const problemResolved = request.problemResolved === true;
    const userMessage = (request.message || '').toLowerCase();
    
    // Détecter si le problème est résolu depuis le message
    const resolvedIndicators = [
      'oui', 'résolu', 'fonctionne', 'ça marche', 'c\'est bon', 
      'parfait', 'merci', 'ok', 'd\'accord', 'super'
    ];
    const isResolvedFromMessage = resolvedIndicators.some(indicator => 
      userMessage.includes(indicator) && 
      !userMessage.includes('pas') && 
      !userMessage.includes('non')
    );

    const isActuallyResolved = problemResolved || isResolvedFromMessage;

    if (isActuallyResolved) {
      console.log('[chatbot-handler] Problem is resolved, no escalation needed');
      return new Response(JSON.stringify({ 
        message: 'Super ! Je suis content que ça fonctionne maintenant. Si tu as d\'autres questions, n\'hésite pas à me demander ! 😊',
        requiresEscalation: false,
        problemResolved: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Le problème n'est pas résolu, procéder à l'escalation
    console.log('[chatbot-handler] Problem not resolved, proceeding with escalation');
    
    // Créer ou mettre à jour le ticket
    const ticketId = request.ticketId || await createSupportTicket(request, supabase, true);
    console.log(`[chatbot-handler] Ticket ID: ${ticketId}`);
    
    // Envoyer l'email à l'équipe admin
    try {
      await sendEmailToAdmin(request, ticketId, supabase);
      console.log('[chatbot-handler] Email sent to admin');
    } catch (emailError) {
      console.error('[chatbot-handler] Error sending email:', emailError);
      // Ne pas faire échouer la requête si l'email échoue
    }

    const response: EscalationResponse = {
      ticketId,
      status: 'sent',
      estimatedResponseTime: '24h'
    };

    console.log('[chatbot-handler] Escalation completed successfully');
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[chatbot-handler] Error in handleConfirmEscalation:', error);
    return new Response(JSON.stringify({ 
      error: 'Erreur lors de la confirmation d\'escalation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
    'fonctionne', 'automatisation', 'règle', 'déclencheur', 'action',
    'première', 'ensuite', 'enfin', 'exemple', 'par exemple'
  ];
  
  const negativeKeywords = [
    'je ne sais pas', 'désolé je ne peux pas', 'impossible de',
    'je ne comprends pas', 'je ne peux pas vous aider',
    'je ne suis pas sûr', 'je ne connais pas'
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
  
  // Augmenter la confiance si la réponse contient des exemples
  if (lowerMessage.includes('exemple') || lowerMessage.includes('par exemple')) {
    confidence += 0.05;
  }
  
  // Après plusieurs échanges, la confiance diminue légèrement
  if (exchangeCount > 2) {
    confidence -= 0.1;
  }
  
  // Normaliser entre 0 et 1
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
  try {
    console.log('[chatbot-handler] Creating support ticket via notify-support, escalated:', escalated);
    
    // Utiliser la même Edge Function que le formulaire de contact (notify-support)
    const conversationText = formatConversationHistory(request.conversationHistory || []);
    const subject = escalated 
      ? `[Chatbot] Demande de support - ${request.userName}`
      : `[Chatbot] Question - ${request.userName}`;
    
    // Appeler notify-support comme le fait le formulaire de contact
    const notifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/notify-support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        name: request.userName,
        email: request.userEmail,
        subject: subject,
        message: conversationText
      })
    });

    if (!notifyResponse.ok) {
      const errorText = await notifyResponse.text();
      console.error('[chatbot-handler] Error calling notify-support:', notifyResponse.status, errorText);
      // Générer un ID temporaire si l'appel échoue
      const tempId = `temp-${Date.now()}`;
      console.log(`[chatbot-handler] Generated temporary ticket ID: ${tempId}`);
      return tempId;
    }

    const notifyData = await notifyResponse.json();
    
    if (!notifyData.success || !notifyData.id) {
      console.error('[chatbot-handler] notify-support returned error:', notifyData);
      const tempId = `temp-${Date.now()}`;
      console.log(`[chatbot-handler] Generated temporary ticket ID: ${tempId}`);
      return tempId;
    }

    console.log(`[chatbot-handler] Support message created successfully via notify-support:`, {
      id: notifyData.id,
      subject: subject,
      email: request.userEmail,
      fullResponse: notifyData
    });

    // LOG DÉTAILLÉ : Vérifier que le message a bien été créé
    console.log(`[chatbot-handler] ✅ Message ID returned from notify-support: ${notifyData.id}`);
    console.log(`[chatbot-handler] 📧 Full notify-support response:`, JSON.stringify(notifyData));

    return notifyData.id;
  } catch (error) {
    console.error('[chatbot-handler] Exception creating support message:', error);
    // Générer un ID temporaire en cas d'exception
    const tempId = `temp-${Date.now()}`;
    console.log(`[chatbot-handler] Generated temporary ticket ID after exception: ${tempId}`);
    return tempId;
  }
}

/**
 * Formate l'historique de conversation pour le ticket
 */
function formatConversationHistory(history: Array<{ role: string; content: string }>): string {
  if (!history || history.length === 0) {
    return 'Aucun historique de conversation';
  }
  
  return history
    .map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
}

/**
 * Génère un brouillon d'email
 */
function generateEmailDraft(request: ChatbotRequest, aiMessage: string): string {
  return `Bonjour,

J'ai une question concernant Centrinote que j'ai posée via le chatbot, et j'aurais besoin d'aide supplémentaire.

Ma question : ${request.message || 'Non spécifiée'}

Réponse du chatbot : ${aiMessage}

J'aimerais obtenir plus d'informations ou de l'aide sur ce sujet.

Merci par avance !
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
    console.log(`[chatbot-handler] Sending email to admin for ticket ${ticketId}`);
    
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
      const errorText = await emailResponse.text();
      console.error('[chatbot-handler] Error sending email:', emailResponse.status, errorText);
      throw new Error(`Erreur envoi email: ${emailResponse.status}`);
    }

    console.log('[chatbot-handler] Email sent successfully');
  } catch (error) {
    console.error('[chatbot-handler] Exception sending email:', error);
    // Ne pas faire échouer la requête si l'email échoue
    throw error;
  }
}
