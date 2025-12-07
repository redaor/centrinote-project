/**
 * Composant pour les boutons d'action rapides dans le chat
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
  emoji: string;
  text: string;
  hint?: string;
  onClick: () => void;
  darkMode?: boolean;
}

export function ActionButton({ 
  emoji, 
  text, 
  hint, 
  onClick, 
  darkMode = false 
}: ActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg
        transition-all duration-200
        ${darkMode
          ? 'bg-gray-700 hover:bg-gray-600 text-white'
          : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
        }
        shadow-sm hover:shadow-md
      `}
      whileHover={{ 
        scale: 1.02,
        y: -2,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      {/* Emoji */}
      <span className="text-xl flex-shrink-0">{emoji}</span>
      
      {/* Texte et hint */}
      <div className="flex-1 text-left">
        <div className={`font-medium text-sm ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}>
          {text}
        </div>
        {hint && (
          <div className={`text-xs mt-0.5 ${
            darkMode ? 'text-gray-400' : 'text-slate-500'
          }`}>
            {hint}
          </div>
        )}
      </div>
    </motion.button>
  );
}

/**
 * Composant pour afficher plusieurs boutons d'action rapides
 */
interface QuickActionsProps {
  actions: Array<{
    emoji: string;
    text: string;
    hint: string;
    onClick: () => void;
  }>;
  darkMode?: boolean;
}

export function QuickActions({ actions, darkMode = false }: QuickActionsProps) {
  return (
    <div className="space-y-2 mt-4">
      <div className={`text-xs font-medium mb-2 ${
        darkMode ? 'text-gray-400' : 'text-slate-500'
      }`}>
        Actions rapides :
      </div>
      {actions.map((action, index) => (
        <ActionButton
          key={index}
          emoji={action.emoji}
          text={action.text}
          hint={action.hint}
          onClick={action.onClick}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
}

