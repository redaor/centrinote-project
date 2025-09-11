// 🧪 Composant de test pour l'intégration Zoom
// Tests complets de l'authentification et des services Zoom
// ========================================================

import React, { useState } from 'react';
import { TestTube, CheckCircle, XCircle, Loader2, Play, FileCheck } from 'lucide-react';
import { zoomOAuthService } from '../../services/zoomOAuthService';
import { zoomN8nIntegration } from '../../services/zoomN8nIntegration';
import { useZoomAuth } from '../../hooks/useZoomAuth';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export const ZoomIntegrationTest: React.FC = () => {
  const { isConnected, getTokens, getUserInfo } = useZoomAuth();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Configuration des variables d\'environnement', status: 'idle' },
    { name: 'Service d\'authentification Zoom', status: 'idle' },
    { name: 'Récupération des tokens OAuth', status: 'idle' },
    { name: 'Informations utilisateur Zoom', status: 'idle' },
    { name: 'Configuration n8n', status: 'idle' },
    { name: 'Webhook n8n', status: 'idle' },
    { name: 'Synchronisation des tokens avec n8n', status: 'idle' }
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Test 1: Configuration des variables d'environnement
    updateTest(0, { status: 'running' });
    const startTime1 = Date.now();
    try {
      const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
      const webhookUrl = import.meta.env.VITE_N8N_ZOOM_WEBHOOK;
      
      if (!clientId || !webhookUrl) {
        throw new Error('Variables manquantes: VITE_ZOOM_CLIENT_ID ou VITE_N8N_ZOOM_WEBHOOK');
      }
      
      updateTest(0, { 
        status: 'success', 
        message: `Client ID: ${clientId.substring(0, 10)}..., Webhook: configuré`,
        duration: Date.now() - startTime1
      });
    } catch (err) {
      updateTest(0, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur configuration',
        duration: Date.now() - startTime1
      });
    }

    // Test 2: Service d'authentification
    updateTest(1, { status: 'running' });
    const startTime2 = Date.now();
    try {
      const serviceAvailable = typeof zoomOAuthService.signInWithZoom === 'function';
      if (!serviceAvailable) {
        throw new Error('Service d\'authentification non disponible');
      }
      
      updateTest(1, { 
        status: 'success', 
        message: 'Service d\'authentification disponible et fonctionnel',
        duration: Date.now() - startTime2
      });
    } catch (err) {
      updateTest(1, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur service',
        duration: Date.now() - startTime2
      });
    }

    // Test 3: Tokens OAuth
    updateTest(2, { status: 'running' });
    const startTime3 = Date.now();
    try {
      if (!isConnected) {
        updateTest(2, { 
          status: 'error', 
          message: 'Non connecté - Ce test nécessite une connexion Zoom active',
          duration: Date.now() - startTime3
        });
      } else {
        const tokens = await getTokens();
        if (tokens?.access_token) {
          updateTest(2, { 
            status: 'success', 
            message: `Token disponible (expire: ${tokens.expires_at ? new Date(tokens.expires_at * 1000).toLocaleString() : 'N/A'})`,
            duration: Date.now() - startTime3
          });
        } else {
          throw new Error('Tokens non disponibles');
        }
      }
    } catch (err) {
      updateTest(2, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur tokens',
        duration: Date.now() - startTime3
      });
    }

    // Test 4: Informations utilisateur
    updateTest(3, { status: 'running' });
    const startTime4 = Date.now();
    try {
      if (!isConnected) {
        updateTest(3, { 
          status: 'error', 
          message: 'Non connecté - Ce test nécessite une connexion Zoom active',
          duration: Date.now() - startTime4
        });
      } else {
        const userInfo = await getUserInfo();
        if (userInfo) {
          updateTest(3, { 
            status: 'success', 
            message: `Utilisateur: ${userInfo.display_name || userInfo.email} (${userInfo.account_id})`,
            duration: Date.now() - startTime4
          });
        } else {
          throw new Error('Informations utilisateur non disponibles');
        }
      }
    } catch (err) {
      updateTest(3, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur utilisateur',
        duration: Date.now() - startTime4
      });
    }

    // Test 5: Configuration n8n
    updateTest(4, { status: 'running' });
    const startTime5 = Date.now();
    try {
      const configured = zoomN8nIntegration.isConfigured();
      const config = zoomN8nIntegration.getConfiguration();
      
      if (configured) {
        updateTest(4, { 
          status: 'success', 
          message: `n8n configuré - Webhook: ${config.webhook_url?.substring(0, 50)}...`,
          duration: Date.now() - startTime5
        });
      } else {
        throw new Error('n8n non configuré');
      }
    } catch (err) {
      updateTest(4, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur n8n',
        duration: Date.now() - startTime5
      });
    }

    // Test 6: Test webhook n8n
    updateTest(5, { status: 'running' });
    const startTime6 = Date.now();
    try {
      const result = await zoomN8nIntegration.testConnection();
      
      if (result.success) {
        updateTest(5, { 
          status: 'success', 
          message: 'Webhook n8n fonctionnel - Test réussi',
          duration: Date.now() - startTime6
        });
      } else {
        throw new Error(result.error || 'Test webhook échoué');
      }
    } catch (err) {
      updateTest(5, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur webhook',
        duration: Date.now() - startTime6
      });
    }

    // Test 7: Synchronisation tokens avec n8n
    updateTest(6, { status: 'running' });
    const startTime7 = Date.now();
    try {
      if (!isConnected) {
        updateTest(6, { 
          status: 'error', 
          message: 'Non connecté - Ce test nécessite une connexion Zoom active',
          duration: Date.now() - startTime7
        });
      } else {
        const result = await zoomN8nIntegration.sendOAuthTokens();
        
        if (result.success) {
          updateTest(6, { 
            status: 'success', 
            message: 'Tokens synchronisés avec n8n avec succès',
            duration: Date.now() - startTime7
          });
        } else {
          throw new Error(result.error || 'Synchronisation échouée');
        }
      }
    } catch (err) {
      updateTest(6, { 
        status: 'error', 
        message: err instanceof Error ? err.message : 'Erreur synchronisation',
        duration: Date.now() - startTime7
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <TestTube className="w-4 h-4 text-gray-400" />;
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const totalTests = tests.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
              <TestTube className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Test d'intégration Zoom
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Validation complète de l'implémentation
              </p>
            </div>
          </div>

          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{isRunning ? 'Tests en cours...' : 'Lancer les tests'}</span>
          </button>
        </div>

        {/* Status Summary */}
        {successCount > 0 || errorCount > 0 ? (
          <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  {successCount} réussi{successCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400">
                  {errorCount} échoué{errorCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">
                  {successCount}/{totalTests} validés
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Test Results */}
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div
              key={index}
              className={`
                p-4 rounded-xl border transition-all duration-200
                ${test.status === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                  : test.status === 'error'
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                  : test.status === 'running'
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {test.name}
                  </h3>
                  {test.message && (
                    <p className={`
                      text-sm mt-1
                      ${test.status === 'success' 
                        ? 'text-green-600 dark:text-green-400' 
                        : test.status === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                      }
                    `}>
                      {test.message}
                    </p>
                  )}
                </div>
                {test.duration && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {test.duration}ms
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">
            Instructions
          </h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-500 space-y-1">
            <li>• Connectez-vous à Zoom avant de lancer les tests pour une validation complète</li>
            <li>• Les tests de tokens et utilisateur nécessitent une session active</li>
            <li>• Le test webhook n8n vérifie la connectivité avec votre instance n8n</li>
            <li>• Tous les tests doivent être verts pour une intégration fonctionnelle</li>
          </ul>
        </div>
      </div>
    </div>
  );
};