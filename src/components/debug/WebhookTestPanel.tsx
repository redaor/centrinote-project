import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Settings, 
  Wifi,
  MessageSquare,
  Wrench,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { webhookService } from '../../services/webhookService';
// Import des utilitaires - WebhookDebugger sera disponible via l'import side-effect

export function WebhookTestPanel() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningTest, setIsRunningTest] = useState<string | null>(null);
  const [showFullResults, setShowFullResults] = useState(false);
  
  /**
   * Lance un test spécifique
   */
  const runTest = async (testType: string) => {
    setIsRunningTest(testType);
    
    try {
      let result: any;
      
      switch (testType) {
        case 'connectivity':
          result = await webhookService.testN8NConnectivity();
          break;
        case 'discussion':
          result = await webhookService.triggerDiscussionWorkflow({
            userId: user?.id || 'test_user',
            message: 'Test de connectivité IA - ' + new Date().toLocaleString(),
            context: 'debug_panel_test'
          });
          break;
        case 'automation':
          result = await webhookService.triggerAutomationWorkflow({
            userId: user?.id || 'test_user',
            action: 'debug_panel_test'
          });
          break;
        case 'simple':
          result = await webhookService.testSimpleConnectivity();
          break;
        case 'full':
          // Utiliser la fonction globale disponible via l'import side-effect
          result = await (window as any).debugWebhooks?.();
          break;
      }
      
      setTestResults((prev: Record<string, any>) => ({
        ...prev,
        [testType]: result
      }));
    } catch (error) {
      setTestResults((prev: Record<string, any>) => ({
        ...prev,
        [testType]: {
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      }));
    } finally {
      setIsRunningTest(null);
    }
  };
  
  /**
   * Obtient l'icône de statut pour un test
   */
  const getStatusIcon = (testType: string) => {
    if (isRunningTest === testType) {
      return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
    }
    
    const result = testResults[testType];
    if (!result) {
      return <Play className="w-5 h-5 text-gray-400" />;
    }
    
    return result.success ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> :
      <XCircle className="w-5 h-5 text-red-500" />;
  };
  
  /**
   * Obtient le message de résultat pour un test
   */
  const getResultMessage = (testType: string) => {
    const result = testResults[testType];
    if (!result) return 'Non testé';
    
    return result.success ? 
      (result.message || 'Test réussi') : 
      (result.error || result.message || 'Test échoué');
  };
  
  const tests = [
    {
      id: 'simple',
      name: 'Connectivité simple',
      description: 'Test basique de connectivité réseau',
      icon: Wifi
    },
    {
      id: 'connectivity',
      name: 'Test N8N Standard',
      description: 'Test complet de la connexion N8N',
      icon: Settings
    },
    {
      id: 'discussion',
      name: 'Workflow Discussion IA',
      description: 'Test du workflow de discussion avec l\'IA',
      icon: MessageSquare
    },
    {
      id: 'automation',
      name: 'Workflow Automatisation',
      description: 'Test du workflow d\'automatisation',
      icon: Wrench
    },
    {
      id: 'full',
      name: 'Diagnostic complet',
      description: 'Lance tous les tests diagnostiques',
      icon: RefreshCw
    }
  ];
  
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      <div className="mb-6">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          Tests de connectivité N8N
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Diagnostiquer et résoudre les problèmes de connexion avec l'IA
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        {tests.map(test => {
          const Icon = test.icon;
          return (
            <div 
              key={test.id}
              className={`
                ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}
                border rounded-lg p-4
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <Icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {test.name}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {test.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.id)}
                  <button
                    onClick={() => runTest(test.id)}
                    disabled={isRunningTest !== null}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isRunningTest !== null 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:shadow-md'
                      }
                      ${darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }
                    `}
                  >
                    {isRunningTest === test.id ? 'Test...' : 'Tester'}
                  </button>
                </div>
              </div>
              
              {testResults[test.id] && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      <p className={`text-sm ${
                        testResults[test.id].success 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {getResultMessage(test.id)}
                      </p>
                      
                      {testResults[test.id].diagnostics && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <p>URL: {testResults[test.id].diagnostics.url}</p>
                          <p>Temps: {testResults[test.id].diagnostics.responseTime}ms</p>
                          {testResults[test.id].diagnostics.statusCode && (
                            <p>Status: {testResults[test.id].diagnostics.statusCode}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {testResults[test.id] && Object.keys(testResults[test.id]).length > 2 && (
                      <button
                        onClick={() => setShowFullResults(!showFullResults)}
                        className="text-xs text-blue-500 hover:text-blue-600"
                      >
                        {showFullResults ? 'Masquer' : 'Détails'}
                      </button>
                    )}
                  </div>
                  
                  {showFullResults && testResults[test.id] && (
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(testResults[test.id], null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className={`
        ${darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'}
        border rounded-lg p-4
      `}>
        <p className="text-sm">
          💡 <strong>Conseil :</strong> Si les tests échouent, vérifiez que :
        </p>
        <ul className="text-sm mt-2 space-y-1 ml-4">
          <li>• L'instance N8N est active et accessible</li>
          <li>• Les URLs de webhooks sont correctes</li>
          <li>• Les workflows N8N sont activés</li>
          <li>• Aucun pare-feu ne bloque les requêtes</li>
        </ul>
        
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <p className="text-xs">
            Ouvrez la console du navigateur (F12) pour voir les logs détaillés des tests.
          </p>
        </div>
      </div>
    </div>
  );
}