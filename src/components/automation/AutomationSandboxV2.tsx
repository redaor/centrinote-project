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
  Trash2,
  Loader2,
  Info,
  Send
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import { supabase } from '../../lib/supabase';

interface RealActionStatus {
  email: 'idle' | 'loading' | 'success' | 'error';
  notification: 'idle' | 'loading' | 'success' | 'error';
  session: 'idle' | 'loading' | 'success' | 'error';
  emailMessage?: string;
  notificationMessage?: string;
  sessionMessage?: string;
}

interface AutomationSandboxV2Props {
  onClose: () => void;
}

export function AutomationSandboxV2({ onClose }: AutomationSandboxV2Props) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { toasts, success, error: showError, info } = useToast();

  const [actionStatuses, setActionStatuses] = useState<Record<string, RealActionStatus>>({});

  // Utiliser l'email de l'utilisateur connecté
  const userEmail = user?.email || 'utilisateur@centrinote.fr';

  // Helper pour échapper le HTML
  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // Liste des automatisations avec leurs capacités
  const automations = [
    {
      id: 'focus_mode',
      name: '🎯 Mode Focus',
      trigger: 'Session d\'étude démarrée',
      canSendEmail: false,
      canSendNotification: true,
      canCreateSession: false,
      emailData: null,
      notificationData: {
        title: 'Mode Focus',
        body: 'Mode focus activé – notifications silencieuses'
      },
      sessionData: null,
      summary: '✅ Notification in-app (type: info, priorité: basse)'
    },
    {
      id: 'break_time',
      name: '☕ Pause Active',
      trigger: 'Session ≥ 45 min terminée',
      canSendEmail: true,
      canSendNotification: true,
      canCreateSession: false,
      emailData: {
        subject: '☕ Pause Active - Centrinote',
        body: 'Bravo pour cette session ! Prenez une pause bien méritée.\n\nRappel dans 15 minutes.'
      },
      notificationData: {
        title: 'Pause Active',
        body: 'Bravo ! Session terminée. Rappel dans 15 min.'
      },
      sessionData: null,
      summary: '✅ Notification in-app (success) + ✅ Email de rappel'
    },
    {
      id: 'daily_quote',
      name: '💭 Citation Motivation',
      trigger: 'Quotidien 08:00',
      canSendEmail: true,
      canSendNotification: false,
      canCreateSession: false,
      emailData: {
        subject: '💭 Citation du jour - Centrinote',
        body: '« Le succès est la somme de petits efforts répétés jour après jour. »\n\n— Robert Collier'
      },
      notificationData: null,
      sessionData: null,
      summary: '✅ Email avec citation aléatoire joliment formatée'
    },
    {
      id: 'note_backup_reminder',
      name: '📦 Backup Reminder',
      trigger: 'Dimanche 10:00',
      canSendEmail: false,
      canSendNotification: true,
      canCreateSession: false,
      emailData: null,
      notificationData: {
        title: 'Backup Reminder',
        body: 'Don\'t forget to backup your notes!'
      },
      sessionData: null,
      summary: '✅ Notification in-app (rappel de sauvegarde)'
    },
    {
      id: 'vocabulary_review',
      name: '📚 Vocabulary Review',
      trigger: '10 mots ajoutés',
      canSendEmail: false,
      canSendNotification: true,
      canCreateSession: true,
      emailData: null,
      notificationData: {
        title: 'Session de révision planifiée',
        body: '30 minutes de révision vocabulaire programmées'
      },
      sessionData: {
        type: 'vocabulary',
        duration: 30,
        title: 'Révision vocabulaire automatique'
      },
      summary: '✅ Notification + ✅ Session de révision (30 min)'
    },
    {
      id: 'study_session_completion',
      name: '🏆 Study Session Done',
      trigger: 'Session terminée',
      canSendEmail: true,
      canSendNotification: false,
      canCreateSession: false,
      emailData: {
        subject: 'Great job on completing your session!',
        body: 'Congratulations! You completed your vocabulary session. Keep up the great work!'
      },
      notificationData: null,
      sessionData: null,
      summary: '✅ Email de félicitations'
    },
    {
      id: 'important_note_alert',
      name: '⚠️ Important Note Alert 👑',
      trigger: 'Mots-clés urgents',
      canSendEmail: false,
      canSendNotification: true,
      canCreateSession: false,
      emailData: null,
      notificationData: {
        title: 'Important Note Created',
        body: 'Mot-clé urgent détecté dans votre nouvelle note'
      },
      sessionData: null,
      summary: '✅ Notification HAUTE PRIORITÉ (rouge + son)',
      premium: true
    },
    {
      id: 'weekly_progress_report',
      name: '📊 Progress Report 👑',
      trigger: 'Vendredi 17:00',
      canSendEmail: true,
      canSendNotification: false,
      canCreateSession: false,
      emailData: {
        subject: 'Votre Rapport Hebdomadaire - Centrinote',
        body: 'Cette semaine : 5 sessions, 42 mots appris, 3h15 d\'étude. Excellent progrès !'
      },
      notificationData: null,
      sessionData: null,
      summary: '✅ Email avec rapport détaillé (stats + graphiques)',
      premium: true
    }
  ];

  // Envoyer un vrai email
  const sendRealEmail = async (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (!automation?.emailData) return;

    setActionStatuses(prev => ({
      ...prev,
      [automationId]: {
        ...(prev[automationId] || { email: 'idle', notification: 'idle', session: 'idle' }),
        email: 'loading'
      }
    }));

    try {
      // Préparer les données email
      let emailSubject = automation.emailData.subject || 'Notification Centrinote';
      let emailBody = automation.emailData.body || '';
      let fullHtml = '';

      // ✅ INJECTION CITATION : Si l'automation est « Citation Motivation » → remplacer par la citation
      if (automationId === 'daily_quote') {
        try {
          const { fetchDailyQuote } = await import('../../lib/quoteService');
          const { quoteEmail, quoteEmailText } = await import('../../emailTemplates/quoteEmail');
          
          console.log('📖 Récupération de la citation du jour...');
          const quote = await fetchDailyQuote('fr', 'motivation');
          
          console.log(`📖 Citation récupérée : « ${quote.quote} » — ${quote.author || 'Anonyme'}`);
          
          // Remplacer le corps par la citation
          emailSubject = '💭 Citation du jour - Centrinote';
          emailBody = quoteEmailText(quote);
          fullHtml = quoteEmail(quote);
        } catch (quoteError) {
          console.error('❌ Erreur lors de la récupération de la citation:', quoteError);
          // Fallback : utiliser le corps par défaut si la citation échoue
          emailBody = automation.emailData.body || 'Citation non disponible pour le moment.';
        }
      }

      // Si fullHtml n'a pas été généré (pas daily_quote), générer le HTML standard
      if (!fullHtml) {
        console.log('📧 Envoi email:', {
          automationId,
          subject: emailSubject,
          bodyLength: emailBody.length,
          bodyPreview: emailBody.substring(0, 100)
        });

        // Échapper le HTML pour éviter les problèmes d'injection
        const safeSubject = escapeHtml(emailSubject);
        const safeBody = escapeHtml(emailBody);

        // Convertir les \n en <br> pour assurer l'affichage
        const htmlBody = safeBody.replace(/\n/g, '<br>');

        // Générer le HTML complet
        fullHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6366f1;">${safeSubject}</h2>
              <div style="margin: 20px 0;">${htmlBody}</div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Centrinote - Test depuis le Bac à Sable</p>
            </div>
          `;
      } else {
        console.log('📧 Email avec citation généré:', {
          automationId,
          subject: emailSubject,
          bodyLength: emailBody.length,
          htmlLength: fullHtml.length
        });
      }

      console.log('📧 HTML généré:', {
        htmlLength: fullHtml.length,
        htmlPreview: fullHtml.substring(0, 300),
        safeBodyLength: safeBody.length,
        htmlBodyLength: htmlBody.length
      });

      // Appeler l'Edge Function automation-email
      const { data, error } = await supabase.functions.invoke('automation-email', {
        body: {
          to: userEmail,
          subject: emailSubject,
          text: emailBody,    // fallback texte brut
          html: fullHtml      // version HTML formatée
        }
      });

      if (error) throw error;

      setActionStatuses(prev => ({
        ...prev,
        [automationId]: {
          ...prev[automationId],
          email: 'success',
          emailMessage: `✅ Email envoyé à ${userEmail}`
        }
      }));

      success('Email envoyé !', `Vérifiez ${userEmail}`, 5000);
    } catch (err: any) {
      console.error('Erreur envoi email:', err);

      // Message spécifique pour Edge Function
      let errorMessage = err.message || 'Erreur inconnue';
      if (err.message?.includes('500') || err.message?.includes('non-2xx')) {
        errorMessage = 'Edge Function non déployée ou config SMTP manquante. Vérifiez Supabase.';
      } else if (err.message?.includes('404')) {
        errorMessage = 'Edge Function automation-email introuvable.';
      }

      setActionStatuses(prev => ({
        ...prev,
        [automationId]: {
          ...prev[automationId],
          email: 'error',
          emailMessage: `❌ ${errorMessage}`
        }
      }));

      showError('Configuration requise', errorMessage, 7000);
    }
  };

  // Envoyer une vraie notification navigateur
  const sendRealNotification = async (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (!automation?.notificationData) return;

    setActionStatuses(prev => ({
      ...prev,
      [automationId]: {
        ...(prev[automationId] || { email: 'idle', notification: 'idle', session: 'idle' }),
        notification: 'loading'
      }
    }));

    try {
      // Demander la permission
      if (!('Notification' in window)) {
        throw new Error('Notifications non supportées par ce navigateur');
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        throw new Error('Permission de notification refusée');
      }

      // Envoyer la notification
      new Notification(automation.notificationData.title, {
        body: automation.notificationData.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `centrinote-${automationId}`,
        requireInteraction: false
      });

      setActionStatuses(prev => ({
        ...prev,
        [automationId]: {
          ...prev[automationId],
          notification: 'success',
          notificationMessage: '✅ Notification envoyée'
        }
      }));

      success('Notification envoyée !', 'Vérifiez vos notifications système', 3000);
    } catch (err: any) {
      console.error('Erreur notification:', err);
      setActionStatuses(prev => ({
        ...prev,
        [automationId]: {
          ...prev[automationId],
          notification: 'error',
          notificationMessage: `❌ Échec : ${err.message}`
        }
      }));

      showError('Erreur', err.message, 5000);
    }
  };

  // Créer une vraie session
  const createRealSession = async (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (!automation?.sessionData || !user?.id) return;

    setActionStatuses(prev => ({
      ...prev,
      [automationId]: {
        ...(prev[automationId] || { email: 'idle', notification: 'idle', session: 'idle' }),
        session: 'loading'
      }
    }));

    try {
      // Insérer la session dans Supabase
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([{
          user_id: user.id,
          session_type: automation.sessionData.type,
          duration_minutes: automation.sessionData.duration,
          title: automation.sessionData.title,
          status: 'scheduled',
          scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Dans 1h
          created_by_automation: true
        }])
        .select()
        .single();

      if (error) throw error;

      setActionStatuses(prev => ({
        ...prev,
        [automationId]: {
          ...prev[automationId],
          session: 'success',
          sessionMessage: `✅ Session créée (ID: ${data.id.substring(0, 8)}...)`
        }
      }));

      success('Session créée !', 'Visible dans votre calendrier', 4000);
    } catch (err: any) {
      console.error('Erreur création session:', err);

      // Message spécifique pour table manquante
      let errorMessage = err.message || 'Erreur inconnue';
      if (err.message?.includes('relation') || err.code === '42P01' || err.message?.includes('404')) {
        errorMessage = 'Table study_sessions non trouvée. Exécutez la migration DB.';
      }

      setActionStatuses(prev => ({
        ...prev,
        [automationId]: {
          ...prev[automationId],
          session: 'error',
          sessionMessage: `❌ ${errorMessage}`
        }
      }));

      showError('Configuration requise', errorMessage, 7000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-6xl w-full my-8 rounded-2xl shadow-2xl ${
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
                  🧪 Mode Bac à Sable V2
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Testez avec de vraies actions (email, notification, session)
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
            darkMode ? 'bg-orange-900/30 border border-orange-500/50' : 'bg-orange-50 border border-orange-200'
          }`}>
            <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className={`font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Actions réelles disponibles
              </p>
              <p className={`${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                Cliquez sur 📩 pour envoyer un vrai email à {userEmail}, 🔔 pour une notification navigateur, 📅 pour créer une session.
              </p>
            </div>
          </div>
        </div>

        {/* Grid des automatisations */}
        <div className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Grille des 8 automatisations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => {
              const status = actionStatuses[auto.id] || {
                email: 'idle',
                notification: 'idle',
                session: 'idle'
              };

              return (
                <motion.div
                  key={auto.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border-2 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className={`font-semibold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {auto.name}
                      </h4>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Trigger: {auto.trigger}
                      </p>
                    </div>
                    {auto.premium && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500 text-white">
                        PRO
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  <div className={`mb-3 p-2 rounded text-xs ${
                    darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-50 text-gray-700'
                  }`}>
                    {auto.summary}
                  </div>

                  {/* Boutons d'action réelle */}
                  <div className="space-y-2">
                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      🧪 Tester pour de vrai :
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Bouton Email */}
                      <button
                        onClick={() => sendRealEmail(auto.id)}
                        disabled={!auto.canSendEmail || status.email === 'loading'}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          !auto.canSendEmail
                            ? darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : status.email === 'success'
                              ? 'bg-green-500/20 border-green-500 text-green-600'
                              : status.email === 'error'
                                ? 'bg-red-500/20 border-red-500 text-red-600'
                                : darkMode
                                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 hover:bg-blue-500/20'
                                  : 'bg-blue-50 border-blue-500 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {status.email === 'loading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : status.email === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : status.email === 'error' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">Email</span>
                        </div>
                        {!auto.canSendEmail && (
                          <span className="text-[10px] opacity-60">OFF</span>
                        )}
                        {auto.canSendEmail && status.email !== 'idle' && (
                          <span className="text-[10px]">
                            {status.email === 'loading' ? '...' : status.email === 'success' ? '✓' : '✗'}
                          </span>
                        )}
                      </button>

                      {/* Bouton Notification */}
                      <button
                        onClick={() => sendRealNotification(auto.id)}
                        disabled={!auto.canSendNotification || status.notification === 'loading'}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          !auto.canSendNotification
                            ? darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : status.notification === 'success'
                              ? 'bg-green-500/20 border-green-500 text-green-600'
                              : status.notification === 'error'
                                ? 'bg-red-500/20 border-red-500 text-red-600'
                                : darkMode
                                  ? 'bg-purple-500/10 border-purple-500 text-purple-400 hover:bg-purple-500/20'
                                  : 'bg-purple-50 border-purple-500 text-purple-600 hover:bg-purple-100'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {status.notification === 'loading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : status.notification === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : status.notification === 'error' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">Notif</span>
                        </div>
                        {!auto.canSendNotification && (
                          <span className="text-[10px] opacity-60">OFF</span>
                        )}
                        {auto.canSendNotification && status.notification !== 'idle' && (
                          <span className="text-[10px]">
                            {status.notification === 'loading' ? '...' : status.notification === 'success' ? '✓' : '✗'}
                          </span>
                        )}
                      </button>

                      {/* Bouton Session */}
                      <button
                        onClick={() => createRealSession(auto.id)}
                        disabled={!auto.canCreateSession || status.session === 'loading'}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          !auto.canCreateSession
                            ? darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : status.session === 'success'
                              ? 'bg-green-500/20 border-green-500 text-green-600'
                              : status.session === 'error'
                                ? 'bg-red-500/20 border-red-500 text-red-600'
                                : darkMode
                                  ? 'bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20'
                                  : 'bg-green-50 border-green-500 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {status.session === 'loading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : status.session === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : status.session === 'error' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Calendar className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">Session</span>
                        </div>
                        {!auto.canCreateSession && (
                          <span className="text-[10px] opacity-60">OFF</span>
                        )}
                        {auto.canCreateSession && status.session !== 'idle' && (
                          <span className="text-[10px]">
                            {status.session === 'loading' ? '...' : status.session === 'success' ? '✓' : '✗'}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Status messages */}
                    {(status.emailMessage || status.notificationMessage || status.sessionMessage) && (
                      <div className={`mt-2 p-2 rounded text-[10px] ${
                        darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-50 text-gray-700'
                      }`}>
                        {status.emailMessage && <p>{status.emailMessage}</p>}
                        {status.notificationMessage && <p>{status.notificationMessage}</p>}
                        {status.sessionMessage && <p>{status.sessionMessage}</p>}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tableau récapitulatif */}
          <div className={`mt-8 p-6 rounded-xl ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📊 Tableau Récapitulatif
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <th className={`text-left py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Automatisation</th>
                    <th className={`text-center py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>📩 Email</th>
                    <th className={`text-center py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>🔔 Notif</th>
                    <th className={`text-center py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>📅 Session</th>
                  </tr>
                </thead>
                <tbody>
                  {automations.map((auto) => (
                    <tr key={auto.id} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <td className={`py-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{auto.name}</td>
                      <td className="text-center py-2">{auto.canSendEmail ? '✅' : '❌'}</td>
                      <td className="text-center py-2">{auto.canSendNotification ? '✅' : '❌'}</td>
                      <td className="text-center py-2">{auto.canCreateSession ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
