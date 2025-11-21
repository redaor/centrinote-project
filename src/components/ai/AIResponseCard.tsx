import React, { useState } from 'react';
import { Bot, Copy, Check, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface AIResponseCardProps {
  content: string;
  timestamp: Date;
  hasFileContext?: boolean;
  metadata?: {
    executionTime?: number;
    securityScore?: number;
    isValid?: boolean;
    isFileContext?: boolean;
  };
}

export function AIResponseCard({ content, timestamp, hasFileContext, metadata }: AIResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Si c'est un message de contexte de fichier, l'afficher différemment
  const isFileContextMessage = metadata?.isFileContext || content.startsWith('📄 **Contenu du document');

  if (isFileContextMessage) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-4xl w-full">
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 overflow-hidden">
            {/* En-tête pliable */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Document en contexte
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Contenu extrait et disponible pour l'IA
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* Contenu pliable */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800">
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg max-h-60 overflow-y-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Réponse IA normale
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-4xl w-full">
        <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  Assistant IA
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasFileContext && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                  📄 Contexte
                </span>
              )}
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Copier la réponse"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-4 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {content}
              </p>
            </div>
          </div>

          {/* Métadonnées */}
          {metadata && (metadata.executionTime || metadata.securityScore !== undefined) && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {metadata.executionTime && (
                  <span>⏱️ {metadata.executionTime}ms</span>
                )}
                {metadata.securityScore !== undefined && (
                  <span>🔒 Sécurité: {(metadata.securityScore * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
