/**
 * Composant pour afficher un message segmenté avec horodatage et emoji
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChatSegment } from '../../hooks/useChatSegmentation';
import { ActionButton } from './ActionButton';

interface SegmentedMessageProps {
  segment: ChatSegment;
  index: number;
  darkMode?: boolean;
}

export function SegmentedMessage({ segment, index, darkMode = false }: SegmentedMessageProps) {
  return (
    <motion.div
      className={`flex justify-start gap-3 mb-3`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {/* Avatar avec emoji */}
      <motion.div
        className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-md text-lg"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {segment.emoji}
      </motion.div>

      {/* Contenu du message */}
      <div className="flex-1 max-w-[70%] md:max-w-[75%]">
        <motion.div
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm relative pl-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
            style={{
              background: 'linear-gradient(to bottom, #60a5fa, #a78bfa)'
            }}
          />
          {/* Horodatage */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {segment.time}
            </span>
          </div>

          {/* Contenu textuel */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {segment.content}
          </div>

          {/* Bouton d'action si présent */}
          {segment.isAction && segment.actionData && (
            <div className="mt-3">
              <ActionButton
                emoji={segment.emoji}
                text={segment.actionData.text}
                hint={segment.actionData.hint}
                onClick={segment.actionData.onClick}
                darkMode={darkMode}
              />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}


