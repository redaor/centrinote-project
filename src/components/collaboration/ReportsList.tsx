// 📄 Liste des rapports générés automatiquement
// Interface pour consulter, télécharger et gérer les rapports IA
// ===============================================================

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  Share2,
  Users,
  MessageSquare,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { GeneratedReport, ReportType } from '../../types/recording';

interface ReportsListProps {
  reports: GeneratedReport[];
  isLoading: boolean;
  onRefresh: () => void;
  onDownload: (report: GeneratedReport) => void;
  onDelete?: (reportId: string) => void;
  onShare?: (report: GeneratedReport) => void;
  onView?: (report: GeneratedReport) => void;
  darkMode?: boolean;
  showActions?: boolean;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  isLoading,
  onRefresh,
  onDownload,
  onDelete,
  onShare,
  onView,
  darkMode = false,
  showActions = true
}) => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'transcript': return <FileText className="w-5 h-5" />;
      case 'summary': return <MessageSquare className="w-5 h-5" />;
      case 'action_items': return <CheckCircle className="w-5 h-5" />;
      case 'full_report': return <BarChart3 className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'transcript': return 'Transcription';
      case 'summary': return 'Résumé';
      case 'action_items': return 'Actions';
      case 'full_report': return 'Rapport complet';
      default: return 'Rapport';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'generating': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'generating': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleDownload = useCallback((report: GeneratedReport) => {
    if (report.status === 'completed') {
      onDownload(report);
    }
  }, [onDownload]);

  if (isLoading) {
    return (
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-lg p-6 text-center
      `}>
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Chargement des rapports...
        </p>
      </div>
    );
  }

  return (
    <div className={`
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      border rounded-lg overflow-hidden
    `}>
      {/* Header */}
      <div className={`
        ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}
        border-b p-4 flex items-center justify-between
      `}>
        <div className="flex items-center space-x-3">
          <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <div>
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Rapports générés
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {reports.length} rapport{reports.length !== 1 ? 's' : ''} disponible{reports.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`
            p-2 rounded-lg transition-colors
            ${isLoading 
              ? 'opacity-50 cursor-not-allowed'
              : darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
            }
          `}
          title="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Liste des rapports */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {reports.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h4 className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Aucun rapport disponible
            </h4>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Les rapports apparaîtront ici après l'enregistrement et le traitement des sessions.
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className={`
                p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                ${selectedReport === report.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Icône du type de rapport */}
                  <div className={`
                    p-2 rounded-lg 
                    ${report.status === 'completed' 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : report.status === 'generating'
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }
                  `}>
                    {getReportIcon(report.type)}
                  </div>

                  {/* Informations du rapport */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getReportTypeLabel(report.type)}
                      </h4>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        report.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : report.status === 'generating'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {report.status === 'completed' ? 'Terminé' : 
                         report.status === 'generating' ? 'En cours' : 'Erreur'}
                      </span>
                    </div>

                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {report.title}
                    </p>

                    {/* Métadonnées */}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>
                        Généré le {new Date(report.generatedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {report.metadata.duration && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(report.metadata.duration)}</span>
                        </span>
                      )}
                      
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{report.metadata.participantCount} participant{report.metadata.participantCount !== 1 ? 's' : ''}</span>
                      </span>
                    </div>

                    {/* Détails additionnels pour rapports terminés */}
                    {report.status === 'completed' && report.metadata && (
                      <div className="mt-2 space-y-1 text-xs">
                        {report.metadata.wordCount && (
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {report.metadata.wordCount.toLocaleString()} mots transcrits
                          </div>
                        )}
                        
                        {report.metadata.keyTopics && report.metadata.keyTopics.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Sujets:</span>
                            <div className="flex flex-wrap gap-1">
                              {report.metadata.keyTopics.slice(0, 3).map((topic, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {report.metadata.actionItems && report.metadata.actionItems.length > 0 && (
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {report.metadata.actionItems.length} action{report.metadata.actionItems.length !== 1 ? 's' : ''} identifiée{report.metadata.actionItems.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message d'erreur */}
                    {report.error && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        Erreur: {report.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-2 ml-4">
                    {report.status === 'completed' && report.fileUrl && (
                      <>
                        {onView && (
                          <button
                            onClick={() => onView(report)}
                            className={`
                              p-2 rounded-lg transition-colors
                              ${darkMode 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                              }
                            `}
                            title="Voir le rapport"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDownload(report)}
                          className={`
                            p-2 rounded-lg transition-colors
                            ${darkMode 
                              ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                              : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                            }
                          `}
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {onShare && (
                          <button
                            onClick={() => onShare(report)}
                            className={`
                              p-2 rounded-lg transition-colors
                              ${darkMode 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                              }
                            `}
                            title="Partager"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}

                        {report.downloadUrl && (
                          <a
                            href={report.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                              p-2 rounded-lg transition-colors
                              ${darkMode 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                              }
                            `}
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => onDelete(report.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-100 text-red-600 hover:text-red-800 dark:hover:bg-red-900/30 dark:text-red-400 dark:hover:text-red-300"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};