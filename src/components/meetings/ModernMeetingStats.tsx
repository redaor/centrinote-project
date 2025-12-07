/**
 * Composant moderne pour afficher les statistiques de réunions
 * Design élégant avec animations fluides
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Video, Clock, Users } from 'lucide-react';

export interface MeetingStatsProps {
  total: number;
  active: number;
  completed: number;
  weekly: number;
  darkMode?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  number: number;
  label: string;
  emoji: string;
  color: string;
  darkMode?: boolean;
  index: number;
}

const StatCard = ({ icon, number, label, emoji, color, darkMode = false, index }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={`
        relative overflow-hidden rounded-lg p-4
        ${darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        shadow-sm hover:shadow-md
        transition-all duration-200
        cursor-pointer
      `}
    >
      {/* Gradient background effect */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}
      />
      
      <div className="relative flex flex-col items-center text-center">
        {/* Emoji icon */}
        <motion.div
          className="text-2xl mb-2"
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 5
          }}
        >
          {emoji}
        </motion.div>
        
        {/* Number */}
        <motion.div
          className={`
            text-2xl font-bold mb-0.5
            ${darkMode ? 'text-white' : 'text-gray-900'}
          `}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: index * 0.05 + 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          {number}
        </motion.div>
        
        {/* Label */}
        <div className={`
          text-xs font-medium
          ${darkMode ? 'text-gray-400' : 'text-gray-600'}
        `}>
          {label}
        </div>
      </div>
      
      {/* Decorative icon in corner */}
      <div className="absolute top-1.5 right-1.5 opacity-5">
        <div className="w-4 h-4">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

export function ModernMeetingStats({
  total,
  active,
  completed,
  weekly,
  darkMode = false
}: MeetingStatsProps) {
  const stats = [
    {
      emoji: '📈',
      number: total,
      label: 'Total',
      icon: <Calendar className="w-5 h-5" />,
      color: '#3b82f6'
    },
    {
      emoji: '🎥',
      number: active,
      label: 'Actives',
      icon: <Video className="w-5 h-5" />,
      color: '#10b981'
    },
    {
      emoji: '✅',
      number: completed,
      label: 'Terminées',
      icon: <Clock className="w-5 h-5" />,
      color: '#6b7280'
    },
    {
      emoji: '📅',
      number: weekly,
      label: 'Cette semaine',
      icon: <Users className="w-5 h-5" />,
      color: '#8b5cf6'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        rounded-xl p-4 mb-6
        ${darkMode
          ? 'bg-gray-800/50 border border-gray-700'
          : 'bg-white border border-gray-200'
        }
        shadow-sm
      `}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className={`
          text-base font-semibold mb-0.5
          ${darkMode ? 'text-white' : 'text-gray-900'}
        `}>
          📊 Statistiques de Réunions
        </h3>
        <p className={`
          text-xs
          ${darkMode ? 'text-gray-400' : 'text-gray-600'}
        `}>
          Vue d'ensemble de vos réunions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            number={stat.number}
            label={stat.label}
            emoji={stat.emoji}
            color={stat.color}
            darkMode={darkMode}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}

