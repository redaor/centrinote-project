import React, { useState } from 'react';
import { ArrowLeft, Mail, Shield, Bell, CheckCircle, AlertTriangle } from 'lucide-react';

interface EmailSecurityProps {
  darkMode: boolean;
  onBack: () => void;
}

export function EmailSecurity({ darkMode, onBack }: EmailSecurityProps) {
  const [emailNotifications, setEmailNotifications] = useState({
    loginAlerts: true,
    passwordChanges: true,
    securityUpdates: true,
    suspiciousActivity: true,
    weeklyReport: false
  });

  const [recoveryEmail, setRecoveryEmail] = useState('recovery@example.com');
  const [isEditingRecovery, setIsEditingRecovery] = useState(false);

  const handleNotificationToggle = (key: keyof typeof emailNotifications) => {
    setEmailNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveRecoveryEmail = () => {
    setIsEditingRecovery(false);
    // Ici vous ajouteriez la logique de sauvegarde
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={onBack}
          className={`
            p-2 rounded-lg transition-colors
            ${darkMode 
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Sécurité email
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérez les notifications et la récupération de compte
            </p>
          </div>
        </div>
      </div>

      {/* Email de récupération */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6
      `}>
        <div className="flex items-center space-x-3 mb-4">
          <Shield className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Email de récupération
          </h3>
        </div>
        
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Cet email sera utilisé pour récupérer votre compte en cas de problème
        </p>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Adresse email de récupération
            </label>
            {isEditingRecovery ? (
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className={`
                    flex-1 px-3 py-2 rounded-lg border
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
                <button
                  onClick={handleSaveRecoveryEmail}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setIsEditingRecovery(false)}
                  className={`
                    px-4 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {recoveryEmail}
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <button
                  onClick={() => setIsEditingRecovery(true)}
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  Modifier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications de sécurité */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6
      `}>
        <div className="flex items-center space-x-3 mb-4">
          <Bell className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notifications de sécurité
          </h3>
        </div>
        
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Choisissez les événements pour lesquels vous souhaitez recevoir des notifications par email
        </p>

        <div className="space-y-4">
          {[
            {
              key: 'loginAlerts' as const,
              title: 'Alertes de connexion',
              description: 'Notification lors de nouvelles connexions à votre compte',
              recommended: true
            },
            {
              key: 'passwordChanges' as const,
              title: 'Changements de mot de passe',
              description: 'Notification lors de modifications de votre mot de passe',
              recommended: true
            },
            {
              key: 'securityUpdates' as const,
              title: 'Mises à jour de sécurité',
              description: 'Informations importantes sur la sécurité de votre compte',
              recommended: true
            },
            {
              key: 'suspiciousActivity' as const,
              title: 'Activité suspecte',
              description: 'Alertes en cas d\'activité inhabituelle détectée',
              recommended: true
            },
            {
              key: 'weeklyReport' as const,
              title: 'Rapport hebdomadaire',
              description: 'Résumé hebdomadaire de l\'activité de votre compte',
              recommended: false
            }
          ].map((notification) => (
            <div key={notification.key} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {notification.title}
                  </h4>
                  {notification.recommended && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                      Recommandé
                    </span>
                  )}
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {notification.description}
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle(notification.key)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4
                  ${emailNotifications[notification.key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${emailNotifications[notification.key] ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Informations importantes */}
      <div className={`
        ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}
        border rounded-xl p-6
      `}>
        <div className="flex items-start space-x-3">
          <AlertTriangle className={`w-5 h-5 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <div>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
              Important à savoir
            </h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <li>• Les notifications de sécurité critiques ne peuvent pas être désactivées</li>
              <li>• Vérifiez régulièrement votre email de récupération</li>
              <li>• Les emails de sécurité ne contiennent jamais de liens suspects</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}