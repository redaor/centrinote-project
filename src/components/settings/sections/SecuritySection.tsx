/**
 * Section Sécurité & Support
 * Conformément au cahier des charges - Section 4
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, HelpCircle, Trash2 } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { ConfirmModal } from '../modals/ConfirmModal';

interface SecuritySectionProps {
  onLogout: () => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  isLoading?: boolean;
  isDark?: boolean;
}

export function SecuritySection({
  onLogout,
  onDeleteAccount,
  isLoading = false,
  isDark = false
}: SecuritySectionProps) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleLogout = async () => {
    try {
      await onLogout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async (input?: string) => {
    if (!input) return;

    try {
      await onDeleteAccount(input);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete account error:', error);
      throw error; // Repropager l'erreur pour que la modale puisse l'afficher
    }
  };

  const handleHelpClick = () => {
    // Naviguer vers la page d'aide interne
    navigate('/help');
  };

  return (
    <>
      <SettingsCard
        icon={Shield}
        title="Sécurité & Support"
        description="Gérez la sécurité de votre compte et obtenez de l'aide"
        isDark={isDark}
      >
        <div className="space-y-6">
          {/* Actions de sécurité */}
          <div className="space-y-3">
            {/* Déconnexion */}
            <button
              id="logout-button"
              name="logout"
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 rounded-lg border
                font-medium transition-all duration-200
                ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                focus:outline-none focus:ring-4 focus:ring-blue-500/20
                transform hover:scale-[1.02] active:scale-[0.98]
              `}
              aria-label="Se déconnecter de votre compte"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span>Se déconnecter</span>
              </div>
            </button>

            {/* Aide & Support */}
            <button
              id="help-button"
              name="help"
              type="button"
              onClick={handleHelpClick}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 rounded-lg border
                font-medium transition-all duration-200
                ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                focus:outline-none focus:ring-4 focus:ring-blue-500/20
                transform hover:scale-[1.02] active:scale-[0.98]
              `}
              aria-label="Ouvrir l'aide et le support"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5" />
                <span>Aide & Support</span>
              </div>
            </button>
          </div>

          {/* Zone de danger */}
          <div
            className={`
              pt-6 border-t
              ${isDark ? 'border-gray-700' : 'border-gray-200'}
            `}
          >
            <h3
              className={`
                text-sm font-semibold mb-4
                ${isDark ? 'text-red-400' : 'text-red-600'}
              `}
            >
              Zone de danger
            </h3>

            <button
              id="delete-account-button"
              name="delete-account"
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 rounded-lg border
                font-medium transition-all duration-200
                ${isDark
                  ? 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                focus:outline-none focus:ring-4 focus:ring-red-500/20
                transform hover:scale-[1.02] active:scale-[0.98]
              `}
              aria-label="Supprimer définitivement votre compte"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5" />
                <span>Supprimer mon compte</span>
              </div>
            </button>

            <p
              className={`
                text-xs mt-3
                ${isDark ? 'text-gray-500' : 'text-gray-500'}
              `}
            >
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Modales */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Se déconnecter"
        message="Êtes-vous sûr de vouloir vous déconnecter de votre compte ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        type="info"
        isLoading={isLoading}
        isDark={isDark}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Supprimer le compte"
        message="Cette action est irréversible. Toutes vos données seront définitivement supprimées."
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        type="danger"
        requireInput
        inputLabel="Tapez 'SUPPRIMER' pour confirmer"
        inputPlaceholder="SUPPRIMER"
        inputValidation="SUPPRIMER"
        isLoading={isLoading}
        isDark={isDark}
      />
    </>
  );
}
