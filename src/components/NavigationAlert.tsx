import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface NavigationAlertProps {
  show: boolean;
  message: string;
  type?: 'error' | 'warning' | 'info';
  onClose: () => void;
}

export default function NavigationAlert({ 
  show, 
  message, 
  type = 'error', 
  onClose 
}: NavigationAlertProps) {
  if (!show) return null;

  const bgColor = {
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
  }[type];

  const textColor = {
    error: 'text-red-700 dark:text-red-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300'
  }[type];

  const iconColor = {
    error: 'text-red-500 dark:text-red-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    info: 'text-blue-500 dark:text-blue-400'
  }[type];

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 border rounded-lg shadow-lg z-50 ${bgColor}`}>
      <div className="flex items-start">
        <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            Problème de navigation
          </p>
          <p className={`text-sm mt-1 ${textColor}`}>
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`ml-3 flex-shrink-0 ${textColor} hover:opacity-75`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}