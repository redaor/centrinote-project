/**
 * MICRO AUTOMATION TEMPLATES
 * Templates ultra-simples niveau 🟢 pour le système d'automatisation
 * Exécutés via automation-micro-runner Edge Function
 */

export interface MicroTemplate {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'wellbeing' | 'inspiration' | 'learning';
  icon: string;
  color: string;
  level: 'beginner';
  trigger: {
    type: string;
    description: string;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    schedule?: {
      type: string;
      time?: string;
      timezone?: string;
    };
  };
  action: {
    type: string;
    config: Record<string, any>;
  };
  defaultConfig: Record<string, any>;
  isPremium: boolean;
}

/**
 * 3 nouveaux templates micro
 */
export const microTemplates: MicroTemplate[] = [
  {
    id: 'focus_mode',
    name: 'Mode Focus',
    description: 'Notification silencieuse au démarrage de session d\'étude',
    category: 'productivity',
    icon: '🎯',
    color: '#6366f1',
    level: 'beginner',
    trigger: {
      type: 'session_started',
      description: 'Se déclenche au démarrage d\'une session d\'étude',
    },
    action: {
      type: 'send_notification',
      config: {
        title: 'Mode Focus',
        message: 'Mode focus activé – notifications silencieuses',
        notification_type: 'info',
        priority: 'low',
      },
    },
    defaultConfig: {
      message: 'Mode focus activé – notifications silencieuses',
    },
    isPremium: false,
  },

  {
    id: 'break_time',
    name: 'Pause Active',
    description: 'Email + notification 15 min après session ≥ 45 min',
    category: 'wellbeing',
    icon: '☕',
    color: '#10b981',
    level: 'beginner',
    trigger: {
      type: 'session_completed',
      description: 'Se déclenche après une session d\'au moins 45 minutes',
      conditions: [
        {
          field: 'duration_minutes',
          operator: 'greater_than',
          value: 45,
        },
      ],
    },
    action: {
      type: 'send_email_and_notification',
      config: {
        email: {
          subject: 'Pause Active - Centrinote',
          body: 'Bravo pour cette session ! Prenez une pause bien méritée.',
        },
        notification: {
          title: 'Pause Active',
          message: 'Bravo ! Session terminée. Rappel dans 15 min.',
          notification_type: 'success',
          priority: 'normal',
        },
        delay_minutes: 15,
      },
    },
    defaultConfig: {
      delay_minutes: 15,
    },
    isPremium: false,
  },

  {
    id: 'daily_quote',
    name: 'Citation Motivation',
    description: 'Citation aléatoire envoyée par email chaque jour à 08:00',
    category: 'inspiration',
    icon: '💭',
    color: '#f59e0b',
    level: 'beginner',
    trigger: {
      type: 'time_based',
      description: 'Se déclenche chaque jour à 08:00',
      schedule: {
        type: 'daily',
        time: '08:00',
        timezone: 'Europe/Paris',
      },
    },
    action: {
      type: 'send_email',
      config: {
        subject: 'Citation du jour - Centrinote',
        body: 'Citation aléatoire depuis la table quotes',
        source: 'quotes_table',
        random: true,
      },
    },
    defaultConfig: {
      time: '08:00',
      timezone: 'Europe/Paris',
    },
    isPremium: false,
  },
];

/**
 * Options pour les templates existants (améliorations)
 */
export const templateEnhancements = {
  daily_review: {
    reminder_sound: {
      name: 'reminder_sound',
      label: 'Son de rappel',
      description: 'Jouer un son système lors de la notification',
      type: 'boolean',
      default: true,
    },
  },
  vocab_milestone: {
    share_button: {
      name: 'share_button',
      label: 'Bouton Partager',
      description: 'Afficher un bouton "Partager" dans la notification',
      type: 'boolean',
      default: false,
    },
  },
};

/**
 * Fonction helper pour obtenir un template par ID
 */
export function getMicroTemplateById(templateId: string): MicroTemplate | undefined {
  return microTemplates.find(t => t.id === templateId);
}

/**
 * Fonction helper pour obtenir les templates par catégorie
 */
export function getMicroTemplatesByCategory(category: string): MicroTemplate[] {
  return microTemplates.filter(t => t.category === category);
}

/**
 * Fonction helper pour obtenir tous les IDs de templates micro
 */
export function getMicroTemplateIds(): string[] {
  return microTemplates.map(t => t.id);
}

/**
 * Fonction helper pour valider si un ID est un micro template
 */
export function isMicroTemplate(templateId: string): boolean {
  return getMicroTemplateIds().includes(templateId);
}

/**
 * Configuration par défaut pour l'exécution des micro templates
 */
export const microTemplateDefaults = {
  focus_mode: {
    message: 'Mode focus activé – notifications silencieuses',
  },
  break_time: {
    delay_minutes: 15,
  },
  daily_quote: {
    time: '08:00',
    timezone: 'Europe/Paris',
    category: 'general', // Catégorie de citation par défaut
  },
};

/**
 * Exemples d'utilisation des micro templates
 */
export const microTemplateExamples = {
  focus_mode: {
    description: 'Active le mode focus au démarrage de session',
    usage: `
import { automationService } from '@/services/automationService';

// Exécuter le template focus_mode
await automationService.executeMicroTemplate('focus_mode', userId, {
  message: 'Concentration maximale activée !'
});
    `,
  },
  break_time: {
    description: 'Envoie un rappel de pause après une longue session',
    usage: `
import { automationService } from '@/services/automationService';

// Exécuter le template break_time
await automationService.executeMicroTemplate('break_time', userId, {
  delay_minutes: 20 // Personnaliser le délai
});
    `,
  },
  daily_quote: {
    description: 'Envoie une citation motivante quotidienne',
    usage: `
import { automationService } from '@/services/automationService';

// Exécuter le template daily_quote
await automationService.executeMicroTemplate('daily_quote', userId, {
  category: 'motivation' // Citation de catégorie motivation
});
    `,
  },
};
