import React, { useState } from 'react';
import { Shield, Lock, Smartphone, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { PasswordChangeForm } from './PasswordChangeForm';
import { TwoFactorAuth } from './TwoFactorAuth';
import { EmailSecurity } from './EmailSecurity';

interface SecuritySectionProps {
  darkMode: boolean;
}

export function SecuritySection({ darkMode }: SecuritySectionProps) {
  const { state } = useApp();
  const { user } = state;
  const [activeSecurityView, setActiveSecurityView] = useState<'overview' | 'password' | '2fa' | 'email'>('overview');

  const securityItems = [
    {
      id: 'password',
      title: 'Mot de passe',
      description: 'Modifiez votre mot de passe de connexion',
      icon: Lock,
      status: 'active',
      lastUpdated: 'Modifié il y a 3 mois',
      action: 'Modifier'
    },
    {
      id: '2fa',
      title: 'Authentification à deux facteurs',
      description: 'Sécurisez votre compte avec une authentification supplémentaire',
      icon: Smartphone,
      status: 'inactive',
      lastUpdated: 'Non configuré',
      action: 'Configurer'
    },
    {
      id: 'email',
      title: 'Sécurité email',
      description: 'Gérez les notifications de sécurité et la récupération de compte',
      icon: Mail,
      status: 'active',
      lastUpdated: 'Vérifié',
      action: 'Gérer'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
        return 'text-orange-500';
      case 'warning':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'inactive':
      case 'warning':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const handleSecurityAction = (itemId: string) => {
    setActiveSecurityView(itemId as 'password' | '2fa' | 'email');
  };

  const renderSecurityView = () => {
    switch (activeSecurityView) {
      case 'password':
        return (
          <PasswordChangeForm
            darkMode={darkMode}
            onBack={() => setActiveSecurityView('overview')}
          />
        );
      case '2fa':
        return (
          <TwoFactorAuth
            darkMode={darkMode}
            onBack={() => setActiveSecurityView('overview')}
          />
        );
      case 'email':
        return (
          <EmailSecurity
            darkMode={darkMode}
            onBack={() => setActiveSecurityView('overview')}
          />
        );
      default:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sécurité du compte
                </h2>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Protégez votre compte avec des mesures de sécurité avancées
                </p>
              </div>
            </div>

            {/* Security Score */}
            <div className={`
              ${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}
              p-6 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-blue-200'}
            `}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Score de sécurité
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Votre niveau de protection actuel
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    75%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Bon niveau
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full w-3/4"></div>
              </div>
              
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Activez l'authentification à deux facteurs pour atteindre 100%
              </p>
            </div>

            {/* Security Items */}
            <div className="space-y-4">
              {securityItems.map((item) => {
                const Icon = item.icon;
                const StatusIcon = getStatusIcon(item.status);
                
                return (
                  <div
                    key={item.id}
                    className={`
                      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                      border rounded-xl p-6 hover:shadow-md transition-all duration-200
                      cursor-pointer group
                    `}
                    onClick={() => handleSecurityAction(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`
                          p-3 rounded-lg
                          ${item.status === 'active' 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-orange-100 dark:bg-orange-900/30'
                          }
                        `}>
                          <Icon className={`w-6 h-6 ${
                            item.status === 'active' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.title}
                            </h3>
                            <StatusIcon className={`w-4 h-4 ${getStatusColor(item.status)}`} />
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.description}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {item.lastUpdated}
                          </p>
                        </div>
                      </div>
                      
                      <button className={`
                        px-4 py-2 rounded-lg font-medium transition-all duration-200
                        ${item.status === 'active'
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                        }
                        group-hover:shadow-md
                      `}>
                        {item.action}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security Tips */}
            <div className={`
              ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              border rounded-xl p-6
            `}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Conseils de sécurité
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Utilisez un mot de passe unique et complexe
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Activez l'authentification à deux facteurs
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Vérifiez régulièrement l'activité de votre compte
                  </span>
                </li>
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {renderSecurityView()}
    </div>
  );
}