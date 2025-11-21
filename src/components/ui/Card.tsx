import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ 
  children, 
  hover = true,
  padding = 'md',
  className = '',
  ...props 
}: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-xl shadow-sm
        ${hover ? 'hover:shadow-md hover:scale-[1.01] transition-all duration-200' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export function CardHeader({ title, subtitle, action, icon: Icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {Icon && (
          <div className="p-2 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  );
}