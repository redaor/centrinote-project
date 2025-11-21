import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Bell,
  Calendar,
  BookOpen,
  Trash2,
  Loader2,
  Eye,
  Info,
  Zap
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';

interface SandboxResult {
  success: boolean;
  automation: {
    id: string;
    name: string;
    trigger: string;
    action: string;
  };
  simulation: {
    triggerSimulated: string;
    actionSimulated: string;
    wouldSendEmail?: {
      to: string;
      subject: string;
      body: string;
    };
    wouldSendNotification?: {
      title: string;
      message: string;
      priority: string;
    };
    wouldScheduleSession?: {
      type: string;
      duration: number;
    };
  };
  issues?: string[];
  summary: string;
}

interface AutomationSandboxProps {
  onClose: () => void;
}

export function AutomationSandbox({ onClose }: AutomationSandboxProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { toasts, success, info, warning } = useToast();

  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [isTestingReal, setIsTestingReal] = useState(false);

  // Liste des automatisations disponibles pour le test
  const availableAutomations = [
    {
      id: 'focus_mode',
      name: 'Mode Focus',
      category: 'productivity',
      trigger: 'Démarrage de session',
      action: 'Notification',
      icon: '🎯'
    },
    {
      id: 'break_time',
      name: 'Pause Active',
      category: 'wellbeing',
      trigger: 'Session ≥ 45 min',
      action: 'Email + Notification',
      icon: '☕'
    },
    {
      id: 'daily_quote',
      name: 'Citation Motivation',
      category: 'inspiration',
      trigger: 'Quotidien 08:00',
      action: 'Email',
      icon: '💭'
    },
    {
      id: 'note_backup_reminder',
      name: 'Note Backup Reminder',
      category: 'productivity',
      trigger: 'Dimanche 10:00',
      action: 'Notification',
      icon: '📦'
    },
    {
      id: 'vocabulary_review',
      name: 'Vocabulary Review',
      category: 'learning',
      trigger: '10 mots ajoutés',
      action: 'Session planifiée',
      icon: '📚'
    },
    {
      id: 'study_session_completion',
      name: 'Study Session Completion',
      category: 'motivation',
      trigger: 'Fin de session',
      action: 'Email félicitations',
      icon: '🏆'
    },
    {
      id: 'important_note_alert',
      name: 'Important Note Alert',
      category: 'alerts',
      trigger: 'Mots-clés urgents',
      action: 'Notification prioritaire',
      icon: '⚠️',
      premium: true
    },
    {
      id: 'weekly_progress_report',
      name: 'Weekly Progress Report',
      category: 'analytics',
      trigger: 'Vendredi 17:00',
      action: 'Email rapport',
      icon: '📊',
      premium: true
    }
  ];

  // Tester l'automatisation EN RÉEL (envoie vraiment une notification)
  const runRealTest = async (automationId: string) => {
    setIsTestingReal(true);

    // Délai pour effet visuel
    await new Promise(resolve => setTimeout(resolve, 800));

    const automation = availableAutomations.find(a => a.id === automationId);
    if (!automation) {
      setIsTestingReal(false);
      return;
    }

    // Envoyer une vraie notification selon l'automatisation
    switch (automationId) {
      case 'focus_mode':
        success(
          'Mode Focus',
          'Mode focus activé – notifications silencieuses',
          4000
        );
        break;
      case 'break_time':
        info(
          'Pause Active',
          'Bravo ! Session terminée. Rappel dans 15 min.',
          4000
        );
        break;
      case 'daily_quote':
        info(
          'Citation du jour',
          '« Le succès est la somme de petits efforts répétés jour après jour. » - Robert Collier',
          6000
        );
        break;
      case 'note_backup_reminder':
        info(
          'Backup Reminder',
          'Don\'t forget to backup your notes!',
          4000
        );
        break;
      case 'vocabulary_review':
        success(
          'Session de révision planifiée',
          '30 minutes de révision vocabulaire programmées',
          4000
        );
        break;
      case 'study_session_completion':
        success(
          'Félicitations !',
          'Great job on completing your session!',
          4000
        );
        break;
      case 'important_note_alert':
        warning(
          'Important Note Created',
          'Mot-clé urgent détecté dans votre nouvelle note',
          5000
        );
        break;
      case 'weekly_progress_report':
        info(
          'Rapport Hebdomadaire',
          'Cette semaine : 5 sessions, 42 mots appris, 3h15 d\'étude. Excellent progrès !',
          6000
        );
        break;
      default:
        info('Test', 'Notification de test envoyée', 3000);
    }

    setIsTestingReal(false);
  };

  // Simuler l'exécution de l'automatisation
  const runSandboxTest = async (automationId: string) => {
    setIsRunning(true);
    setResult(null);

    // Simulation avec délai pour effet visuel
    await new Promise(resolve => setTimeout(resolve, 1500));

    const automation = availableAutomations.find(a => a.id === automationId);
    if (!automation) {
      setIsRunning(false);
      return;
    }

    let simulationResult: SandboxResult;

    // Simuler chaque automatisation
    switch (automationId) {
      case 'focus_mode':
        simulationResult = {
          success: true,
          automation: {
            id: automation.id,
            name: automation.name,
            trigger: 'Session démarrée (simulée)',
            action: 'Notification envoyée'
          },
          simulation: {
            triggerSimulated: '✅ Session d\'étude démarrée à ' + new Date().toLocaleTimeString('fr-FR'),
            actionSimulated: '📬 Notification envoyée',
            wouldSendNotification: {
              title: 'Mode Focus',
              message: 'Mode focus activé – notifications silencieuses',
              priority: 'low'
            }
          },
          summary: '✅ Cette automatisation fonctionnerait parfaitement. Notification envoyée au démarrage de session.'
        };
        break;

      case 'break_time':
        simulationResult = {
          success: true,
          automation: {
            id: automation.id,
            name: automation.name,
            trigger: 'Session de 50 minutes terminée (simulée)',
            action: 'Email + Notification avec délai de 15 min'
          },
          simulation: {
            triggerSimulated: '✅ Session terminée : durée 50 minutes (> seuil de 45 min)',
            actionSimulated: '📧 Email + 📬 Notification programmés dans 15 minutes',
            wouldSendEmail: {
              to: user?.email || 'user@example.com',
              subject: 'Pause Active - Centrinote',
              body: 'Bravo pour cette session ! Prenez une pause bien méritée.'
            },
            wouldSendNotification: {
              title: 'Pause Active',
              message: 'Bravo ! Session terminée. Rappel dans 15 min.',
              priority: 'normal'
            }
          },
          summary: '✅ Cette automatisation fonctionnerait. Email et notification seraient envoyés 15 min après la session.'
        };
        break;

      case 'daily_quote':
        simulationResult = {
          success: true,
          automation: {
            id: automation.id,
            name: automation.name,
            trigger: 'Quotidien à 08:00 (simulé)',
            action: 'Email avec citation aléatoire'
          },
          simulation: {
            triggerSimulated: '✅ Déclenchement quotidien à 08:00 (Europe/Paris)',
            actionSimulated: '📧 Email envoyé avec citation aléatoire',
            wouldSendEmail: {
              to: user?.email || 'user@example.com',
              subject: 'Citation du jour - Centrinote',
              body: '« Le succès est la somme de petits efforts répétés jour après jour. » - Robert Collier'
            }
          },
          summary: '✅ Cette automatisation fonctionnerait. Email quotidien envoyé à 08:00 avec une citation motivante.'
        };
        break;

      case 'note_backup_reminder':
        simulationResult = {
          success: true,
          automation: {
            id: automation.id,
            name: automation.name,
            trigger: 'Dimanche à 10:00 (simulé)',
            action: 'Notification de rappel'
          },
          simulation: {
            triggerSimulated: '✅ Déclenchement hebdomadaire : Dimanche 10:00',
            actionSimulated: '📬 Notification de rappel envoyée',
            wouldSendNotification: {
              title: 'Backup Reminder',
              message: 'Don\'t forget to backup your notes!',
              priority: 'normal'
            }
          },
          summary: '✅ Cette automatisation fonctionnerait. Notification de rappel chaque dimanche matin.'
        };
        break;

      case 'vocabulary_review':
        simulationResult = {
          success: true,
          automation: {
            id: automation.id,
            name: automation.name,
            trigger: '10 mots ajoutés (simulés)',
            action: 'Session de révision planifiée'
          },
          simulation: {
            triggerSimulated: '✅ 10 nouveaux mots détectés : "algorithm", "paradigm", "synthesis", "hypothesis", "empirical", "methodology", "correlation", "variable", "analysis", "inference"',
            actionSimulated: '📅 Session de révision planifiée',
            wouldScheduleSession: {
              type: 'vocabulary',
              duration: 30
            }
          },
          summary: '✅ Cette automatisation fonctionnerait. Session de 30 min planifiée après ajout de 10 mots.'
        };
        break;

      case 'study_session_completion':
        simulationResult = {
          success: true,
          automation: {
            id: automation.id,
            name: automation.name,
            trigger: 'Session vocabulaire terminée (simulée)',
            action: 'Email de félicitations'
          },
          simulation: {
            triggerSimulated: '✅ Session vocabulaire terminée : 25 minutes, 15 mots révisés',
            actionSimulated: '📧 Email de félicitations envoyé',
            wouldSendEmail: {
              to: user?.email || 'user@example.com',
              subject: 'Great job on completing your session!',
              body: 'Congratulations! You completed your vocabulary session. Keep up the great work!'
            }
          },
          summary: '✅ Cette automatisation fonctionnerait. Email de félicitations envoyé après chaque session.'
        };
        break;

      case 'important_note_alert':
        // Vérifier si l'utilisateur a accès Premium
        const hasPremium = false; // TODO: Vérifier le statut premium de l'utilisateur

        if (!hasPremium) {
          simulationResult = {
            success: false,
            automation: {
              id: automation.id,
              name: automation.name,
              trigger: 'Note avec mot-clé "urgent" créée',
              action: 'Notification prioritaire'
            },
            simulation: {
              triggerSimulated: '❌ Fonctionnalité Premium requise',
              actionSimulated: '❌ Non disponible'
            },
            issues: [
              'Cette automatisation nécessite un abonnement Premium',
              'Passez à Premium pour activer les alertes intelligentes'
            ],
            summary: '⚠️ Cette automatisation échouerait car elle nécessite un abonnement Premium.'
          };
        } else {
          simulationResult = {
            success: true,
            automation: {
              id: automation.id,
              name: automation.name,
              trigger: 'Note avec mot-clé "urgent" créée (simulée)',
              action: 'Notification haute priorité'
            },
            simulation: {
              triggerSimulated: '✅ Note créée contenant "urgent" : "Réunion urgente demain 10h"',
              actionSimulated: '📬 Notification HAUTE PRIORITÉ envoyée',
              wouldSendNotification: {
                title: 'Important Note Created',
                message: 'Mot-clé urgent détecté dans votre nouvelle note',
                priority: 'high'
              }
            },
            summary: '✅ Cette automatisation fonctionnerait. Notification prioritaire sur détection de mots-clés.'
          };
        }
        break;

      case 'weekly_progress_report':
        const hasPremiumReport = false; // TODO: Vérifier le statut premium

        if (!hasPremiumReport) {
          simulationResult = {
            success: false,
            automation: {
              id: automation.id,
              name: automation.name,
              trigger: 'Vendredi 17:00',
              action: 'Email rapport hebdomadaire'
            },
            simulation: {
              triggerSimulated: '❌ Fonctionnalité Premium requise',
              actionSimulated: '❌ Non disponible'
            },
            issues: [
              'Cette automatisation nécessite un abonnement Premium',
              'Passez à Premium pour recevoir des rapports analytiques détaillés'
            ],
            summary: '⚠️ Cette automatisation échouerait car elle nécessite un abonnement Premium.'
          };
        } else {
          simulationResult = {
            success: true,
            automation: {
              id: automation.id,
              name: automation.name,
              trigger: 'Vendredi 17:00 (simulé)',
              action: 'Email avec rapport détaillé'
            },
            simulation: {
              triggerSimulated: '✅ Vendredi 17:00 : génération du rapport hebdomadaire',
              actionSimulated: '📧 Email rapport envoyé',
              wouldSendEmail: {
                to: user?.email || 'user@example.com',
                subject: 'Votre Rapport Hebdomadaire - Centrinote',
                body: 'Cette semaine : 5 sessions, 42 mots appris, 3h15 d\'étude. Excellent progrès !'
              }
            },
            summary: '✅ Cette automatisation fonctionnerait. Rapport hebdomadaire détaillé chaque vendredi.'
          };
        }
        break;

      default:
        simulationResult = {
          success: false,
          automation: {
            id: automationId,
            name: 'Inconnu',
            trigger: 'N/A',
            action: 'N/A'
          },
          simulation: {
            triggerSimulated: '❌ Automatisation non reconnue',
            actionSimulated: '❌ Test impossible'
          },
          issues: ['Automatisation non trouvée dans le catalogue'],
          summary: '❌ Cette automatisation n\'existe pas.'
        };
    }

    setResult(simulationResult);
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-4xl w-full my-8 rounded-2xl shadow-2xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <PlayCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🧪 Mode Bac à Sable
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Testez vos automatisations sans impact réel
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Trash2 className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Info banner */}
          <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
            darkMode ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-blue-50 border border-blue-200'
          }`}>
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Mode simulation activé
              </p>
              <p className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Aucun email ne sera envoyé, aucune donnée ne sera modifiée. Tout est simulé.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Liste des automatisations */}
          {!selectedAutomation && !result && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Choisissez une automatisation à tester
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAutomations.map((auto) => (
                  <motion.button
                    key={auto.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedAutomation(auto.id);
                      runSandboxTest(auto.id);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 hover:border-blue-500'
                        : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{auto.icon}</span>
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {auto.name}
                          {auto.premium && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">
                              PRO
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${
                            darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {auto.trigger}
                          </span>
                          <span>→</span>
                          <span className={`px-2 py-1 rounded ${
                            darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {auto.action}
                          </span>
                        </div>
                      </div>
                      <Eye className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Simulation en cours */}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Simulation en cours...
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Analyse du déclencheur et de l'action
              </p>
            </motion.div>
          )}

          {/* Résultats */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Résumé visuel */}
                <div className={`p-6 rounded-xl border-2 ${
                  result.success
                    ? darkMode
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-green-50 border-green-500'
                    : darkMode
                      ? 'bg-red-900/30 border-red-500'
                      : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-start gap-4">
                    {result.success ? (
                      <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold mb-2 ${
                        result.success
                          ? darkMode ? 'text-green-300' : 'text-green-700'
                          : darkMode ? 'text-red-300' : 'text-red-700'
                      }`}>
                        {result.success ? 'Test réussi !' : 'Test échoué'}
                      </h3>
                      <p className={`text-lg ${
                        result.success
                          ? darkMode ? 'text-green-200' : 'text-green-800'
                          : darkMode ? 'text-red-200' : 'text-red-800'
                      }`}>
                        {result.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Détails de la simulation */}
                <div className={`p-6 rounded-xl ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    📋 Détails de la simulation
                  </h4>

                  <div className="space-y-4">
                    {/* Déclencheur */}
                    <div>
                      <p className={`text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Déclencheur :
                      </p>
                      <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {result.simulation.triggerSimulated}
                      </p>
                    </div>

                    {/* Action */}
                    <div>
                      <p className={`text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Action :
                      </p>
                      <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {result.simulation.actionSimulated}
                      </p>
                    </div>

                    {/* Email simulé */}
                    {result.simulation.wouldSendEmail && (
                      <div className={`p-4 rounded-lg ${
                        darkMode ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="w-5 h-5 text-blue-500" />
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Email qui serait envoyé
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>À : </span>
                            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                              {result.simulation.wouldSendEmail.to}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Sujet : </span>
                            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                              {result.simulation.wouldSendEmail.subject}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Corps : </span>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                              {result.simulation.wouldSendEmail.body}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notification simulée */}
                    {result.simulation.wouldSendNotification && (
                      <div className={`p-4 rounded-lg ${
                        darkMode ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Bell className="w-5 h-5 text-purple-500" />
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Notification qui serait envoyée
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Titre : </span>
                            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                              {result.simulation.wouldSendNotification.title}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Message : </span>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                              {result.simulation.wouldSendNotification.message}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Priorité : </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.simulation.wouldSendNotification.priority === 'high'
                                ? 'bg-red-500 text-white'
                                : result.simulation.wouldSendNotification.priority === 'normal'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-500 text-white'
                            }`}>
                              {result.simulation.wouldSendNotification.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Session simulée */}
                    {result.simulation.wouldScheduleSession && (
                      <div className={`p-4 rounded-lg ${
                        darkMode ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-5 h-5 text-green-500" />
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Session qui serait planifiée
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Type : </span>
                            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                              {result.simulation.wouldScheduleSession.type}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Durée : </span>
                            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                              {result.simulation.wouldScheduleSession.duration} minutes
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Problèmes détectés */}
                {result.issues && result.issues.length > 0 && (
                  <div className={`p-4 rounded-lg ${
                    darkMode ? 'bg-yellow-900/30 border-2 border-yellow-500' : 'bg-yellow-50 border-2 border-yellow-500'
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`font-medium mb-2 ${
                          darkMode ? 'text-yellow-300' : 'text-yellow-700'
                        }`}>
                          Problèmes détectés :
                        </p>
                        <ul className="space-y-1">
                          {result.issues.map((issue, idx) => (
                            <li key={idx} className={`text-sm ${
                              darkMode ? 'text-yellow-200' : 'text-yellow-800'
                            }`}>
                              • {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton TEST EN RÉEL (uniquement pour les automatisations qui ont des notifications) */}
                {result.success && result.simulation.wouldSendNotification && selectedAutomation && (
                  <div className={`p-4 rounded-xl border-2 ${
                    darkMode ? 'bg-orange-900/20 border-orange-500' : 'bg-orange-50 border-orange-500'
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className={`font-semibold mb-1 ${
                          darkMode ? 'text-orange-300' : 'text-orange-700'
                        }`}>
                          Envie de voir une vraie notification ?
                        </p>
                        <p className={`text-sm ${
                          darkMode ? 'text-orange-400' : 'text-orange-600'
                        }`}>
                          Cliquez ci-dessous pour recevoir une VRAIE notification de test dans votre navigateur (ne touche toujours pas aux données).
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => runRealTest(selectedAutomation)}
                      disabled={isTestingReal}
                      className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                        isTestingReal
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isTestingReal ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          ⚡ TEST EN RÉEL
                        </>
                      )}
                    </motion.button>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setResult(null);
                      setSelectedAutomation(null);
                    }}
                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                  >
                    Tester une autre automatisation
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                      darkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Fermer
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Toast Container pour les notifications réelles */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
