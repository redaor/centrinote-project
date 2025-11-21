import React, { useState, useEffect } from 'react';
import { Download, Code, Copy, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DebuggerProps {
  automationId: string;
  darkMode: boolean;
  onClose: () => void;
}

interface AutomationLog {
  id: string;
  automation_id: string;
  executed_at: string;
  status: 'success' | 'error' | 'skipped';
  trigger_data: any;
  action_result: any;
  error_message: string | null;
}

export function AutomationDebugger({ automationId, darkMode, onClose }: DebuggerProps) {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler des logs d'exécution
      const mockLogs: AutomationLog[] = [
        {
          id: '1',
          automation_id: automationId,
          executed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          trigger_data: {
            event: 'document_created',
            documentId: 'doc123',
            documentTitle: 'Notes de cours',
            userId: 'user456'
          },
          action_result: {
            success: true,
            messageId: 'msg789',
            sentTo: 'user@example.com',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          error_message: null
        },
        {
          id: '2',
          automation_id: automationId,
          executed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'error',
          trigger_data: {
            event: 'document_created',
            documentId: 'doc456',
            documentTitle: 'Projet final',
            userId: 'user456'
          },
          action_result: {},
          error_message: 'Erreur lors de l\'envoi de l\'email: adresse invalide'
        },
        {
          id: '3',
          automation_id: automationId,
          executed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          trigger_data: {
            event: 'document_created',
            documentId: 'doc789',
            documentTitle: 'Présentation',
            userId: 'user456'
          },
          action_result: {
            success: true,
            messageId: 'msg123',
            sentTo: 'user@example.com',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          error_message: null
        }
      ];
      
      setLogs(mockLogs);
    } catch (err) {
      console.error('Erreur lors du chargement des logs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `automation-logs-${automationId}-${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error('Erreur lors de l\'export des logs:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    }
  };

  const copyToClipboard = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      navigator.clipboard.writeText(dataStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la copie');
    }
  };

  // Charger les logs au montage
  useEffect(() => {
    fetchLogs();
  }, [automationId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50">
      <div className={`
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        p-4 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col
      `}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Historique d'exécution</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
              `}
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={copyToClipboard}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
              `}
              title="Copier au presse-papiers"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={exportLogs}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
              `}
              title="Exporter en JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
              `}
              title="Fermer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {error && (
          <div className={`
            mb-4 p-3 rounded-lg
            ${darkMode ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}
          `}>
            {error}
          </div>
        )}
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className={`
                    p-3 rounded-lg border
                    ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : log.status === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium">
                        {new Date(log.executed_at).toLocaleString()}
                      </span>
                    </div>
                    <span className={`
                      px-2 py-1 text-xs rounded-full
                      ${log.status === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : log.status === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }
                    `}>
                      {log.status}
                    </span>
                  </div>
                  
                  {log.error_message && (
                    <div className={`
                      p-2 rounded-lg mb-2 text-sm
                      ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}
                    `}>
                      {log.error_message}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <h4 className="text-xs font-medium mb-1">Données de déclenchement</h4>
                      <pre className={`
                        text-xs p-2 rounded-lg overflow-auto max-h-40
                        ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}
                      `}>
                        {JSON.stringify(log.trigger_data, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium mb-1">Résultat de l'action</h4>
                      <pre className={`
                        text-xs p-2 rounded-lg overflow-auto max-h-40
                        ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}
                      `}>
                        {JSON.stringify(log.action_result, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
              <Code className={`w-12 h-12 mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Aucun log disponible pour cette automatisation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}