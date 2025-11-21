import { createClient } from '@supabase/supabase-js';

// Handler pour récupérer toutes les configurations d'automatisation
export const handler = async (event: any, context: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token requis' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token invalide' })
      };
    }

    // Récupérer toutes les configurations
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('user_id', user.id)
      .order('automation_type');

    if (error) {
      throw error;
    }

    // Transformer en map pour facilité d'usage côté client
    const automationsMap = automations.reduce((acc, automation) => {
      acc[automation.automation_type] = automation;
      return acc;
    }, {} as Record<string, any>);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          automations: automationsMap,
          count: automations.length
        }
      })
    };

  } catch (error: any) {
    console.error('Erreur automation-get:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur serveur',
        details: error.message
      })
    };
  }
};