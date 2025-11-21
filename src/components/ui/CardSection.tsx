import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardSectionProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  children: React.ReactNode;
  darkMode?: boolean;
  className?: string;
}

export function CardSection({ 
  title, 
  icon: Icon, 
  description, 
  children, 
  darkMode = false,
  className = ''
}: CardSectionProps) {
  return (
    <div className={`
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      border rounded-2xl p-8 space-y-6 transition-all duration-200 hover:shadow-lg
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className={`
          p-3 rounded-xl
          ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}
        `}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          {description && (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
