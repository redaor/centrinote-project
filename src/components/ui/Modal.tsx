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
  // Gestion fermeture avec ESC et blocage du scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    // Bloquer le scroll sur la page en arrière-plan
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const modalContent = document.querySelector('.modal-scrollable-content');

      // Autoriser le scroll uniquement si l'événement vient du contenu du modal
      if (modalContent && !modalContent.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isOpen) {
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;

      // Empêcher le scroll du body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Ajouter les écouteurs d'événements pour bloquer le scroll
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      // Restaurer le scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';

      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }

      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
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

          {/* Content - Scrollable container avec meilleure gestion de la hauteur */}
          <div className="modal-scrollable-content overflow-y-auto flex-1 overscroll-contain">
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