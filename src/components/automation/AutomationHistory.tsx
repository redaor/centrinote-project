import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Calendar,
  Mail,
  Bell,
  FileText
} from 'lucide-react';

interface HistoryProps {
  darkMode: boolean;
}

interface ExecutionLog {
  id: string;
  automation_id: string;
  automation_name: string;
  action_type: string;
  executed_at: string;
  status: 'success' | 'error' | 'skipped';
  trigger_data: any;
  action_result: any;
  error_message: string | null;
}

export function AutomationHistory({ darkMode }: HistoryProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'skipped'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Charger les logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuler des logs d'exécution
      const mockLogs: ExecutionLog[] = [
        {
          id: '1',
          automation_id: '1',
          automation_name: 'Envoyer un email de bienvenue',
          action_type: 'email.send',
          executed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          trigger_data: {
            event: 'user_registered',
            userId: 'user123',
            email: 'user@example.com',
            name: 'John Doe'
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
          automation_id: '2',
          automation_name: 'Rappel de révision quotidienne',
          action_type: 'reminder.create',
          executed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'error',
          trigger_data: {
            event: 'schedule_time',
            time: '09:00',
            userId: 'user123'
          },
          action_result: {},
          error_message: 'Erreur lors de la création du rappel: champ message manquant'
        },
        {
          id: '3',
          automation_id: '3',
          automation_name: 'Notification de nouveau document partagé',
          action_type: 'notification.send',
          executed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          trigger_data: {
            event: 'document_shared',
            documentId: 'doc123',
            documentTitle: 'Notes de cours',
            sharedBy: 'Alice',
            sharedWith: 'user123'
          },
          action_result: {
            success: true,
            notificationId: 'notif123',
            sentTo: 'user123',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          error_message: null
        },
        {
          id: '4',
          automation_id: '1',
          automation_name: 'Envoyer un email de bienvenue',
          action_type: 'email.send',
          executed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          trigger_data: {
            event: 'user_registered',
            userId: 'user456',
            email: 'jane@example.com',
            name: 'Jane Smith'
          },
          action_result: {
            success: true,
            messageId: 'msg123',
            sentTo: 'jane@example.com',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          error_message: null
        },
        {
          id: '5',
          automation_id: '2',
          automation_name: 'Rappel de révision quotidienne',
          action_type: 'reminder.create',
          executed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'skipped',
          trigger_data: {
            event: 'schedule_time',
            time: '09:00',
            userId: 'user123'
          },
          action_result: {
            skipped: true,
            reason: 'L\'utilisateur a désactivé les rappels'
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

  // Filtrer les logs
  useEffect(() => {
    if (!logs.length) {
      setFilteredLogs([]);
      return;
    }

    let filtered = [...logs];
    
    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }
    
    // Filtre par date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(log => new Date(log.executed_at) >= today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(log => new Date(log.executed_at) >= weekAgo);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(log => new Date(log.executed_at) >= monthAgo);
      }
    }
    
    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.automation_name.toLowerCase().includes(term) || 
        log.action_type.toLowerCase().includes(term) ||
        (log.error_message && log.error_message.toLowerCase().includes(term))
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, statusFilter, dateFilter, searchTerm]);

  // Charger les logs au montage
  useEffect(() => {
    fetchLogs();
  }, []);

  // Exporter les logs
  const exportLogs = () => {
    try {
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `automation-logs-${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error('Erreur lors de l\'export des logs:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    }
  };

  // Obtenir l'icône pour le type d'action
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email.send':
        return Mail;
      case 'reminder.create':
        return Clock;
      case 'notification.send':
        return Bell;
      case 'session.schedule':
        return Calendar;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Historique d'exécution
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportLogs}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
            `}
            title="Exporter en JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Rechercher dans l'historique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`
              pl-10 pr-4 py-2 w-full rounded-lg border transition-colors
              ${darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
            `}
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'error' | 'skipped')}
          className={`
            px-3 py-2 rounded-lg border transition-colors
            ${darkMode 
              ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
          `}
        >
          <option value="all">Tous les statuts</option>
          <option value="success">Succès</option>
          <option value="error">Erreur</option>
          <option value="skipped">Ignoré</option>
        </select>
        
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
          className={`
            px-3 py-2 rounded-lg border transition-colors
            ${darkMode 
              ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
          `}
        >
          <option value="all">Toutes les dates</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">7 derniers jours</option>
          <option value="month">30 derniers jours</option>
        </select>
      </div>
      
      {error && (
        <div className={`
          p-4 rounded-lg border
          ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-800'}
        `}>
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Liste des logs */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const ActionIcon = getActionIcon(log.action_type);
            const isExpanded = expandedLogId === log.id;
            
            return (
              <div
                key={log.id}
                className={`
                  ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  border rounded-lg overflow-hidden transition-all duration-200
                  ${isExpanded ? 'shadow-md' : ''}
                `}
              >
                <div 
                  className={`
                    p-4 cursor-pointer
                    ${isExpanded 
                      ? darkMode ? 'bg-gray-700' : 'bg-gray-50' 
                      : ''
                    }
                  `}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : log.status === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <div>
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {log.automation_name}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(log.executed_at).toLocaleString()}
                          </span>
                          <div className="flex items-center space-x-1">
                            <ActionIcon className={`w-3 h-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {log.action_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${log.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : log.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }
                      `}>
                        {log.status === 'success' ? 'Succès' : log.status === 'error' ? 'Erreur' : 'Ignoré'}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      )}
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    {log.error_message && (
                      <div className={`
                        p-3 rounded-lg mb-4 text-sm
                        ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}
                      `}>
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{log.error_message}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Données de déclenchement
                        </h4>
                        <pre className={`
                          text-xs p-3 rounded-lg overflow-auto max-h-60
                          ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}
                        `}>
                          {JSON.stringify(log.trigger_data, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Résultat de l'action
                        </h4>
                        <pre className={`
                          text-xs p-3 rounded-lg overflow-auto max-h-60
                          ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}
                        `}>
                          {JSON.stringify(log.action_result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Aucun historique trouvé
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Aucune automatisation n\'a encore été exécutée'
            }
          </p>
        </div>
      )}
    </div>
  );
}