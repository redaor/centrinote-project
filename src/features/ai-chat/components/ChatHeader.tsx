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
}

/**
 * Composant ChatHeader
 */
export function ChatHeader({
  mode,
  onModeChange,
  isReady,
  contextStats,
}: ChatHeaderProps) {
  return (
    <motion.div
      className="flex-shrink-0 bg-white dark:bg-gray-900 px-6 py-4"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header principal : Logo + Titre + Statut discret */}
      <div className="flex items-center justify-between">
        {/* Logo + Titre Noteo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Noteo
          </h1>
        </div>

        {/* Onglets discrets à droite */}
        <div className="flex items-center gap-1.5">
          {/* Onglet Conversation */}
          <button
            onClick={() => onModeChange('chat')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              mode === 'chat'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            <span>Chat</span>
          </button>

          {/* Onglet Analyseur */}
          <button
            onClick={() => onModeChange('analyze')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              mode === 'analyze'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Search className="w-3 h-3" />
            <span>Analyser</span>
          </button>

          {/* Indicateur de statut discret */}
          {isReady && (
            <div className="ml-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Prêt</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
