// Types pour la configuration des automatisations Centrinote
// Personnalisation minimaliste mais flexible

// Propriétés communes à toutes les automatisations
export interface BaseConfig {
  active: boolean;
  timezone?: string; // optionnel, sinon profil user
}

// Configuration révision quotidienne
export interface DailyReviewConfig extends BaseConfig {
  time: string; // Format "HH:MM" (ex: "09:00")
  days_of_week?: number[]; // [1,2,3,4,5,6,7] = Lundi à Dimanche, défaut tous
}

// Configuration milestone vocabulaire
export interface VocabMilestoneConfig extends BaseConfig {
  thresholds: number[]; // [50, 100, 200, 500]
  celebrate_mastery: boolean; // Célébrer la maîtrise complète
}

// Configuration notes oubliées
export interface ForgottenNotesConfig extends BaseConfig {
  after_days: number; // Nombre de jours avant rappel
  max_notes: number; // Nombre max de notes à proposer
}

// Configuration rappel session d'étude
export interface StudyReminderConfig extends BaseConfig {
  time: string; // Format "HH:MM"
  days_of_week?: number[]; // Jours actifs
}

// Configuration résumé hebdomadaire
export interface WeeklySummaryConfig extends BaseConfig {
  day_of_week: number; // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  time: string; // Format "HH:MM"
}

// Configuration bilan mensuel
export interface MonthlyReportConfig extends BaseConfig {
  day_of_month: number; // 1-28 pour éviter les problèmes de fin de mois
  time: string; // Format "HH:MM"
}

// Union de tous les types de config
export type AutomationConfig = 
  | DailyReviewConfig
  | VocabMilestoneConfig 
  | ForgottenNotesConfig
  | StudyReminderConfig
  | WeeklySummaryConfig
  | MonthlyReportConfig;

// Types d'automatisation supportés
export type AutomationType = 
  | 'daily_review'
  | 'vocab_milestone'
  | 'forgotten_notes'
  | 'study_reminder'
  | 'weekly_summary'
  | 'monthly_report';

// Structure de l'enregistrement en base
export interface AutomationRecord {
  id: string;
  user_id: string;
  automation_type: AutomationType;
  config: AutomationConfig;
  created_at: string;
  updated_at: string;
}

// Log d'exécution
export interface AutomationLog {
  id: string;
  user_id: string;
  automation_type: AutomationType;
  idempotency_key: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  metadata?: Record<string, any>;
  executed_at: string;
}

// Configurations par défaut
export const DEFAULT_CONFIGS: Record<AutomationType, AutomationConfig> = {
  daily_review: {
    active: true,
    time: "09:00",
    days_of_week: [1, 2, 3, 4, 5, 6, 7] // Tous les jours
  } as DailyReviewConfig,

  vocab_milestone: {
    active: true,
    thresholds: [50, 100, 200],
    celebrate_mastery: true
  } as VocabMilestoneConfig,

  forgotten_notes: {
    active: true,
    after_days: 7,
    max_notes: 3
  } as ForgottenNotesConfig,

  study_reminder: {
    active: true,
    time: "18:00",
    days_of_week: [1, 2, 3, 4, 5] // Lundi à Vendredi
  } as StudyReminderConfig,

  weekly_summary: {
    active: true,
    day_of_week: 5, // Vendredi
    time: "17:00"
  } as WeeklySummaryConfig,

  monthly_report: {
    active: true,
    day_of_month: 1, // 1er du mois
    time: "08:00"
  } as MonthlyReportConfig
};

// Labels pour l'interface utilisateur
export const AUTOMATION_LABELS: Record<AutomationType, string> = {
  daily_review: "Révision quotidienne",
  vocab_milestone: "Milestone vocabulaire", 
  forgotten_notes: "Notes oubliées",
  study_reminder: "Session d'étude",
  weekly_summary: "Résumé hebdomadaire",
  monthly_report: "Bilan mensuel"
};

// Descriptions pour l'interface utilisateur
export const AUTOMATION_DESCRIPTIONS: Record<AutomationType, string> = {
  daily_review: "Rappel quotidien pour réviser vos notes et vocabulaire",
  vocab_milestone: "Célébration automatique des paliers de vocabulaire atteints",
  forgotten_notes: "Rappel des notes non consultées depuis plusieurs jours",
  study_reminder: "Notification pour vos sessions d'étude planifiées",
  weekly_summary: "Résumé hebdomadaire de vos progrès et activités",
  monthly_report: "Bilan mensuel complet de votre apprentissage"
};

// Jours de la semaine pour l'interface
export const WEEKDAYS = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
  { value: 7, label: "Dimanche", short: "Dim" }
];

// Seuils vocabulaire disponibles
export const VOCAB_THRESHOLDS = [50, 100, 200, 500, 1000];