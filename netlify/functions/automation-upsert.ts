import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Types et validations
const AutomationTypeSchema = z.enum([
  'daily_review',
  'vocab_milestone', 
  'forgotten_notes',
  'study_reminder',
  'weekly_summary',
  'monthly_report'
]);

const BaseConfigSchema = z.object({
  active: z.boolean(),
  timezone: z.string().optional()
});

const DailyReviewConfigSchema = BaseConfigSchema.extend({
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM requis"),
  days_of_week: z.array(z.number().min(1).max(7)).optional()
});

const VocabMilestoneConfigSchema = BaseConfigSchema.extend({
  thresholds: z.array(z.number().positive()).min(1),
  celebrate_mastery: z.boolean()
});

const ForgottenNotesConfigSchema = BaseConfigSchema.extend({
  after_days: z.number().positive().max(365),
  max_notes: z.number().positive().max(20)
});

const StudyReminderConfigSchema = BaseConfigSchema.extend({
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  days_of_week: z.array(z.number().min(1).max(7)).optional()
});

const WeeklySummaryConfigSchema = BaseConfigSchema.extend({
  day_of_week: z.number().min(0).max(6),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
});

const MonthlyReportConfigSchema = BaseConfigSchema.extend({
  day_of_month: z.number().min(1).max(28),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
});

// Validation par type d'automatisation
const getConfigSchema = (automationType: string) => {
  switch (automationType) {
    case 'daily_review':
      return DailyReviewConfigSchema;
    case 'vocab_milestone':
      return VocabMilestoneConfigSchema;
    case 'forgotten_notes':
      return ForgottenNotesConfigSchema;
    case 'study_reminder':
      return StudyReminderConfigSchema;
    case 'weekly_summary':
      return WeeklySummaryConfigSchema;
    case 'monthly_report':
      return MonthlyReportConfigSchema;
    default:
      throw new Error(`Type d'automatisation non supporté: ${automationType}`);
  }
};

const RequestSchema = z.object({
  automation_type: AutomationTypeSchema,
  config: z.record(z.any()) // Validation spécifique par type
});

// Handler principal
export const handler = async (event: any, context: any) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    // Initialiser Supabase
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
        body: JSON.stringify({ error: 'Token d\'authentification requis' })
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

    // Parser et valider la requête
    const body = JSON.parse(event.body || '{}');
    const { automation_type, config } = RequestSchema.parse(body);

    // Validation spécifique de la config
    const configSchema = getConfigSchema(automation_type);
    const validatedConfig = configSchema.parse(config);

    console.log(`🔧 Upsert automation ${automation_type} pour user ${user.id}`);

    // Upsert en base
    const { data, error } = await supabase
      .from('automations')
      .upsert({
        user_id: user.id,
        automation_type,
        config: validatedConfig,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,automation_type'
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur upsert automation:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Erreur lors de la sauvegarde',
          details: error.message 
        })
      };
    }

    console.log(`✅ Automation ${automation_type} sauvegardée`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        message: 'Configuration sauvegardée avec succès'
      })
    };

  } catch (error: any) {
    console.error('Erreur automation-upsert:', error);

    // Erreurs de validation Zod
    if (error.name === 'ZodError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Données invalides',
          details: error.errors
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur serveur interne',
        details: error.message
      })
    };
  }
};