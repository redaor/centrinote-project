// 🧪 Netlify Function pour tester les quotas
// Permet d'appliquer des scénarios de test SQL

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Scénarios de test
const scenarios = {
  reset: {
    quotas: {
      ai_tokens_used: 0,
      meeting_count_used: 0,
      meeting_minutes_used: 0,
      summary_count_used: 0,
      vocab_words_count: 0,
      vocab_collections_count: 0,
      notifications_sent: 0,
      automations_active: 0,
      automations_executions: 0
    },
    plan: 'free'
  },
  free: {
    quotas: {
      ai_tokens_used: 20000,
      meeting_count_used: 1,
      meeting_minutes_used: 45,
      summary_count_used: 1,
      vocab_words_count: 50,
      vocab_collections_count: 3
    },
    plan: 'free'
  },
  starter: {
    quotas: {
      ai_tokens_used: 100000,
      meeting_count_used: 7,
      meeting_minutes_used: 315,
      summary_count_used: 5,
      vocab_words_count: 80,
      vocab_collections_count: 7
    },
    plan: 'starter'
  },
  pro: {
    quotas: {
      ai_tokens_used: 550000,
      meeting_count_used: 18,
      meeting_minutes_used: 1080,
      summary_count_used: 0,
      vocab_words_count: 480,
      vocab_collections_count: 45
    },
    plan: 'pro'
  },
  teams: {
    quotas: {
      ai_tokens_used: 1000000,
      meeting_count_used: 35,
      meeting_minutes_used: 2100,
      summary_count_used: 0,
      vocab_words_count: 750,
      vocab_collections_count: 0
    },
    plan: 'teams'
  }
};

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, scenario } = JSON.parse(event.body);

    if (!email || !scenario) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email et scenario requis' })
      };
    }

    if (!scenarios[scenario]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Scénario inconnu: ${scenario}` })
      };
    }

    // Récupérer l'ID utilisateur
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Utilisateur ${email} non trouvé` })
      };
    }

    const userId = userData.id;
    const testScenario = scenarios[scenario];

    // Récupérer l'ID du plan
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', testScenario.plan)
      .single();

    if (planError || !planData) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Plan ${testScenario.plan} non trouvé` })
      };
    }

    // Créer ou mettre à jour le quota
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: quotaError } = await supabase
      .from('user_quotas')
      .upsert({
        user_id: userId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        ...testScenario.quotas,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,period_start'
      });

    if (quotaError) {
      console.error('Erreur mise à jour quota:', quotaError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erreur mise à jour quota', details: quotaError.message })
      };
    }

    // Mettre à jour la subscription
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planData.id,
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subError) {
      console.error('Erreur mise à jour subscription:', subError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erreur mise à jour subscription', details: subError.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Scénario ${scenario} appliqué avec succès`,
        userId,
        plan: testScenario.plan,
        quotas: testScenario.quotas
      })
    };

  } catch (error) {
    console.error('Erreur test-quotas:', error);
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

