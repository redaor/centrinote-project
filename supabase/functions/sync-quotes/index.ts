// =====================================================
// SYNC QUOTES - Edge Function pour remplir la table daily_quotes
// À appeler via cron hebdomadaire (ex: dimanche 2h du matin)
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Citations de motivation en français (50 citations)
const FRENCH_QUOTES = [
  { quote: 'Le succès, c\'est tomber sept fois, se relever huit.', author: 'Proverbe japonais' },
  { quote: 'La vie est ce qui vous arrive pendant que vous êtes occupé à faire d\'autres projets.', author: 'John Lennon' },
  { quote: 'L\'avenir appartient à ceux qui croient en la beauté de leurs rêves.', author: 'Eleanor Roosevelt' },
  { quote: 'Le seul moyen de faire du bon travail est d\'aimer ce que vous faites.', author: 'Steve Jobs' },
  { quote: 'Ne vous inquiétez pas des échecs, inquiétez-vous des chances que vous manquez quand vous n\'essayez même pas.', author: 'Jack Canfield' },
  { quote: 'Le succès n\'est pas final, l\'échec n\'est pas fatal : c\'est le courage de continuer qui compte.', author: 'Winston Churchill' },
  { quote: 'Votre limitation n\'est que votre imagination.', author: 'Inconnu' },
  { quote: 'Poussez-vous, parce que personne d\'autre ne le fera pour vous.', author: 'Inconnu' },
  { quote: 'Le succès est la somme de petits efforts répétés jour après jour.', author: 'Robert Collier' },
  { quote: 'La seule façon de faire du bon travail est d\'aimer ce que vous faites.', author: 'Steve Jobs' },
  { quote: 'Ne laissez jamais personne vous dire que vous ne pouvez pas faire quelque chose.', author: 'Inconnu' },
  { quote: 'Les obstacles sont ces choses effrayantes que vous voyez quand vous détournez les yeux de votre objectif.', author: 'Henry Ford' },
  { quote: 'Le succès consiste à aller d\'échec en échec sans perdre son enthousiasme.', author: 'Winston Churchill' },
  { quote: 'Si vous pouvez le rêver, vous pouvez le faire.', author: 'Walt Disney' },
  { quote: 'L\'excellence n\'est pas une compétence, c\'est une attitude.', author: 'Ralph Marston' },
  { quote: 'Le seul moment où vous échouez est le dernier moment où vous essayez.', author: 'Inconnu' },
  { quote: 'Ne comptez pas les jours, faites que les jours comptent.', author: 'Muhammad Ali' },
  { quote: 'La différence entre l\'impossible et le possible réside dans la détermination d\'une personne.', author: 'Tommy Lasorda' },
  { quote: 'Vous ne pouvez pas connecter les points en regardant vers l\'avant ; vous ne pouvez les connecter qu\'en regardant en arrière.', author: 'Steve Jobs' },
  { quote: 'La vie est 10% ce qui vous arrive et 90% comment vous y réagissez.', author: 'Charles R. Swindoll' },
  { quote: 'Le succès n\'est pas la clé du bonheur. Le bonheur est la clé du succès.', author: 'Albert Schweitzer' },
  { quote: 'Croyez en vous-même et tout devient possible.', author: 'Inconnu' },
  { quote: 'Les champions ne sont pas faits dans les salles de sport. Les champions sont faits de quelque chose de profond en eux.', author: 'Muhammad Ali' },
  { quote: 'La seule personne que vous êtes destiné à devenir est la personne que vous décidez d\'être.', author: 'Ralph Waldo Emerson' },
  { quote: 'Ne vous arrêtez pas quand vous êtes fatigué. Arrêtez-vous quand vous avez terminé.', author: 'Inconnu' },
  { quote: 'Le succès est un voyage, pas une destination.', author: 'Ben Sweetland' },
  { quote: 'Faites aujourd\'hui ce que les autres ne veulent pas faire, pour avoir demain ce que les autres ne peuvent pas avoir.', author: 'Jerry Rice' },
  { quote: 'La motivation vous fait démarrer. L\'habitude vous fait continuer.', author: 'Jim Ryun' },
  { quote: 'Les gagnants ne renoncent jamais et ceux qui renoncent ne gagnent jamais.', author: 'Vince Lombardi' },
  { quote: 'Le succès n\'est pas de ne jamais tomber, mais de se relever chaque fois que vous tombez.', author: 'Nelson Mandela' },
  { quote: 'Votre temps est limité, ne le gaspillez pas en vivant la vie de quelqu\'un d\'autre.', author: 'Steve Jobs' },
  { quote: 'La seule façon de faire du bon travail est d\'aimer ce que vous faites.', author: 'Steve Jobs' },
  { quote: 'Ne laissez jamais la peur de frapper vous empêcher de jouer le jeu.', author: 'Babe Ruth' },
  { quote: 'Le succès consiste à obtenir ce que vous voulez. Le bonheur consiste à vouloir ce que vous obtenez.', author: 'Dale Carnegie' },
  { quote: 'Les opportunités ne se présentent pas. Vous les créez.', author: 'Chris Grosser' },
  { quote: 'Le succès est la somme de petits efforts répétés jour après jour.', author: 'Robert Collier' },
  { quote: 'Ne vous arrêtez pas quand vous êtes fatigué. Arrêtez-vous quand vous avez terminé.', author: 'Inconnu' },
  { quote: 'La seule personne que vous êtes destiné à devenir est la personne que vous décidez d\'être.', author: 'Ralph Waldo Emerson' },
  { quote: 'Le succès n\'est pas la clé du bonheur. Le bonheur est la clé du succès.', author: 'Albert Schweitzer' },
  { quote: 'Croyez en vous-même et tout devient possible.', author: 'Inconnu' },
  { quote: 'Les champions ne sont pas faits dans les salles de sport. Les champions sont faits de quelque chose de profond en eux.', author: 'Muhammad Ali' },
  { quote: 'Faites aujourd\'hui ce que les autres ne veulent pas faire, pour avoir demain ce que les autres ne peuvent pas avoir.', author: 'Jerry Rice' },
  { quote: 'La motivation vous fait démarrer. L\'habitude vous fait continuer.', author: 'Jim Ryun' },
  { quote: 'Les gagnants ne renoncent jamais et ceux qui renoncent ne gagnent jamais.', author: 'Vince Lombardi' },
  { quote: 'Le succès n\'est pas de ne jamais tomber, mais de se relever chaque fois que vous tombez.', author: 'Nelson Mandela' },
  { quote: 'Votre temps est limité, ne le gaspillez pas en vivant la vie de quelqu\'un d\'autre.', author: 'Steve Jobs' },
  { quote: 'Ne laissez jamais la peur de frapper vous empêcher de jouer le jeu.', author: 'Babe Ruth' },
  { quote: 'Le succès consiste à obtenir ce que vous voulez. Le bonheur consiste à vouloir ce que vous obtenez.', author: 'Dale Carnegie' },
  { quote: 'Les opportunités ne se présentent pas. Vous les créez.', author: 'Chris Grosser' },
  { quote: 'Le succès est la somme de petits efforts répétés jour après jour.', author: 'Robert Collier' },
  { quote: 'Ne vous arrêtez pas quand vous êtes fatigué. Arrêtez-vous quand vous avez terminé.', author: 'Inconnu' },
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔄 Sync Quotes - Starting...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier combien de citations existent déjà
    const { count: existingCount } = await supabase
      .from('daily_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'fr')
      .eq('category', 'motivation');

    console.log(`📊 Citations existantes: ${existingCount || 0}`);

    // Préparer les citations à insérer (éviter les doublons)
    const quotesToInsert = FRENCH_QUOTES.map(q => ({
      quote: q.quote,
      author: q.author,
      category: 'motivation',
      language: 'fr',
      used_at: null, // Nouvelle citation, jamais utilisée
    }));

    // Insérer les citations (ON CONFLICT DO NOTHING pour éviter les doublons)
    const { data, error } = await supabase
      .from('daily_quotes')
      .upsert(quotesToInsert, {
        onConflict: 'quote,language,category',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      console.error('❌ Error inserting quotes:', error);
      throw error;
    }

    const insertedCount = data?.length || 0;
    console.log(`✅ ${insertedCount} citations synchronisées`);

    return new Response(
      JSON.stringify({
        success: true,
        existing_count: existingCount || 0,
        inserted_count: insertedCount,
        total_quotes: FRENCH_QUOTES.length,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in sync-quotes:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

