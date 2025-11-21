import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  BookOpen,
  Mail,
  Save,
  Play,
  Pause,
  Settings,
  Star,
  Trophy,
  Bell,
  Calendar,
  MoreVertical,
  X,
  Check,
  PlayCircle,
  Zap
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import { AutomationSettingsModal } from './AutomationSettingsModal';
import { AutomationSandboxV2 } from './AutomationSandboxV2';
import { automationService } from '../../services/automationService';
import { supabase } from '../../lib/supabase';
import { calculateNextExecution, triggerConfigToScheduleConfig } from '../../utils/automationHelpers';
import type { Automation } from '../../types/automation';

// Types simplifiés style IFTTT
interface AutomationSettings {
  hour?: string;
  milestone?: number;
  delayDays?: number;
  studyHour?: string;
  breakDuration?: number;
  breakDelayMinutes?: number; // Délai en minutes avant le rappel de pause
  emailDay?: string;
  emailHour?: string;
  backupHour?: string;
  quoteTime?: string;
}

interface SimpleAutomation {
  id: string;
  dbId?: string; // ID dans la base de données Supabase
  title: string;
  description: string;
  category: 'revisions' | 'rappels' | 'résumés' | 'sauvegardes';
  trigger: string;
  action: string;
  isActive: boolean;
  icon: string;
  color: string;
  settings?: AutomationSettings;
}

// Modèles prédéfinis inspirés d'IFTTT
const AUTOMATION_TEMPLATES: SimpleAutomation[] = [
  // Révisions
  {
    id: 'daily-review',
    title: 'Révision quotidienne',
    description: 'Rappel tous les jours à 9h pour réviser vos notes',
    category: 'revisions',
    trigger: 'Tous les jours à 9h',
    action: 'Envoyer une notification de révision',
    isActive: false,
    icon: 'clock',
    color: 'blue',
    settings: { hour: '09:00' }
  },
  {
    id: 'vocab-milestone',
    title: 'Milestone vocabulaire',
    description: 'Célébrer quand vous atteignez 50, 100 ou 200 mots',
    category: 'revisions',
    trigger: 'Atteindre 50/100/200 mots',
    action: 'Envoyer félicitations + badge',
    isActive: false,
    icon: 'trophy',
    color: 'yellow',
    settings: { milestone: 50 }
  },
  {
    id: 'forgotten-notes',
    title: 'Notes oubliées',
    description: 'Rappel pour les notes non consultées depuis 7 jours',
    category: 'revisions',
    trigger: 'Note non vue depuis 7 jours',
    action: 'Proposer de réviser la note',
    isActive: false,
    icon: 'book-open',
    color: 'orange',
    settings: { delayDays: 7 }
  },

  // Rappels
  {
    id: 'study-reminder',
    title: 'Session d\'étude',
    description: 'Rappel quotidien pour votre session d\'étude',
    category: 'rappels',
    trigger: 'Tous les jours à 18h',
    action: 'Rappel "C\'est l\'heure d\'étudier !"',
    isActive: false,
    icon: 'bell',
    color: 'green',
    settings: { studyHour: '18:00' }
  },
  {
    id: 'break-reminder',
    title: 'Pause bien méritée',
    description: 'Rappel de faire une pause après une session d\'étude',
    category: 'rappels',
    trigger: 'Après une session d\'étude',
    action: 'Email + notification de pause après le délai configuré',
    isActive: false,
    icon: 'clock',
    color: 'purple',
    settings: { breakDuration: 120, breakDelayMinutes: 30 }
  },

  // Résumés
  {
    id: 'weekly-summary',
    title: 'Résumé hebdomadaire',
    description: 'Email avec vos progrès et statistiques chaque vendredi',
    category: 'résumés',
    trigger: 'Tous les vendredis à 17h',
    action: 'Envoyer email de résumé',
    isActive: false,
    icon: 'mail',
    color: 'blue',
    settings: { emailDay: 'vendredi', emailHour: '17:00' }
  },
  {
    id: 'monthly-report',
    title: 'Bilan mensuel',
    description: 'Rapport complet de vos apprentissages du mois',
    category: 'résumés',
    trigger: 'Le 1er de chaque mois',
    action: 'Créer rapport mensuel détaillé',
    isActive: false,
    icon: 'calendar',
    color: 'indigo',
    settings: { emailHour: '09:00' }
  },

  // Sauvegardes
  {
    id: 'daily-backup',
    title: 'Sauvegarde quotidienne',
    description: 'Sauvegarde automatique de toutes vos notes à 2h du matin',
    category: 'sauvegardes',
    trigger: 'Tous les jours à 2h',
    action: 'Sauvegarder toutes les données',
    isActive: false,
    icon: 'save',
    color: 'gray',
    settings: { backupHour: '02:00' }
  },

  // 🟢 Micro Templates (Nouveaux - Niveau débutant)
  {
    id: 'focus_mode',
    title: '🟢 Mode Focus',
    description: 'Notification silencieuse au démarrage de session',
    category: 'revisions',
    trigger: 'Session d\'étude démarrée',
    action: 'Notification "Mode focus activé"',
    isActive: false,
    icon: 'star',
    color: 'blue',
    settings: {}
  },
  {
    id: 'daily_quote',
    title: '🟢 Citation Motivation',
    description: 'Citation aléatoire par email chaque matin à 8h',
    category: 'résumés',
    trigger: 'Tous les jours à 8h',
    action: 'Envoyer citation motivante',
    isActive: false,
    icon: 'mail',
    color: 'yellow',
    settings: { quoteTime: '08:00' }
  }
];

