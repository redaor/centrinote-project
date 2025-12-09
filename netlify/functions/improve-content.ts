// netlify/functions/improve-content.ts
// Fonction pour améliorer/corriger/reformuler/enrichir le contenu des notes et vocabulaire

import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

// Nettoyer et valider la clé API OpenAI
function cleanApiKey(key: string | undefined): string {
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const cleaned = key.trim().replace(/\s+/g, '');

  if (!cleaned.startsWith('sk-')) {
    throw new Error(`Invalid OpenAI API key format`);
  }

  return cleaned;
}

// CORS headers
function corsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    'https://centrinote.fr',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

/**
 * Types d'actions possibles
 */
type ActionType = 'corriger' | 'améliorer' | 'reformuler' | 'enrichir';
type ContentType = 'note' | 'vocabulaire';

/**
 * Nettoie le texte généré pour supprimer tous les astérisques utilisés pour le gras
 */
function cleanBoldMarkers(text: string): string {
  if (!text) return text;
  
  // Supprimer les astérisques doubles utilisés pour le gras (**texte**)
  // Mais préserver les astérisques dans les listes (* item) et les titres markdown (#)
  let cleaned = text;
  
  // Pattern pour détecter **texte** (gras markdown) - version plus agressive
  // On remplace par le texte sans les astérisques
  // Pattern 1: **texte** (standard)
  cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, '$1');
  
  // Pattern 2: **texte** avec espaces ou sauts de ligne
  cleaned = cleaned.replace(/\*\*([^*\n]+?)\*\*/g, '$1');
  
  // Pattern 3: **Note: texte** ou **Note : texte** (cas spécifique)
  cleaned = cleaned.replace(/\*\*Note\s*:\s*([^*]+?)\*\*/gi, 'Note: $1');
  
  // Pattern 4: Nettoyer les astérisques isolés restants
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Nettoyer les espaces multiples qui pourraient résulter du nettoyage
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Nettoyer les espaces en début/fin de ligne
  cleaned = cleaned.replace(/^\s+|\s+$/gm, '');
  
  return cleaned.trim();
}

/**
 * Construit le prompt système selon l'action demandée
 */
function buildPromptForAction(
  action: ActionType,
  contentType: ContentType,
  content: string,
  title?: string
): string {
  const prompts = {
    corriger: `Tu es un correcteur expert. Corrige l'orthographe, la grammaire et la ponctuation du texte suivant sans en changer le sens ni le ton.

${contentType === 'note' && title ? `Titre: ${title}\n\n` : ''}Contenu à corriger:
${content}

Règles:
- Corrige UNIQUEMENT les fautes
- Ne change PAS le style ni le ton de l'auteur
- Ne réécris PAS entièrement, corrige seulement
- Garde la même structure (paragraphes, listes, etc.)
- Retourne UNIQUEMENT le texte corrigé, sans commentaire`,

    améliorer: `Tu es un assistant d'écriture expert. Améliore la clarté et la fluidité du texte suivant tout en gardant le ton et l'intention de l'auteur.

${contentType === 'note' && title ? `Titre: ${title}\n\n` : ''}Contenu à améliorer:
${content}

Règles:
- Améliore la clarté et la structure
- Rends le texte plus fluide et agréable à lire
- Utilise des titres hiérarchisés (##, ###) au lieu d'astérisques **
- Supprime TOUS les astérisques inutiles, y compris ceux utilisés pour le gras
- N'utilise JAMAIS d'astérisques ** pour mettre en gras - remplace par des titres ou du texte normal
- Ajoute des emojis contextuels si approprié
- Garde le TON et le STYLE de l'auteur
- Ne change PAS radicalement le contenu
- Garde la même longueur approximative
- Ne dépasse pas 80 caractères par ligne
- INTERDICTION ABSOLUE d'utiliser ** pour le gras
- Retourne UNIQUEMENT le texte amélioré, sans commentaire`,

    reformuler: `Tu es un expert en reformulation. Reformule le texte suivant pour le rendre plus concis et percutant.

${contentType === 'note' && title ? `Titre: ${title}\n\n` : ''}Contenu à reformuler:
${content}

Règles:
- Reformule pour plus de concision
- Utilise des titres hiérarchisés (##, ###) au lieu d'astérisques **
- Supprime TOUS les astérisques inutiles, y compris ceux utilisés pour le gras
- N'utilise JAMAIS d'astérisques ** pour mettre en gras - remplace par des titres ou du texte normal
- Garde toutes les informations importantes
- Utilise un langage clair et direct
- Ne dépasse pas 80 caractères par ligne
- INTERDICTION ABSOLUE d'utiliser ** pour le gras
- Conserve l'intention de l'auteur
- Retourne UNIQUEMENT le texte reformulé, sans commentaire`,

    enrichir: `Tu es un assistant pédagogique expert. Enrichis le texte suivant avec des détails pertinents, des exemples ou des clarifications utiles.

${contentType === 'note' && title ? `Titre: ${title}\n\n` : ''}Contenu à enrichir:
${content}

Règles:
- Ajoute des détails, exemples ou clarifications pertinents
- Utilise des titres hiérarchisés (##, ###) au lieu d'astérisques **
- Supprime TOUS les astérisques inutiles, y compris ceux utilisés pour le gras
- N'utilise JAMAIS d'astérisques ** pour mettre en gras - remplace par des titres ou du texte normal
- Ajoute des emojis contextuels pour rendre le texte plus vivant
- Encadre les définitions dans des blocs d'information (> 💡)
- Ne dénature PAS le message original
- Reste dans le même domaine/sujet
- Garde un ton pédagogique et accessible
- Ne dépasse pas 80 caractères par ligne
- INTERDICTION ABSOLUE d'utiliser ** pour le gras
- Maximum 50% de contenu ajouté
- Retourne UNIQUEMENT le texte enrichi, sans commentaire`,
  };

  return prompts[action];
}

