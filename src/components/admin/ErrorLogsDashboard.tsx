// =====================================================
// ErrorLogsDashboard - Composant pour afficher les logs d'erreurs
// =====================================================

import React, { useState, useMemo } from 'react';
import { useErrorLogs, ErrorLog } from '../../hooks/useErrorLogs';
import { AlertCircle, RefreshCw, Trash2, Filter, X, Info, AlertTriangle, XCircle, Bug } from 'lucide-react';
import { logger } from '../../utils/logger';

interface ErrorLogsDashboardProps {
  userId?: string;
}

export function ErrorLogsDashboard({ userId }: ErrorLogsDashboardProps) {
  const [levelFilter, setLevelFilter] = useState<ErrorLog['level'] | 'all'>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const { logs, loading, error, refresh, clearLogs } = useErrorLogs({
    limit: 200,
    level: levelFilter !== 'all' ? levelFilter : undefined,
    userId,
    realtime: true,
  });

  // Filtrer les logs par recherche
  const filteredLogs = useMemo(() => {
    if (!searchQuery) {
      return logs;
    }

    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.message.toLowerCase().includes(query) ||
      log.source?.toLowerCase().includes(query) ||
      log.url?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // Grouper les logs par date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ErrorLog[]> = {};
    
    filteredLogs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    return groups;
  }, [filteredLogs]);

  // Statistiques
  const stats = useMemo(() => {
    return {
      total: logs.length,
      error: logs.filter(l => l.level === 'error').length,
      warn: logs.filter(l => l.level === 'warn').length,
      info: logs.filter(l => l.level === 'info').length,
      debug: logs.filter(l => l.level === 'debug').length,
    };
  }, [logs]);

  // Icône selon le niveau
  const getLevelIcon = (level: ErrorLog['level']) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'debug':
        return <Bug className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Couleur selon le niveau
  const getLevelColor = (level: ErrorLog['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'debug':
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
      default:
        return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200">Erreur de chargement</h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Logs d'erreurs</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitoring en temps réel des erreurs de l'application
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Nettoyer
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Erreurs</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warn}</div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">Avertissements</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.info}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Infos</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.debug}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Debug</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtre par niveau */}
          <div className="flex gap-2">
            {(['all', 'error', 'warn', 'info', 'debug'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  levelFilter === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {level === 'all' ? 'Tous' : level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="space-y-6">
        {loading && filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Chargement des logs...</p>
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun log trouvé</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
                {date}
              </h3>
              {dateLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${getLevelColor(log.level)}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start gap-3">
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          {log.level}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1 break-words">
                        {log.message}
                      </p>
                      {log.source && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Source: {log.source}
                          {log.url && ` • ${log.url}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Modal de détails */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Détails du log</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Message</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white break-words">{selectedLog.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Niveau</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.level}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Source</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.source || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(selectedLog.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User ID</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {selectedLog.user_id || 'N/A'}
                  </p>
                </div>
              </div>
              {selectedLog.url && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">URL</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">{selectedLog.url}</p>
                </div>
              )}
              {selectedLog.stack_trace && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Stack Trace</label>
                  <pre className="mt-1 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}
              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Métadonnées</label>
                  <pre className="mt-1 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