const CATEGORY_CONFIG = {
  revisions: {
    title: 'Révisions',
    icon: BookOpen,
    color: 'blue',
    description: 'Optimisez vos révisions avec des rappels intelligents'
  },
  rappels: {
    title: 'Rappels',
    icon: Bell,
    color: 'green',
    description: 'Ne ratez jamais vos sessions d\'étude'
  },
  résumés: {
    title: 'Résumés',
    icon: Mail,
    color: 'purple',
    description: 'Suivez vos progrès avec des rapports automatiques'
  },
  sauvegardes: {
    title: 'Sauvegardes',
    icon: Save,
    color: 'gray',
    description: 'Protégez vos données avec des sauvegardes régulières'
  }
};

export function SimpleAutomationDashboard() {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { toasts, success } = useToast();

  const [automations, setAutomations] = useState<SimpleAutomation[]>(AUTOMATION_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<SimpleAutomation | null>(null);
  const [tempSettings, setTempSettings] = useState<AutomationSettings>({});
  const [loading, setLoading] = useState(true);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  const cleanDuplicatePauseAutomations = async (items: Automation[]): Promise<Automation[]> => {
    let workingList = [...items];

    const breakReminderList = workingList.filter(auto => auto.name === 'break-reminder');
    const breakTimeList = workingList.filter(auto => auto.name === 'break_time');

    const sortByPriority = (list: Automation[]) => {
      return [...list].sort((a, b) => {
        if (a.is_active !== b.is_active) {
          return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
        }

        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });
    };

    // Cas 1 : On a déjà une automatisation break-reminder -> supprimer toutes les break_time
    if (breakReminderList.length > 0 && breakTimeList.length > 0) {
      console.log(`🧹 Suppression de ${breakTimeList.length} doublon(s) "break_time" (break-reminder existe déjà)`);
      for (const automation of breakTimeList) {
        try {
          await automationService.deleteAutomation(automation.id);
          console.log('✅ Doublon break_time supprimé:', automation.id);
        } catch (error) {
          console.warn('⚠️ Impossible de supprimer le doublon break_time', automation.id, error);
        }
      }
      workingList = workingList.filter(auto => auto.name !== 'break_time');
      return workingList;
    }

    // Cas 2 : Pas de break-reminder, mais des break_time -> on en garde une seule qu'on renomme
    if (breakReminderList.length === 0 && breakTimeList.length > 0) {
      const sortedBreakTime = sortByPriority(breakTimeList);
      const survivor = sortedBreakTime[0];
      const duplicates = sortedBreakTime.slice(1);

      console.log(`♻️ Conversion de l'automatisation ${survivor.id} (break_time) vers break-reminder`);
      try {
        await automationService.updateAutomation({
          id: survivor.id,
          name: 'break-reminder',
          description: survivor.description || 'Rappel de pause personnalisée'
        });
        survivor.name = 'break-reminder';
      } catch (error) {
        console.warn('⚠️ Impossible de renommer break_time en break-reminder:', error);
      }

      for (const automation of duplicates) {
        try {
          await automationService.deleteAutomation(automation.id);
          console.log('✅ Doublon break_time supprimé:', automation.id);
        } catch (error) {
          console.warn('⚠️ Impossible de supprimer le doublon break_time', automation.id, error);
        }
      }

      workingList = workingList
        .filter(auto => !duplicates.some(dup => dup.id === auto.id))
        .map(auto => (auto.id === survivor.id ? { ...auto, name: 'break-reminder' } : auto));
    }

    return workingList;
  };

  const normalizeBreakSettings = (config: any): AutomationSettings => {
    const normalized: AutomationSettings = {};

    if (!config || typeof config !== 'object') {
      return normalized;
    }

    if (typeof config.breakDuration === 'number') {
      normalized.breakDuration = config.breakDuration;
    } else if (typeof config.minimum_duration_minutes === 'number') {
      normalized.breakDuration = config.minimum_duration_minutes;
    } else if (typeof config.duration_minutes === 'number') {
      normalized.breakDuration = config.duration_minutes;
    } else if (Array.isArray(config.conditions)) {
      const durationCondition = config.conditions.find(
        (condition: any) => condition?.field === 'duration_minutes' && typeof condition?.value === 'number'
      );
      if (durationCondition) {
        normalized.breakDuration = durationCondition.value;
      }
    }

    if (typeof config.breakDelayMinutes === 'number') {
      normalized.breakDelayMinutes = config.breakDelayMinutes;
    } else if (typeof config.delay_minutes === 'number') {
      normalized.breakDelayMinutes = config.delay_minutes;
    }

    return normalized;
  };

  // ✅ Fonctions helper déplacées ici pour être accessibles dans loadAutomations
  const updateTriggerText = (automation: SimpleAutomation, settings: AutomationSettings): string => {
    switch (automation.id) {
      case 'daily-review':
        return `Tous les jours à ${settings.hour || '09:00'}`;
      case 'vocab-milestone':
        return `Atteindre ${settings.milestone || 50} mots`;
      case 'forgotten-notes':
        return `Note non vue depuis ${settings.delayDays || 7} jours`;
      case 'study-reminder':
        return `Tous les jours à ${settings.studyHour || '18:00'}`;
      case 'break-reminder':
        const duration = settings.breakDuration || 120;
        const delay = settings.breakDelayMinutes || 30;
        return `Session ≥ ${duration} min → rappel après ${delay} min`;
      case 'weekly-summary':
        return `Tous les ${settings.emailDay || 'vendredis'} à ${settings.emailHour || '17:00'}`;
      case 'monthly-report':
        return `Le 1er de chaque mois à ${settings.emailHour || '09:00'}`;
      case 'daily-backup':
        return `Tous les jours à ${settings.backupHour || '02:00'}`;
      case 'daily_quote':
        return `Tous les jours à ${settings.quoteTime || '08:00'}`;
      default:
        return automation.trigger;
    }
  };

  const updateDescriptionText = (automation: SimpleAutomation, settings: AutomationSettings): string => {
    switch (automation.id) {
      case 'daily-review':
        return `Rappel tous les jours à ${settings.hour || '09:00'} pour réviser vos notes`;
      case 'vocab-milestone':
        return `Célébrer quand vous atteignez ${settings.milestone || 50} mots`;
      case 'forgotten-notes':
        return `Rappel pour les notes non consultées depuis ${settings.delayDays || 7} jours`;
      case 'study-reminder':
        return `Rappel quotidien à ${settings.studyHour || '18:00'} pour votre session d'étude`;
      case 'break-reminder':
        const duration = settings.breakDuration || 120;
        const delay = settings.breakDelayMinutes || 30;
        return `Email + notification ${delay} min après une session ≥ ${duration} min`;
      case 'daily-backup':
        return `Sauvegarde automatique de toutes vos notes à ${settings.backupHour || '02:00'}`;
      case 'daily_quote':
        return `Citation aléatoire par email chaque matin à ${settings.quoteTime || '08:00'}`;
      default:
        return automation.description;
    }
  };

  // Helper pour obtenir le fuseau horaire de l'utilisateur (navigateur)
  const getUserTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('⚠️ Impossible de détecter le fuseau horaire, utilisation de UTC par défaut');
      return 'UTC';
    }
  };

  // Helper pour formater next_execution_at en heure locale pour les logs
  const formatNextExecutionForLog = (isoString: string | null): string => {
    if (!isoString) return 'null';
    try {
      const date = new Date(isoString);
      const userTimezone = getUserTimezone();
      
      // Vérifier que la date est valide
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Date invalide:', isoString);
        return isoString;
      }
      
      const formatted = date.toLocaleString('fr-FR', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      return formatted;
    } catch (error) {
      console.warn('⚠️ Erreur lors du formatage de la date:', error);
      return isoString; // Fallback si erreur de parsing
    }
  };

  // Charger les automatisations depuis la DB au montage
  useEffect(() => {
    // Afficher le fuseau horaire détecté pour vérification
    const detectedTimezone = getUserTimezone();
    console.log('🌍 Fuseau horaire détecté pour l\'affichage des logs:', detectedTimezone);
    
    loadAutomations();
  }, [user?.id]);

  const loadAutomations = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Chargement des automatisations pour user:', user.id);

      // Charger les automatisations depuis la DB
      let dbAutomations = await automationService.getAutomations(user.id);
      console.log('📊 Automatisations chargées:', dbAutomations.length);

      dbAutomations = await cleanDuplicatePauseAutomations(dbAutomations);

      // Mapper les automatisations DB avec les templates locaux
      const mappedAutomations = AUTOMATION_TEMPLATES.map(template => {
        let dbAuto = dbAutomations.find(db => db.name === template.id);

        if (dbAuto) {
          // L'automatisation existe en DB, utiliser ses valeurs
          let dbSettings = (dbAuto.trigger_config as AutomationSettings) || template.settings;

          if (template.id === 'break-reminder') {
            dbSettings = {
              ...template.settings,
              ...normalizeBreakSettings(dbAuto.trigger_config),
              ...dbSettings
            };
          }

          return {
            ...template,
            dbId: dbAuto.id,
            isActive: dbAuto.is_active,
            settings: dbSettings,
            // ✅ Mettre à jour trigger et description avec les valeurs DB
            trigger: updateTriggerText(template, dbSettings),
            description: updateDescriptionText(template, dbSettings)
          };
        }

        // L'automatisation n'existe pas encore en DB
        return template;
      });

      setAutomations(mappedAutomations);
      console.log('✅ Automatisations chargées et mappées');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des automatisations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (id: string) => {
    const automation = automations.find(a => a.id === id);
    if (!automation || !user?.id) return;

    const newActiveState = !automation.isActive;

    // Calculer next_execution_at si on active l'automatisation
    const userTimezone = getUserTimezone();
    const nextExecutionAt = newActiveState
      ? calculateNextExecution(automation.id, automation.settings || {}, userTimezone)
      : null;

    // Calculer schedule_config
    const scheduleConfig = triggerConfigToScheduleConfig(automation.id, automation.settings || {});

    console.log(`🔄 Toggle automation ${id} to ${newActiveState}, next_execution_at:`, nextExecutionAt ? formatNextExecutionForLog(nextExecutionAt) : 'null', `(UTC: ${nextExecutionAt || 'null'})`);

    // Mise à jour optimiste de l'UI
    setAutomations(prev => prev.map(auto =>
      auto.id === id ? { ...auto, isActive: newActiveState } : auto
    ));

    try {
      if (automation.dbId) {
        // L'automatisation existe déjà en DB, la mettre à jour
        console.log('🔄 Mise à jour de l\'automatisation:', automation.dbId);
        await automationService.updateAutomation({
          id: automation.dbId,
          is_active: newActiveState,
          next_execution_at: nextExecutionAt,
          schedule_config: scheduleConfig
        });
        console.log('✅ Automatisation mise à jour avec next_execution_at:', nextExecutionAt ? formatNextExecutionForLog(nextExecutionAt) : 'null', `(UTC: ${nextExecutionAt || 'null'})`);
      } else {
        // Créer l'automatisation en DB
        console.log('🔄 Création de l\'automatisation:', id);
        const created = await automationService.createAutomation(user.id, {
          name: id,
          description: automation.description,
          category: automation.category,
          trigger: {
            type: 'schedule',
            config: automation.settings || {}
          },
          action: {
            type: 'notification',
            config: { message: automation.action }
          },
          conditions: [],
          schedule: scheduleConfig,
          settings: {
            is_active: newActiveState,
            priority: 5,
            next_execution_at: nextExecutionAt
          }
        });

        // Mettre à jour l'ID DB dans le state local
        setAutomations(prev => prev.map(auto =>
          auto.id === id ? { ...auto, dbId: created.id } : auto
        ));
        console.log('✅ Automatisation créée avec next_execution_at:', created.id, nextExecutionAt ? formatNextExecutionForLog(nextExecutionAt) : 'null', `(UTC: ${nextExecutionAt || 'null'})`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      // Rollback en cas d'erreur
      setAutomations(prev => prev.map(auto =>
        auto.id === id ? { ...auto, isActive: !newActiveState } : auto
      ));
    }
  };

  const openSettings = (automation: SimpleAutomation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAutomation(automation);
    setTempSettings(automation.settings || {});
    setSettingsModalOpen(true);
  };

  const saveSettings = async () => {
    if (!selectedAutomation || !user?.id) return;

    // ✅ NOUVELLE LOGIQUE SIMPLIFIÉE : Extraire l'heure locale depuis les settings
    const userTimezone = getUserTimezone();
    
    // Extraire l'heure locale selon le type d'automatisation
    let userLocalTime: string | undefined;
    if (selectedAutomation.id === 'daily-review' && tempSettings.hour) {
      userLocalTime = tempSettings.hour;
    } else if (selectedAutomation.id === 'study-reminder' && tempSettings.studyHour) {
      userLocalTime = tempSettings.studyHour;
    } else if (selectedAutomation.id === 'daily-backup' && tempSettings.backupHour) {
      userLocalTime = tempSettings.backupHour;
    } else if (selectedAutomation.id === 'daily_quote' && tempSettings.quoteTime) {
      userLocalTime = tempSettings.quoteTime;
    }

    // Calculer next_execution_at basé sur les nouveaux paramètres (pour compatibilité)
    const nextExecutionAt = userLocalTime 
      ? calculateNextExecution(selectedAutomation.id, tempSettings, userTimezone)
      : null;
    
    console.log(`🕐 Next execution calculé pour ${selectedAutomation.id}:`, nextExecutionAt ? formatNextExecutionForLog(nextExecutionAt) : 'null', `(UTC: ${nextExecutionAt || 'null'})`);
    if (userLocalTime) {
      console.log(`⏰ Heure locale stockée: ${userLocalTime} (timezone: ${userTimezone})`);
    }

    // Calculer schedule_config pour compatibilité
    const scheduleConfig = triggerConfigToScheduleConfig(selectedAutomation.id, tempSettings);

    // Mise à jour optimiste de l'UI
    setAutomations(prev => prev.map(auto =>
      auto.id === selectedAutomation.id
        ? {
            ...auto,
            settings: tempSettings,
            trigger: updateTriggerText(auto, tempSettings),
            description: updateDescriptionText(auto, tempSettings)
          }
        : auto
    ));
    setSettingsModalOpen(false);

    try {
      if (selectedAutomation.dbId) {
        // Mettre à jour les paramètres en DB avec user_local_time et user_timezone
        console.log('🔄 Sauvegarde des paramètres:', selectedAutomation.dbId);
        await automationService.updateAutomation({
          id: selectedAutomation.dbId,
          trigger_config: tempSettings,
          schedule_config: scheduleConfig,
          next_execution_at: nextExecutionAt,
          user_local_time: userLocalTime, // ✅ Stocker l'heure locale
          user_timezone: userTimezone     // ✅ Stocker le fuseau horaire
        });
        console.log('✅ Paramètres sauvegardés avec next_execution_at:', nextExecutionAt ? formatNextExecutionForLog(nextExecutionAt) : 'null', `(UTC: ${nextExecutionAt || 'null'})`);
      } else {
        // Créer l'automatisation avec les nouveaux paramètres
        console.log('🔄 Création de l\'automatisation avec paramètres:', selectedAutomation.id);
        const created = await automationService.createAutomation(user.id, {
          name: selectedAutomation.id,
          description: selectedAutomation.description,
          category: selectedAutomation.category,
          trigger: {
            type: 'schedule',
            config: tempSettings
          },
          action: {
            type: 'notification',
            config: { message: selectedAutomation.action }
          },
          conditions: [],
          schedule: scheduleConfig,
          settings: {
            is_active: selectedAutomation.isActive,
            priority: 5,
            next_execution_at: nextExecutionAt
          }
        });

        // Mettre à jour l'ID DB
        setAutomations(prev => prev.map(auto =>
          auto.id === selectedAutomation.id ? { ...auto, dbId: created.id } : auto
        ));
        console.log('✅ Automatisation créée avec paramètres et next_execution_at:', created.id, nextExecutionAt ? formatNextExecutionForLog(nextExecutionAt) : 'null', `(UTC: ${nextExecutionAt || 'null'})`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  // Tester l'automatisation rapidement (envoie une vraie notification)
  const testAutomationNow = async (e: React.MouseEvent, automationId: string) => {
    e.stopPropagation(); // Empêcher le toggle de l'automatisation

    if (automationId === 'focus_mode') {
      success(
        'Mode Focus',
        'Mode focus activé – notifications silencieuses',
        4000
      );
    }
    // Ajouter d'autres automatisations ici si besoin
  };

  const filteredAutomations = selectedCategory === 'all' 
    ? automations 
    : automations.filter(auto => auto.category === selectedCategory);

  const activeCount = automations.filter(auto => auto.isActive).length;

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      'clock': Clock,
      'trophy': Trophy,
      'book-open': BookOpen,
      'bell': Bell,
      'mail': Mail,
      'calendar': Calendar,
      'save': Save,
      'star': Star
    };
    return icons[iconName] || Clock;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Chargement des automatisations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header simplifié */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            🤖 Automatisations Centrinote
          </motion.h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <strong>{activeCount}</strong> automatisation{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
          </p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Cliquez sur une carte pour l'activer instantanément
          </p>

          {/* Bouton Mode Bac à Sable */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSandboxOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PlayCircle className="w-5 h-5" />
            🧪 Mode Bac à Sable
          </motion.button>
          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Testez vos automatisations sans toucher aux données réelles
          </p>
        </div>

        {/* Filtres par catégorie - Style boutons pilules */}
        <div className="flex justify-center mb-8">
          <div className={`inline-flex p-1 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Toutes
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === key
                    ? `bg-${config.color}-500 text-white shadow-sm`
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {config.title}
              </button>
            ))}
          </div>
        </div>

        {/* Cartes d'automatisation - Style IFTTT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAutomations.map((automation, index) => {
            const IconComponent = getIconComponent(automation.icon);
            const isActive = automation.isActive;
            
            return (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative group cursor-pointer ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 ${
                  isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => toggleAutomation(automation.id)}
              >
                {/* Menu trois points - Paramètres */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => openSettings(automation, e)}
                  className={`absolute bottom-4 right-4 p-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } transition-all duration-200 shadow-sm hover:shadow-md z-10`}
                  title="Personnaliser les paramètres"
                >
                  <MoreVertical className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                </motion.button>

                {/* Badge d'état */}
                <div className={`absolute top-4 right-4 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{isActive ? 'Actif' : 'Inactif'}</span>
                </div>

                {/* Icône principale */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-${automation.color}-500 to-${automation.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Contenu principal */}
                <div className="space-y-3">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {automation.title}
                  </h3>
                  
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {automation.description}
                  </p>

                  {/* Logique IFTTT "Quand -> Faire" */}
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} space-y-2`}>
                    <div className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wide`}>
                      Quand
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {automation.trigger}
                    </div>
                    
                    <div className="flex items-center justify-center py-1">
                      <div className={`h-px flex-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                      <span className={`px-2 text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ALORS
                      </span>
                      <div className={`h-px flex-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    </div>
                    
                    <div className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wide`}>
                      Faire
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {automation.action}
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className={`pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className={`text-center text-sm font-medium ${
                      isActive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {isActive ? '✓ Automatisation activée' : 'Cliquer pour activer'}
                    </div>

                    {/* Bouton de test rapide pour Mode Focus */}
                    {automation.id === 'focus_mode' && isActive && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => testAutomationNow(e, automation.id)}
                        className={`mt-3 w-full py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                          darkMode
                            ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                        } shadow-md hover:shadow-lg`}
                      >
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">Tester maintenant</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Message d'encouragement */}
        {activeCount === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-12 text-center p-8 rounded-2xl ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'
            } border`}
          >
            <div className="text-4xl mb-4">🚀</div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Prêt à automatiser votre apprentissage ?
            </h3>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Activez vos première automatisations en cliquant sur les cartes ci-dessus.
              <br />
              Elles fonctionneront en arrière-plan pour vous aider à progresser !
            </p>
          </motion.div>
        )}

        {/* Footer informatif simple */}
        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-8 text-center p-4 rounded-lg ${
              darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <p className="text-sm">
              🤖 Vos automatisations sont maintenant actives et fonctionnent en arrière-plan.
              <br />
              Vous recevrez des notifications quand elles s'exécutent !
            </p>
          </motion.div>
        )}
      </div>

      {/* Modal de personnalisation */}
      <AutomationSettingsModal
        isOpen={settingsModalOpen}
        darkMode={darkMode}
        automation={selectedAutomation}
        settings={tempSettings}
        onSettingsChange={setTempSettings}
        onSave={saveSettings}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Modal de Bac à Sable */}
      {sandboxOpen && (
        <AutomationSandboxV2 onClose={() => setSandboxOpen(false)} />
      )}

      {/* Toast Container pour les notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}