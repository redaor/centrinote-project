/**
 * Section Profil
 * Conformément au cahier des charges - Section 4
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { AvatarUploader } from '../ui/AvatarUploader';
import { UserProfile } from '../../../types/settings.types';
import { useApp } from '../../../contexts/AppContext';

interface ProfileSectionProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string>;
  onDeleteAvatar?: () => Promise<void>;
  isDark?: boolean;
}

export function ProfileSection({
  profile,
  onUpdateProfile,
  onUploadAvatar,
  onDeleteAvatar,
  isDark = false
}: ProfileSectionProps) {
  const { dispatch } = useApp();
  const [name, setName] = useState(profile.name);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialProfileName = useRef(profile.name);

  // Synchroniser l'état local avec le profil uniquement au montage initial
  useEffect(() => {
    initialProfileName.current = profile.name;
    setName(profile.name);
    setHasChanges(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Réinitialiser les états après une sauvegarde réussie
  useEffect(() => {
    if (saveSuccess) {
      // Attendre un tick pour que le DOM soit mis à jour
      const timeoutId = setTimeout(() => {
        initialProfileName.current = name;
        setAvatarFile(null);
        setHasChanges(false);

        if (import.meta.env.DEV) {
          console.log('[ProfileSection] States cleared after successful save');
        }

        // Cacher le message de succès après 3 secondes
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [saveSuccess, name]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setName(newValue);
    // Comparer avec la valeur initiale sauvegardée, pas avec profile.name
    const hasActualChanges = newValue.trim() !== initialProfileName.current.trim();
    setHasChanges(hasActualChanges);
    
    // Debug en développement
    if (import.meta.env.DEV) {
      console.log('[ProfileSection] Name changed:', {
        newValue,
        initialName: initialProfileName.current,
        hasChanges: hasActualChanges
      });
    }
    
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveName = async () => {
    // Vérifier s'il y a des changements à sauvegarder
    const nameChanged = name.trim() !== initialProfileName.current.trim();

    if (!nameChanged && !avatarFile) {
      // Aucun changement détecté
      return;
    }

    setIsUpdating(true);
    setSaveError(null);

    // Debug
    if (import.meta.env.DEV) {
      console.log('[ProfileSection] Starting save process:', {
        nameChanged,
        hasAvatarFile: !!avatarFile,
        currentName: name.trim(),
        currentAvatarUrl: profile.avatarUrl
      });
    }

    try {
      let newAvatarUrl = profile.avatarUrl;

      // Téléverser l'avatar si sélectionné
      if (avatarFile) {
        console.log('[ProfileSection] Uploading avatar file...');
        newAvatarUrl = await onUploadAvatar(avatarFile);
        console.log('[ProfileSection] Avatar uploaded:', newAvatarUrl);
      }

      // Mettre à jour le profil avec nom et/ou avatar
      const updates: any = {};
      if (nameChanged) {
        updates.name = name.trim();
      }
      if (avatarFile && newAvatarUrl) {
        updates.avatarUrl = newAvatarUrl;
      }

      // Enregistrer les modifications
      if (Object.keys(updates).length > 0) {
        console.log('[ProfileSection] Updating profile with:', updates);
        await onUpdateProfile(updates);
      }

      // Mettre à jour le contexte global AVANT de réinitialiser les états
      dispatch({
        type: 'UPDATE_USER_PROFILE',
        payload: {
          name: nameChanged ? name.trim() : profile.name,
          avatar: newAvatarUrl
        }
      });

      // Marquer la sauvegarde comme réussie
      // Les états seront réinitialisés par le useEffect
      setSaveSuccess(true);

      console.log('[ProfileSection] Save completed successfully');
    } catch (error: any) {
      console.error('[ProfileSection] Save error:', error);

      // Rollback en cas d'erreur
      setName(initialProfileName.current);
      setAvatarFile(null);
      setHasChanges(false);
      setSaveError(error.message || 'Erreur lors de la sauvegarde');

      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Gérer la sélection de fichier avatar
  const handleAvatarFileSelect = async (file: File) => {
    setAvatarFile(file);
    setHasChanges(true);

    // Debug
    if (import.meta.env.DEV) {
      console.log('[ProfileSection] Avatar file selected:', file.name, file.size);
    }
  };

  // Suppression de l'enregistrement automatique pour éviter les conflits
  // const handleNameBlur = () => {
  //   if (hasChanges) {
  //     handleSaveName();
  //   }
  // };

  const planLabels = {
    free: 'Gratuit',
    basic: 'Basique',
    premium: 'Premium'
  };

  return (
    <SettingsCard
      icon={User}
      title="Profil"
      description="Gérez vos informations personnelles"
      isDark={isDark}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        {/* Avatar */}
        <AvatarUploader
          currentAvatar={profile.avatarUrl}
          userName={profile.name}
          onUpload={handleAvatarFileSelect}
          isDark={isDark}
          hasPendingFile={!!avatarFile}
          clearPreview={saveSuccess}
        />

        {/* Informations */}
        <div className="flex-1 w-full space-y-6">
          {/* Nom complet */}
          <div>
            <label
              htmlFor="profile-name"
              className={`
                block text-sm font-medium mb-2
                ${isDark ? 'text-gray-300' : 'text-gray-700'}
              `}
            >
              Nom complet
            </label>
            <div className="flex gap-2">
              <input
                id="profile-name"
                name="full-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                disabled={isUpdating}
                autoComplete="name"
                className={`
                  flex-1 px-4 py-3 rounded-lg border
                  ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-4 focus:ring-blue-500/20
                  transition-all
                  ${isUpdating ? 'opacity-50 cursor-wait' : ''}
                `}
                placeholder="Votre nom complet"
                aria-label="Nom complet"
              />
              <button
                onClick={handleSaveName}
                disabled={!hasChanges || isUpdating || !name.trim()}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all
                  ${!hasChanges || isUpdating || !name.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95'
                  }
                  ${isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                  focus:outline-none focus:ring-4 focus:ring-blue-500/20
                `}
                style={{ minHeight: '44px', minWidth: '100px' }}
                aria-label="Enregistrer le nom"
                data-testid="save-button"
                title={!hasChanges ? 'Aucune modification' : 'Enregistrer les modifications'}
              >
                {isUpdating ? 'En cours...' : 'Enregistrer'}
              </button>
            </div>
            {saveSuccess && (
              <p className="text-sm text-green-500 mt-2" role="status">
                ✓ Nom mis à jour avec succès
              </p>
            )}
            {saveError && (
              <p className="text-sm text-red-500 mt-2" role="alert">
                ✗ {saveError}
              </p>
            )}
          </div>

          {/* Email (lecture seule) */}
          <div>
            <label
              htmlFor="profile-email"
              className={`
                block text-sm font-medium mb-2
                ${isDark ? 'text-gray-300' : 'text-gray-700'}
              `}
            >
              Email
            </label>
            <input
              id="profile-email"
              name="email"
              type="email"
              value={profile.email}
              readOnly
              autoComplete="email"
              className={`
                w-full px-4 py-3 rounded-lg border cursor-not-allowed
                ${isDark
                  ? 'bg-gray-700/50 border-gray-600 text-gray-400'
                  : 'bg-gray-50 border-gray-300 text-gray-500'
                }
              `}
              aria-label="Adresse email (lecture seule)"
              aria-readonly="true"
            />
            <p
              className={`
                text-xs mt-2
                ${isDark ? 'text-gray-500' : 'text-gray-500'}
              `}
            >
              L'email ne peut pas être modifié pour des raisons de sécurité
            </p>
          </div>

          {/* Plan */}
          <div>
            <label
              className={`
                block text-sm font-medium mb-2
                ${isDark ? 'text-gray-300' : 'text-gray-700'}
              `}
            >
              Plan d'abonnement
            </label>
            <div
              className={`
                inline-flex px-4 py-2 rounded-lg
                ${profile.plan === 'premium'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : profile.plan === 'basic'
                    ? isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                    : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }
                font-medium
              `}
              role="status"
              aria-label={`Plan actuel: ${planLabels[profile.plan]}`}
            >
              {planLabels[profile.plan]}
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
