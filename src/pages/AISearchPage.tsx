/**
 * Page de recherche et chat IA
 * Point d'entrée principal pour l'IA générative dans Centrinote
 *
 * Utilise React.lazy + Suspense pour charger le chat IA de manière optimisée
 */

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import { AIChat } from '../features/ai-chat';

/**
 * Fallback de chargement élégant pour AIChat
 */
function AIChatLoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Icône Brain avec animation */}
        <motion.div
          className="relative"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-xl opacity-40 animate-pulse" />
          <div className="relative p-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full">
            <Brain className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Texte de chargement */}
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
            Chargement de Noteo...
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Page AISearchPage
 */
export function AISearchPage() {
  return (
    <div className="h-full w-full" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={<AIChatLoadingFallback />}>
        <AIChat />
      </Suspense>
    </div>
  );
}

export default AISearchPage;

