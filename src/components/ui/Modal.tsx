import React, { useEffect, useRef } from 'react';
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

// 3. Compteur d'instances de modales ouvertes (pour empilement)
let openModalCount = 0;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true
}: ModalProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Gestion fermeture avec ESC et blocage COMPLET du scroll
  useEffect(() => {
    if (!isOpen) return;

    // 3. Incrémenter le compteur de modales ouvertes
    openModalCount++;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 2. Remplacer position:fixed par classe toggle sur <html>
    // Ajouter la classe .modal-open sur <html>
    document.documentElement.classList.add('modal-open');

    // Ajouter le style global si pas déjà présent
    if (!document.getElementById('modal-open-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-open-styles';
      style.textContent = `
        .modal-open body {
          max-height: 100vh;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          pointer-events: none;
        }
        .modal-open .modal-inner {
          pointer-events: auto;
          user-select: auto;
          -webkit-user-select: auto;
          -moz-user-select: auto;
          -ms-user-select: auto;
        }
      `;
      document.head.appendChild(style);
    }

    // Écouter ESC
    document.addEventListener('keydown', handleEscape);

    return () => {
      // 3. Décrémenter le compteur
      openModalCount--;

      // 2. Ne retirer la classe que si aucune modale n'est ouverte
      if (openModalCount === 0) {
        document.documentElement.classList.remove('modal-open');
      }

      document.removeEventListener('keydown', handleEscape);
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
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{
          pointerEvents: 'auto',
          isolation: 'isolate'
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container - Centré avec padding responsive */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-none"
        onClick={handleBackdropClick}
      >
        <div
          className={`
            relative w-full
            bg-white dark:bg-gray-800
            shadow-2xl transition-all duration-300
            ${sizeClasses[size]}
            rounded-2xl
            max-h-[90vh]
            flex flex-col
            animate-in fade-in zoom-in-95 duration-300
            pointer-events-auto
          `}
          onClick={(e) => e.stopPropagation()}
        >

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

          {/* Content - 1. Scrollable container avec overscroll-behavior: contain */}
          <div
            ref={modalContentRef}
            className="modal-inner overflow-y-auto flex-1"
            style={{
              overscrollBehavior: 'contain',
              pointerEvents: 'auto',
              userSelect: 'auto'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using React Portal to ensure it's rendered outside the DOM hierarchy
  // ✅ PATCH: Utiliser un conteneur dédié pour éviter les collisions avec d'autres portails
  const modalContainer = document.getElementById('modals');
  if (!modalContainer) {
    console.error('❌ Conteneur #modals non trouvé dans index.html');
    return null;
  }
  return createPortal(modalContent, modalContainer);
}
