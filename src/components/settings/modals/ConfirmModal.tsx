/**
 * Modale de confirmation
 * Conformément au cahier des charges - Section 5.5
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input?: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValidation?: string;
  isLoading?: boolean;
  isDark?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'info',
  requireInput = false,
  inputLabel,
  inputPlaceholder,
  inputValidation,
  isLoading = false,
  isDark = false
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Réinitialiser l'input à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setError(null);
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Gestion de la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Bloquer le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleConfirm = async () => {
    if (requireInput && inputValidation) {
      if (inputValue !== inputValidation) {
        setError(`Veuillez taper "${inputValidation}" pour confirmer`);
        return;
      }
    }

    setError(null);
    try {
      await onConfirm(inputValue);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  const iconMap = {
    info: Info,
    warning: AlertTriangle,
    danger: AlertCircle
  };

  const Icon = iconMap[type];

  const colorMap = {
    info: 'text-blue-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500'
  };

  const buttonColorMap = {
    info: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500/20',
    warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500/20',
    danger: 'bg-red-500 hover:bg-red-600 focus:ring-red-500/20'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full max-w-md
          rounded-2xl shadow-2xl
          ${isDark ? 'bg-gray-800' : 'bg-white'}
          p-6
          animate-scaleIn
          transform transition-all duration-200
        `}
      >
        {/* Bouton fermer */}
        <button
          ref={firstFocusableRef}
          onClick={onClose}
          disabled={isLoading}
          className={`
            absolute top-4 right-4
            p-2 rounded-lg
            transition-colors
            ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            focus:outline-none focus:ring-4 focus:ring-blue-500/20
          `}
          aria-label="Fermer"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icône */}
        <div className="flex justify-center mb-4">
          <div
            className={`
              p-3 rounded-full
              ${type === 'info' ? 'bg-blue-100 dark:bg-blue-500/10' : ''}
              ${type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-500/10' : ''}
              ${type === 'danger' ? 'bg-red-100 dark:bg-red-500/10' : ''}
            `}
          >
            <Icon className={`w-6 h-6 ${colorMap[type]}`} />
          </div>
        </div>

        {/* Titre */}
        <h2
          id="modal-title"
          className={`
            text-xl font-bold text-center mb-2
            ${isDark ? 'text-white' : 'text-gray-900'}
          `}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          id="modal-description"
          className={`
            text-center mb-6
            ${isDark ? 'text-gray-400' : 'text-gray-600'}
          `}
        >
          {message}
        </p>

        {/* Input si requis */}
        {requireInput && (
          <div className="mb-6">
            {inputLabel && (
              <label
                className={`
                  block text-sm font-medium mb-2
                  ${isDark ? 'text-gray-300' : 'text-gray-700'}
                `}
              >
                {inputLabel}
              </label>
            )}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              className={`
                w-full px-4 py-3 rounded-lg border
                ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
                }
                focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                transition-all
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'input-error' : undefined}
            />
            {error && (
              <p
                id="input-error"
                className="text-sm text-red-500 mt-2"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-3 rounded-lg
              font-medium
              ${isDark
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-gray-500/20
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              transform hover:scale-105 active:scale-95
            `}
            style={{ minHeight: '44px' }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-3 rounded-lg
              font-medium text-white
              ${buttonColorMap[type]}
              transition-all duration-200
              focus:outline-none focus:ring-4
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              transform hover:scale-105 active:scale-95
            `}
            style={{ minHeight: '44px' }}
          >
            {isLoading ? 'Chargement...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
