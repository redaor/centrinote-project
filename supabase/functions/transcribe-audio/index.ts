/**
 * Edge Function pour transcrire l'audio via OpenAI Whisper API
 * Utilise OPENAI_TRANSCRIPTION_AUDIO_KEY depuis les secrets Supabase
 * Supporte les fichiers audio jusqu'à 25MB, formats multiples
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration OpenAI Whisper
const OPENAI_CONFIG = {
  endpoint: 'https://api.openai.com/v1/audio/transcriptions',
  model: 'whisper-1',
  maxFileSize: 25 * 1024 * 1024, // 25MB max
  supportedFormats: ['m4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'wav', 'webm'],
};

// Codes d'erreur OpenAI avec messages utilisateur
const TRANSCRIPTION_ERRORS: Record<string, string> = {
  'invalid_api_key': 'Clé API invalide - Vérifiez votre configuration',
  'insufficient_quota': 'Quota dépassé - Contactez l\'administrateur',
  'rate_limit_exceeded': 'Trop de requêtes - Réessayez dans 1 minute',
  'invalid_file_format': 'Format audio non supporté',
  'file_too_large': 'Fichier trop volumineux (max 25MB)',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Vérifier l'utilisateur
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la clé OpenAI depuis les secrets Supabase
    const openaiApiKey = Deno.env.get('OPENAI_TRANSCRIPTION_AUDIO_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_TRANSCRIPTION_AUDIO_KEY non configurée dans Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le fichier audio depuis le body
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Aucun fichier audio fourni' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation de la taille du fichier (25MB max)
    if (audioFile.size > OPENAI_CONFIG.maxFileSize) {
      return new Response(
        JSON.stringify({ 
          error: TRANSCRIPTION_ERRORS['file_too_large'],
          maxSize: OPENAI_CONFIG.maxFileSize,
          actualSize: audioFile.size,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation du format audio
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase() || '';
    if (!OPENAI_CONFIG.supportedFormats.includes(fileExtension)) {
      return new Response(
        JSON.stringify({ 
          error: TRANSCRIPTION_ERRORS['invalid_file_format'],
          supportedFormats: OPENAI_CONFIG.supportedFormats,
          receivedFormat: fileExtension,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Préparer le FormData pour OpenAI
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile);
    openaiFormData.append('model', OPENAI_CONFIG.model);
    openaiFormData.append('response_format', 'text'); // Retour simple texte
    // Ne pas forcer la langue pour permettre la détection automatique multilingue
    // Whisper détecte automatiquement les langues dans un même flux audio
    // openaiFormData.append('language', 'fr'); // Optionnel: détection auto si absent

    // Appeler l'API OpenAI
    const response = await fetch(OPENAI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        // Pas de Content-Type ici - FormData le gère automatiquement
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Erreur inconnue', code: 'unknown' } }));
      const errorCode = errorData.error?.code || errorData.error?.type || 'unknown';
      const errorMessage = TRANSCRIPTION_ERRORS[errorCode] || errorData.error?.message || `Erreur API: ${response.status}`;
      
      console.error('❌ Erreur Whisper API:', {
        status: response.status,
        code: errorCode,
        message: errorData.error?.message,
      });

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode,
          details: errorData.error?.message,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Whisper retourne du texte simple avec response_format: 'text'
    const transcribedText = await response.text();
    const trimmedText = transcribedText.trim();

    // Détection multilingue (optionnel, pour métadonnées)
    let detectedLanguage = 'auto';
    let isMultilingual = false;
    
    if (trimmedText) {
      // Détecter les changements de langue potentiels (basé sur les caractères)
      const hasArabic = /[\u0600-\u06FF]/.test(trimmedText);
      const hasFrench = /[àâäéèêëïîôùûüÿç]/.test(trimmedText) || /[ÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/.test(trimmedText);
      
      if (hasArabic && hasFrench) {
        console.log('🌍 Transcription multilingue détectée (arabe + français)');
        isMultilingual = true;
        detectedLanguage = 'multilingual';
      } else if (hasFrench) {
        detectedLanguage = 'fr';
      } else if (hasArabic) {
        detectedLanguage = 'ar';
      }
    }

    console.log('✅ Transcription réussie:', {
      textLength: trimmedText.length,
      preview: trimmedText.slice(0, 50),
      language: detectedLanguage,
      isMultilingual,
    });

    return new Response(
      JSON.stringify({ 
        text: trimmedText,
        language: detectedLanguage,
        isMultilingual,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erreur transcription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ 
        error: `Transcription échouée: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

