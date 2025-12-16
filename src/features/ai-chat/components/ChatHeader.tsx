/**
 * Composant: ChatHeader
 *
 * Header du chat IA avec:
 * - Titre "Noteo" avec icône Brain animée
 * - Badge de sécurité (100%)
 * - Onglets Conversation / Analyseur
 * - Indicateur de statut (Prêt / Initialisation...)
 * - Compteur de contexte (X éléments)
 * - Animations framer-motion
 *
 * Composant présentationnel pur (aucun état, aucun appel API).
 * Tous les événements sont gérés via callbacks.
 *
 * @example
 * <ChatHeader
 *   mode="chat"
 *   onModeChange={setMode}
 *   isReady={true}
 *   contextStats={{ totalEntries: 42 }}
 *   darkMode={false}
 * />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, MessageCircle, Search } from 'lucide-react';

/**
 * Context stats interface
 */
interface ContextStats {
  totalEntries: number;
}

/**
 * Props du composant ChatHeader
 */
interface ChatHeaderProps {
  /** Mode actuel (chat ou analyze) */
  mode: 'chat' | 'analyze';
  /** Callback pour changement de mode */
  onModeChange: (mode: 'chat' | 'analyze') => void;
  /** IA prête */
  isReady: boolean;
  /** Statistiques du contexte */
  contextStats: ContextStats;
  /** Mode sombre activé */
  darkMode: boolean;
}

/**
 * Composant ChatHeader
 */
export function ChatHeader({
  mode,
  onModeChange,
  isReady,
  contextStats,
  darkMode,
}: ChatHeaderProps) {
  return (
    <motion.div
      className="flex-shrink-0 border-b border-slate-200/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Titre avec icône et Badge Sécurité */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
        {/* Titre avec icône */}
        <div className="flex items-center gap-2">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-md opacity-30 animate-pulse" />
            <div className="relative p-1 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
          </motion.div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">
            Noteo
          </h1>
        </div>

        {/* Badge Sécurité */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Shield className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">100%</span>
          </div>
        </div>
      </div>

      {/* Onglets et Indicateur de Statut */}
      <div className="flex items-center justify-between px-2 pb-1.5">
        <div className="flex items-center gap-2">
          {/* Onglet Conversation */}
          <motion.button
            onClick={() => onModeChange('chat')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              mode === 'chat'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageCircle className={`w-3.5 h-3.5 ${mode === 'chat' ? 'text-white' : ''}`} />
            <span>Conversation</span>
            {mode === 'chat' && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-md"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>

          {/* Onglet Analyseur */}
          <motion.button
            onClick={() => onModeChange('analyze')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              mode === 'analyze'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Search className={`w-3.5 h-3.5 ${mode === 'analyze' ? 'text-white' : ''}`} />
            <span>Analyseur</span>
            {mode === 'analyze' && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-md"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        </div>

        {/* Indicateur de Statut */}
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${
              isReady ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            animate={{
              scale: isReady ? [1, 1.2, 1] : [1, 1.3, 1],
              opacity: isReady ? [1, 0.8, 1] : [1, 0.6, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-slate-600 dark:text-gray-400">
            {isReady ? 'Prêt' : 'Initialisation...'}
          </span>
          {contextStats.totalEntries > 0 && (
            <span className="text-xs text-slate-500 dark:text-gray-500">
              • {contextStats.totalEntries} éléments
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
