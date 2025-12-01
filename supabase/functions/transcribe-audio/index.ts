/**
 * Edge Function pour transcrire l'audio via OpenAI Whisper
 * Utilise OPENAI_API_KEY depuis les secrets Supabase (plus sécurisé)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY non configurée dans Supabase' }),
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

    // Préparer le FormData pour OpenAI
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile);
    openaiFormData.append('model', 'whisper-1');
    // FIX: Ne pas forcer la langue pour permettre la détection automatique multilingue
    // Whisper détecte automatiquement les langues dans un même flux audio
    // openaiFormData.append('language', 'fr'); // Retiré pour support multilingue

    // Appeler l'API OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Erreur inconnue' } }));
      return new Response(
        JSON.stringify({ error: errorData.error?.message || `Erreur API: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let transcribedText = data.text || '';
    const detectedLanguage = data.language || 'auto'; // Whisper retourne parfois la langue détectée

    // FIX: Amélioration multilingue - Formatage intelligent du texte transcrit
    // Si le texte contient des segments dans différentes langues, on peut les marquer
    // Note: Whisper gère déjà le multilingue, mais on peut améliorer le formatage
    if (transcribedText) {
      // Détecter les changements de langue potentiels (basé sur les caractères)
      const hasArabic = /[\u0600-\u06FF]/.test(transcribedText);
      const hasFrench = /[àâäéèêëïîôùûüÿç]/.test(transcribedText) || /[ÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/.test(transcribedText);
      
      // Si on détecte un mélange de langues, on peut ajouter des indicateurs
      // (optionnel, car Whisper gère déjà bien le multilingue)
      if (hasArabic && hasFrench) {
        console.log('🌍 Transcription multilingue détectée (arabe + français)');
        // Le texte est déjà bien transcrit par Whisper, on le retourne tel quel
        // L'utilisateur peut voir le texte mixte directement
      }
    }

    return new Response(
      JSON.stringify({ 
        text: transcribedText,
        language: detectedLanguage, // Langue principale détectée
        isMultilingual: detectedLanguage === 'auto' || transcribedText.includes('[') // Indicateur simple
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur transcription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

