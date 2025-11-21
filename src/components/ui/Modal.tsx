import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true
}: ModalProps) {
  // Gestion fermeture avec ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Empêcher scroll du body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container - Centré avec padding responsive */}
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
        <div className={`
          relative w-full
          bg-white dark:bg-gray-800
          shadow-2xl transition-all duration-300
          ${sizeClasses[size]}
          rounded-2xl
          max-h-[95vh]
          flex flex-col
          animate-in fade-in zoom-in-95 duration-300
        `}>

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}

          {/* Content - Scrollable container avec meilleure gestion de la hauteur */}
          <div className="overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using React Portal to ensure it's rendered outside the DOM hierarchy
  return createPortal(modalContent, document.body);
}