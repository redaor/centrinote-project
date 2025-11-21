import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModalConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  requireInput?: boolean;
  inputPlaceholder?: string;
  inputLabel?: string;
  darkMode?: boolean;
  isLoading?: boolean;
}

export function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning',
  requireInput = false,
  inputPlaceholder = '',
  inputLabel = '',
  darkMode = false,
  isLoading = false
}: ModalConfirmProps) {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(!requireInput);

  useEffect(() => {
    if (requireInput) {
      setIsValid(inputValue.trim().length > 0);
    }
  }, [inputValue, requireInput]);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsValid(!requireInput);
    }
  }, [isOpen, requireInput]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-50 dark:bg-red-900/20',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'info':
        return {
          icon: CheckCircle,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-50 dark:bg-blue-900/20',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  const handleConfirm = () => {
    if (isValid && !isLoading) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className={`
          relative w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}
          rounded-2xl shadow-2xl border ${styles.borderColor}
          animate-scale-in
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${styles.iconBg}`}>
              <Icon className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <h2 
              id="modal-title"
              className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {title}
            </h2>
          </div>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }
              ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p 
            id="modal-description"
            className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
          >
            {message}
          </p>

          {requireInput && (
            <div>
              <label 
                htmlFor="confirm-input"
                className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {inputLabel}
              </label>
              <input
                id="confirm-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                autoComplete="off"
                className={`
                  w-full px-3 py-2 rounded-lg border transition-colors
                  ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${darkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }
              ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className={`
              px-4 py-2 rounded-lg font-medium text-white transition-colors
              ${styles.confirmBg}
              ${!isValid || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Chargement...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
