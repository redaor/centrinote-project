import React from 'react';
import { FileText, Sparkles, FileSearch, MessageSquare, X, CheckCircle } from 'lucide-react';

interface FileContextCardProps {
  fileName: string;
  fileSize: number;
  onRemove?: () => void;
  onQuickAction?: (action: 'summary' | 'extract' | 'ask') => void;
  isProcessing?: boolean;
  isActive?: boolean;
}

export function FileContextCard({
  fileName,
  fileSize,
  onRemove,
  onQuickAction,
  isProcessing = false,
  isActive = true
}: FileContextCardProps) {
  const getFileIcon = () => {
    if (fileName.endsWith('.pdf')) return '📄';
    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return '📝';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return '📃';
    return '📎';
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
      isActive
        ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20'
        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
    }`}>
      {/* Badge "En contexte" */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg">
          <CheckCircle className="w-3 h-3" />
          <span>En contexte</span>
        </div>
      )}

      {/* Contenu principal */}
      <div className="p-4">
        {/* En-tête avec icône et infos */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl bg-white dark:bg-gray-700 rounded-lg shadow-sm">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {fileName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(fileSize / 1024).toFixed(2)} Ko
            </p>
            {isProcessing && (
              <div className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Traitement en cours...</span>
              </div>
            )}
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Retirer le fichier"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" />
            </button>
          )}
        </div>

        {/* Barre d'actions rapides */}
        {onQuickAction && !isProcessing && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onQuickAction('summary')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-xs font-medium text-gray-700 dark:text-gray-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Résumer</span>
            </button>
            <button
              onClick={() => onQuickAction('extract')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all text-xs font-medium text-gray-700 dark:text-gray-200"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Extraire</span>
            </button>
            <button
              onClick={() => onQuickAction('ask')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-600 transition-all text-xs font-medium text-gray-700 dark:text-gray-200"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Poser une question</span>
            </button>
          </div>
        )}
      </div>

      {/* Animation de gradient pour le contexte actif */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
