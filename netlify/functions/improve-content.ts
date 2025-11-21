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
- Garde le TON et le STYLE de l'auteur
- Ne change PAS radicalement le contenu
- Garde la même longueur approximative
- Retourne UNIQUEMENT le texte amélioré, sans commentaire`,

    reformuler: `Tu es un expert en reformulation. Reformule le texte suivant pour le rendre plus concis et percutant.

${contentType === 'note' && title ? `Titre: ${title}\n\n` : ''}Contenu à reformuler:
${content}

Règles:
- Reformule pour plus de concision
- Garde toutes les informations importantes
- Utilise un langage clair et direct
- Conserve l'intention de l'auteur
- Retourne UNIQUEMENT le texte reformulé, sans commentaire`,

    enrichir: `Tu es un assistant pédagogique expert. Enrichis le texte suivant avec des détails pertinents, des exemples ou des clarifications utiles.

${contentType === 'note' && title ? `Titre: ${title}\n\n` : ''}Contenu à enrichir:
${content}

Règles:
- Ajoute des détails, exemples ou clarifications pertinents
- Ne dénature PAS le message original
- Reste dans le même domaine/sujet
- Garde un ton pédagogique et accessible
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
    const OPENAI_API_KEY = cleanApiKey(rawOpenAIKey);

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Parser le body
    const body = JSON.parse(event.body || '{}');
    const { action, contentType, content, title } = body;

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

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: 'Contenu requis' }),
      };
    }

    console.log(`[improve-content] 🎨 Action: ${action}, Type: ${contentType}, Longueur: ${content.length}`);

    // Construire le prompt
    const systemPrompt = buildPromptForAction(
      action as ActionType,
      contentType as ContentType,
      content,
      title
    );

    // Appeler OpenAI
    console.log(`[improve-content] 🔄 Appel OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const improvedContent = completion.choices[0]?.message?.content || content;
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
    console.error('[improve-content] ❌ Error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration_ms: duration,
      }),
    };
  }
};