/**
 * Handler principal
 */
export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  const origin = event.headers.origin || event.headers.Origin;

  // OPTIONS pour CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: '',
    };
  }

  // Vérifier la méthode
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Vérifier les variables d'environnement
    const rawOpenAIKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    console.log('[improve-content] 🔍 Vérification clé API:', {
      hasOpenAIKey: !!rawOpenAIKey,
      keyLength: rawOpenAIKey?.length || 0,
      keyPrefix: rawOpenAIKey?.substring(0, 7) || 'none',
      envVars: Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', ')
    });
    
    const OPENAI_API_KEY = cleanApiKey(rawOpenAIKey);

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Parser le body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('[improve-content] ❌ Erreur parsing body:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          success: false,
          error: 'Body JSON invalide',
        }),
      };
    }
    
    const { action, contentType, content, title, generateFromTitle } = body;
    
    console.log('[improve-content] 📥 Requête reçue:', {
      action,
      contentType,
      hasContent: !!content,
      contentLength: content?.length || 0,
      hasTitle: !!title,
      generateFromTitle: !!generateFromTitle
    });

    // Validation
    if (!action || !['corriger', 'améliorer', 'reformuler', 'enrichir'].includes(action)) {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: 'Action invalide. Doit être: corriger, améliorer, reformuler ou enrichir'
        }),
      };
    }

    if (!contentType || !['note', 'vocabulaire'].includes(contentType)) {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: 'Type de contenu invalide. Doit être: note ou vocabulaire'
        }),
      };
    }

    // Si generateFromTitle est true, on génère le contenu à partir du titre
    const shouldGenerateFromTitle = generateFromTitle === true;
    
    if (shouldGenerateFromTitle) {
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders(origin),
          body: JSON.stringify({ error: 'Un titre est requis pour générer le contenu' }),
        };
      }
    } else {
      // Validation normale : contenu requis si on n'est pas en mode génération
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders(origin),
          body: JSON.stringify({ error: 'Contenu requis' }),
        };
      }
    }

    const actualContent = shouldGenerateFromTitle ? '' : (content || '');
    console.log(`[improve-content] 🎨 Action: ${action}, Type: ${contentType}, Génération depuis titre: ${shouldGenerateFromTitle}, Longueur: ${actualContent.length}`);

    let systemPrompt: string;
    let userMessage: string;

    if (shouldGenerateFromTitle) {
      // Génération à partir du titre
      systemPrompt = `Tu es un assistant d'écriture expert. Génère un contenu complet et structuré pour une note intitulée "${title}".

Règles de formatage STRICTES:
- Utilise des titres hiérarchisés (##, ###) au lieu d'astérisques ** pour les sections
- Supprime TOUS les astérisques inutiles autour des phrases ou titres
- N'utilise JAMAIS d'astérisques ** pour mettre en gras - utilise plutôt des titres de section ou du texte normal
- Si tu dois mettre en évidence un mot ou une phrase, utilise un titre de section (## ou ###) ou simplement du texte normal
- Ajoute des emojis contextuels en début de section (🧠, 🛠️, ⚙️, 📝, 💡, 🎯, etc.)
- Encadre les définitions ou points clés dans des blocs d'information avec > 💡
- Respecte une mise en page aérée avec des sauts de ligne entre les paragraphes
- Ne dépasse JAMAIS 80 caractères par ligne pour une meilleure lisibilité
- Utilise des listes à puces (-) ou numérotées (1.) pour structurer l'information
- INTERDICTION ABSOLUE d'utiliser ** pour le gras - remplace par des titres ou du texte normal
- Sois informatif, utile et adapte le ton au type de note
- Longueur recommandée: 200-500 mots
- Retourne UNIQUEMENT le contenu généré, sans commentaire ni métadonnées

Exemple de formatage:
## 🧠 Qu'est-ce que localhost ?
Localhost, également connu sous le nom de boucle locale...

> 💡 Définition : Localhost est l'adresse IP 127.0.0.1...

### ⚙️ Utilisation
- Point 1
- Point 2`;
      userMessage = `Génère le contenu pour la note: "${title}"`;
    } else {
      // Amélioration du contenu existant
      systemPrompt = buildPromptForAction(
        action as ActionType,
        contentType as ContentType,
        actualContent,
        title
      );
      userMessage = actualContent;
    }

    // Appeler OpenAI
    console.log(`[improve-content] 🔄 Appel OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    let improvedContent = completion.choices[0]?.message?.content || actualContent;
    
    // Nettoyer les astérisques restants (au cas où l'IA ne respecterait pas complètement les instructions)
    improvedContent = cleanBoldMarkers(improvedContent);
    
    const duration = Date.now() - startTime;

    console.log(`[improve-content] ✅ Contenu amélioré en ${duration}ms`);
    console.log(`[improve-content] 📊 Longueur: ${content.length} → ${improvedContent.length}`);

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        success: true,
        original: content,
        improved: improvedContent,
        action,
        contentType,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[improve-content] ❌ Error:', {
      message: errorMessage,
      stack: errorStack,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        duration_ms: duration,
        // En développement, inclure plus de détails
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      }),
    };
  }
};
