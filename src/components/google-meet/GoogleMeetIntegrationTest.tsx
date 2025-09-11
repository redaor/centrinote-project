// 🧪 Composant de test d'intégration Google Meet
// Interface de validation pour tester toutes les fonctionnalités Google Meet
// ==========================================================================

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Calendar,
  Settings,
  Wifi,
  Key,
  User,
  Zap
} from 'lucide-react';
import { useGoogleMeet } from '../../hooks/useGoogleMeet';
import { googleMeetService } from '../../services/googleMeetService';
import { googleN8nIntegration } from '../../services/googleN8nIntegration';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
}

export const GoogleMeetIntegrationTest: React.FC = () => {
  const { isConnected, user, getTokens } = useGoogleMeet();
  
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Configuration des variables d\'environnement', status: 'idle' },
    { name: 'Service d\'authentification Google Meet', status: 'idle' },
    { name: 'Récupération des tokens OAuth', status: 'idle' },
    { name: 'Informations utilisateur Google', status: 'idle' },
    { name: 'Configuration n8n', status: 'idle' },
    { name: 'Webhook n8n', status: 'idle' },
    { name: 'Synchronisation des tokens avec n8n', status: 'idle' },
    { name: 'API Google Calendar', status: 'idle' }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(-1);

  // Mettre à jour un test spécifique
  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  // Exécuter tous les tests
  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    // Réinitialiser tous les tests
    setTests(prev => prev.map(test => ({ ...test, status: 'idle' as const })));
    
    // Exécuter chaque test
    for (let i = 0; i < tests.length; i++) {
      setCurrentTestIndex(i);
      await runSingleTest(i);
      // Petit délai pour l'UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setCurrentTestIndex(-1);
    setIsRunning(false);
  };

  // Exécuter un test spécifique
  const runSingleTest = async (index: number) => {
    updateTest(index, { status: 'running' });
    
    try {
      switch (index) {
        case 0: // Variables d'environnement
          await testEnvironmentVariables(index);
          break;
        case 1: // Service d'authentification
          await testAuthenticationService(index);
          break;
        case 2: // Tokens OAuth
          await testOAuthTokens(index);
          break;
        case 3: // Infos utilisateur
          await testUserInfo(index);
          break;
        case 4: // Configuration n8n
          await testN8nConfiguration(index);
          break;
        case 5: // Webhook n8n
          await testN8nWebhook(index);
          break;
        case 6: // Synchronisation n8n
          await testN8nSync(index);
          break;
        case 7: // API Google Calendar
          await testGoogleCalendarAPI(index);
          break;
        default:
          throw new Error('Test non implémenté');
      }
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  // Test 1: Variables d'environnement
  const testEnvironmentVariables = async (index: number) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    const scopes = import.meta.env.VITE_GOOGLE_SCOPES;
    const webhookUrl = import.meta.env.VITE_N8N_GOOGLE_MEET_WEBHOOK;
    const appUrl = import.meta.env.VITE_APP_URL;
    const environment = import.meta.env.NODE_ENV || import.meta.env.MODE;

    const missing = [];
    if (!clientId || clientId === 'your_google_client_id_here') missing.push('VITE_GOOGLE_CLIENT_ID');
    if (!clientSecret || clientSecret === 'your_google_client_secret_here') missing.push('VITE_GOOGLE_CLIENT_SECRET');
    if (!scopes) missing.push('VITE_GOOGLE_SCOPES');
    if (!webhookUrl || webhookUrl.includes('your_google_meet_webhook_id_here')) missing.push('VITE_N8N_GOOGLE_MEET_WEBHOOK');
    if (!appUrl && environment === 'production') missing.push('VITE_APP_URL');

    if (missing.length > 0) {
      updateTest(index, {
        status: 'error',
        message: `Variables manquantes: ${missing.join(', ')}`,
        details: { 
          missing, 
          clientId: clientId?.substring(0, 20) + '...',
          environment,
          currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
        }
      });
    } else {
      updateTest(index, {
        status: 'success',
        message: 'Variables d\'environnement configurées pour production',
        details: { 
          clientId: clientId.substring(0, 20) + '...',
          scopes: scopes.split(' ').length + ' scopes',
          webhook: 'Configuré',
          environment,
          appUrl: appUrl || window.location.origin,
          production: environment === 'production'
        }
      });
    }
  };

  // Test 2: Service d'authentification
  const testAuthenticationService = async (index: number) => {
    try {
      const connected = await googleMeetService.isConnectedToGoogle();
      const session = await googleMeetService.getCurrentGoogleSession();
      
      updateTest(index, {
        status: 'success',
        message: `Connexion: ${connected ? 'Active' : 'Inactive'}`,
        details: {
          connected,
          hasSession: !!session,
          hasTokens: !!session?.access_token
        }
      });
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: `Erreur service: ${error instanceof Error ? error.message : 'Inconnue'}`
      });
    }
  };

  // Test 3: Tokens OAuth
  const testOAuthTokens = async (index: number) => {
    try {
      const tokens = await getTokens();
      
      if (tokens?.access_token) {
        const expiresIn = tokens.expires_at ? new Date(tokens.expires_at * 1000) : null;
        const isExpired = expiresIn ? expiresIn < new Date() : false;
        
        updateTest(index, {
          status: 'success',
          message: 'Tokens OAuth disponibles',
          details: {
            hasAccessToken: true,
            hasRefreshToken: !!tokens.refresh_token,
            expiresAt: expiresIn?.toLocaleString('fr-FR'),
            isExpired
          }
        });
      } else {
        updateTest(index, {
          status: 'error',
          message: 'Aucun token OAuth disponible',
          details: { needsAuthentication: true }
        });
      }
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: `Erreur tokens: ${error instanceof Error ? error.message : 'Inconnue'}`
      });
    }
  };

  // Test 4: Informations utilisateur
  const testUserInfo = async (index: number) => {
    try {
      const userInfo = await googleMeetService.getGoogleUserInfo();
      
      if (userInfo) {
        updateTest(index, {
          status: 'success',
          message: `Utilisateur: ${userInfo.name}`,
          details: {
            name: userInfo.name,
            email: userInfo.email,
            verified: userInfo.verified_email,
            picture: !!userInfo.picture
          }
        });
      } else {
        updateTest(index, {
          status: 'error',
          message: 'Impossible de récupérer les infos utilisateur',
          details: { needsAuthentication: true }
        });
      }
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: `Erreur API: ${error instanceof Error ? error.message : 'Inconnue'}`
      });
    }
  };

  // Test 5: Configuration n8n
  const testN8nConfiguration = async (index: number) => {
    const isConfigured = googleN8nIntegration.isConfigured();
    const config = googleN8nIntegration.getConfiguration();
    
    updateTest(index, {
      status: isConfigured ? 'success' : 'error',
      message: isConfigured ? 'n8n correctement configuré' : 'Configuration n8n manquante',
      details: {
        configured: isConfigured,
        hasWebhookUrl: !!config.webhook_url,
        enabled: config.enabled
      }
    });
  };

  // Test 6: Webhook n8n
  const testN8nWebhook = async (index: number) => {
    try {
      const result = await googleN8nIntegration.testConnection();
      
      updateTest(index, {
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Webhook n8n accessible' : `Erreur: ${result.error}`,
        details: {
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime ? `${result.responseTime}ms` : undefined,
          error: result.error
        }
      });
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: `Erreur test webhook: ${error instanceof Error ? error.message : 'Inconnue'}`
      });
    }
  };

  // Test 7: Synchronisation n8n
  const testN8nSync = async (index: number) => {
    try {
      const tokens = await getTokens();
      
      if (!tokens) {
        updateTest(index, {
          status: 'error',
          message: 'Aucun token à synchroniser',
          details: { needsAuthentication: true }
        });
        return;
      }

      const success = await googleN8nIntegration.sendOAuthTokens(tokens);
      
      updateTest(index, {
        status: success ? 'success' : 'error',
        message: success ? 'Tokens synchronisés avec n8n' : 'Échec synchronisation',
        details: { tokensSent: success }
      });
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: `Erreur sync: ${error instanceof Error ? error.message : 'Inconnue'}`
      });
    }
  };

  // Test 8: API Google Calendar
  const testGoogleCalendarAPI = async (index: number) => {
    try {
      const meetings = await googleMeetService.getMeetings(1);
      
      updateTest(index, {
        status: 'success',
        message: `API Google Calendar accessible`,
        details: {
          meetingsFound: meetings.length,
          apiWorking: true
        }
      });
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: `Erreur API Calendar: ${error instanceof Error ? error.message : 'Inconnue'}`
      });
    }
  };

  // Obtenir l'icône pour le statut
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Obtenir l'icône pour le type de test
  const getTestIcon = (index: number) => {
    const icons = [
      <Settings className="w-4 h-4" />, // Variables env
      <Key className="w-4 h-4" />,      // Auth service
      <Key className="w-4 h-4" />,      // Tokens
      <User className="w-4 h-4" />,     // User info
      <Zap className="w-4 h-4" />,      // n8n config
      <Wifi className="w-4 h-4" />,     // Webhook
      <RefreshCw className="w-4 h-4" />, // Sync
      <Calendar className="w-4 h-4" />  // Calendar API
    ];
    return icons[index] || <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Test d'Intégration Google Meet
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Validation complète de l'intégration Google Meet et n8n
        </p>
      </div>

      {/* Statut global */}
      <div className={`
        p-4 rounded-xl border
        ${isConnected
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }
      `}>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          )}
          <span className={`font-medium ${
            isConnected 
              ? 'text-green-700 dark:text-green-400' 
              : 'text-yellow-700 dark:text-yellow-400'
          }`}>
            {isConnected ? 'Google Meet Connecté' : 'Google Meet Non Connecté'}
          </span>
        </div>
        {user && (
          <p className={`text-sm mt-1 ${
            isConnected 
              ? 'text-green-600 dark:text-green-500' 
              : 'text-yellow-600 dark:text-yellow-500'
          }`}>
            Utilisateur : {user.name} ({user.email})
          </p>
        )}
      </div>

      {/* Bouton de test */}
      <div className="text-center">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`
            inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
            ${isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
            }
            text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20
          `}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Tests en cours...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              <span>Lancer tous les tests</span>
            </>
          )}
        </button>
      </div>

      {/* Liste des tests */}
      <div className="space-y-3">
        {tests.map((test, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-xl border transition-all
              ${currentTestIndex === index
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-0.5">
                  {getTestIcon(index)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {test.name}
                  </h3>
                  {test.message && (
                    <p className={`text-sm mt-1 ${
                      test.status === 'success' 
                        ? 'text-green-600 dark:text-green-400'
                        : test.status === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {test.message}
                    </p>
                  )}
                  {test.details && test.status !== 'running' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        Voir les détails
                      </summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              <div className="ml-3">
                {getStatusIcon(test.status)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Résumé */}
      {!isRunning && tests.some(t => t.status !== 'idle') && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Résumé des tests
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {tests.filter(t => t.status === 'success').length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Réussis</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {tests.filter(t => t.status === 'error').length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Échoués</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {tests.filter(t => t.status === 'idle').length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">En attente</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};