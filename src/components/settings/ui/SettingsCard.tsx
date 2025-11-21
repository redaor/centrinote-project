/**
 * Carte de section pour les paramètres
 * Conformément au cahier des charges - Section 5.1
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  isDark?: boolean;
}

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  isDark = false
}: SettingsCardProps) {
  return (
    <div
      className={`
        rounded-2xl border transition-all duration-200
        ${isDark
          ? 'bg-gray-800 border-gray-700 hover:shadow-xl hover:shadow-gray-900/20'
          : 'bg-white border-gray-200 hover:shadow-xl hover:shadow-gray-200/50'
        }
        p-8
        hover:scale-[1.02]
        focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500
      `}
      role="region"
      aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`
            p-3 rounded-xl
            ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}
          `}
          aria-hidden="true"
        >
          <Icon
            className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
          />
        </div>
        <div className="flex-1">
          <h2
            id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}
            className={`
              text-xl font-bold mb-1
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </h2>
          <p
            className={`
              text-sm
              ${isDark ? 'text-gray-400' : 'text-gray-600'}
            `}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
