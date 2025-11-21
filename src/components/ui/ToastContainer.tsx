// 🍞 Container pour afficher les toasts avec animations
import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Toast } from '../../hooks/useToasts';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  darkMode?: boolean;
}

const ToastIcon = ({ type }: { type: Toast['type'] }) => {
  const iconClass = "w-5 h-5";
  
  switch (type) {
    case 'success':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'error':
      return <XCircle className={`${iconClass} text-red-500`} />;
    case 'warning':
      return <AlertCircle className={`${iconClass} text-yellow-500`} />;
    case 'info':
    default:
      return <Info className={`${iconClass} text-blue-500`} />;
  }
};

const getToastStyles = (type: Toast['type'], darkMode: boolean) => {
  const base = darkMode ? 'text-white' : 'text-gray-900';
  
  switch (type) {
    case 'success':
      return darkMode 
        ? 'bg-green-900/90 border-green-700' 
        : 'bg-green-50 border-green-200';
    case 'error':
      return darkMode 
        ? 'bg-red-900/90 border-red-700' 
        : 'bg-red-50 border-red-200';
    case 'warning':
      return darkMode 
        ? 'bg-yellow-900/90 border-yellow-700' 
        : 'bg-yellow-50 border-yellow-200';
    case 'info':
    default:
      return darkMode 
        ? 'bg-blue-900/90 border-blue-700' 
        : 'bg-blue-50 border-blue-200';
  }
};

export function ToastContainer({ toasts, onRemove, darkMode = false }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${getToastStyles(toast.type, darkMode)}`}
        >
          <div className="flex items-start space-x-3">
            <ToastIcon type={toast.type} />
            
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {toast.title}
              </div>
              {toast.message && (
                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {toast.message}
                </div>
              )}
            </div>

            <button
              onClick={() => onRemove(toast.id)}
              className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}