/**
 * Hook personnalisé pour gérer les paramètres utilisateur
 * Conformément au cahier des charges - Section 8
 */

import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settings/settingsService';
import {
  SettingsState,
  ProfileUpdate,
  AppearanceUpdate,
  NotificationUpdate,
  SecurityUpdate
} from '../../types/settings.types';

interface UseSettingsReturn {
  settings: SettingsState | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  updateAppearance: (updates: AppearanceUpdate) => Promise<void>;
  updateNotifications: (updates: NotificationUpdate) => Promise<void>;
  updateSecurity: (updates: SecurityUpdate) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteAvatar: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;

  // Helpers
  refresh: () => Promise<void>;
}

export function useSettings(userId?: string): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge les paramètres
   */
  const loadSettings = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await settingsService.getSettings(userId);
      setSettings(data);
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Charge les paramètres au montage
   */
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /**
   * Met à jour le profil avec optimistic update
   */
  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    if (!userId || !settings) return;

    // Optimistic update
    const previousSettings = settings;
    setSettings({
      ...settings,
      profile: { ...settings.profile, ...updates }
    });

    try {
      await settingsService.updateProfile(userId, updates);
    } catch (err: any) {
      // Rollback en cas d'erreur
      setSettings(previousSettings);
      setError(err.message);
      throw err;
    }
  }, [userId, settings]);

  /**
   * Met à jour l'apparence avec optimistic update
   */
  const updateAppearance = useCallback(async (updates: AppearanceUpdate) => {
    if (!userId || !settings) return;

    const previousSettings = settings;
    setSettings({
      ...settings,
      appearance: { ...settings.appearance, ...updates }
    });

    try {
      await settingsService.updateAppearance(userId, updates);
    } catch (err: any) {
      setSettings(previousSettings);
      setError(err.message);
      throw err;
    }
  }, [userId, settings]);

  /**
   * Met à jour les notifications avec optimistic update
   */
  const updateNotifications = useCallback(async (updates: NotificationUpdate) => {
    if (!userId || !settings) return;

    const previousSettings = settings;
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, ...updates }
    });

    try {
      await settingsService.updateNotifications(userId, updates);
    } catch (err: any) {
      setSettings(previousSettings);
      setError(err.message);
      throw err;
    }
  }, [userId, settings]);

  /**
   * Met à jour la sécurité avec optimistic update
   */
  const updateSecurity = useCallback(async (updates: SecurityUpdate) => {
    if (!userId || !settings) return;

    const previousSettings = settings;
    setSettings({
      ...settings,
      security: { ...settings.security, ...updates }
    });

    try {
      await settingsService.updateSecurity(userId, updates);
    } catch (err: any) {
      setSettings(previousSettings);
      setError(err.message);
      throw err;
    }
  }, [userId, settings]);

  /**
   * Upload un avatar (sans mise à jour automatique du profil)
   */
  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    if (!userId) throw new Error('User ID required');

    setIsLoading(true);
    setError(null);

    try {
      const avatarUrl = await settingsService.uploadAvatar(userId, file);
      console.log('[useSettings] Avatar uploaded, URL:', avatarUrl);
      // Ne pas faire d'updateProfile automatique ici
      return avatarUrl;
    } catch (err: any) {
      console.error('[useSettings] Error uploading avatar:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Supprime l'avatar
   */
  const deleteAvatar = useCallback(async () => {
    if (!userId || !settings?.profile.avatarUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      await settingsService.deleteAvatar(userId, settings.profile.avatarUrl);
      await updateProfile({ avatarUrl: undefined });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId, settings, updateProfile]);

  /**
   * Déconnexion
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Le service logout gère maintenant les erreurs gracieusement
      // Il nettoie toujours le localStorage même si l'API échoue
      await settingsService.logout();
    } catch (err: any) {
      // Ne pas bloquer la déconnexion même en cas d'erreur
      // Le service a déjà nettoyé le localStorage
      console.warn('⚠️ Erreur déconnexion (nettoyage effectué):', err);
      setError(null); // Ne pas afficher d'erreur à l'utilisateur
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Suppression du compte
   */
  const deleteAccount = useCallback(async (password: string) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      await settingsService.deleteAccount(userId, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Rafraîchit les paramètres
   */
  const refresh = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    updateProfile,
    updateAppearance,
    updateNotifications,
    updateSecurity,
    uploadAvatar,
    deleteAvatar,
    logout,
    deleteAccount,
    refresh
  };
}
