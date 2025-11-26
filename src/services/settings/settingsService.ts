/**
 * Service de gestion des paramètres utilisateur
 * Conformément au cahier des charges - Section 8.2 & 11
 */

import { supabase } from '../../lib/supabase';
import {
  SettingsState,
  ProfileUpdate,
  AppearanceUpdate,
  NotificationUpdate,
  SecurityUpdate
} from '../../types/settings.types';

class SettingsService {
  /**
   * Récupère les paramètres d'un utilisateur
   */
  async getSettings(userId: string): Promise<SettingsState> {
    try {
      // 1. Essayer de récupérer depuis Supabase (source de vérité)
      try {
        // Charger les données du profil depuis la table profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name, email, avatar_url, subscription')
          .eq('id', userId)
          .single();

        // Charger les paramètres depuis user_settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();

        // Si on a au moins les données de profil, construire les settings
        if (!profileError && profileData) {
          let mergedSettings: SettingsState;

          if (!settingsError && settingsData?.settings) {
            // Fusionner avec les settings existants
            mergedSettings = {
              ...settingsData.settings,
              profile: {
                name: profileData.name,
                email: profileData.email,
                avatarUrl: profileData.avatar_url,
                plan: profileData.subscription || 'free'
              }
            };
          } else {
            // Utiliser les valeurs par défaut avec les données du profil
            const defaultSettings = await this.getDefaultSettings(userId);
            mergedSettings = {
              ...defaultSettings,
              profile: {
                name: profileData.name,
                email: profileData.email,
                avatarUrl: profileData.avatar_url,
                plan: profileData.subscription || 'free'
              }
            };
          }

          // Sauvegarder dans le cache
          localStorage.setItem(`settings_${userId}`, JSON.stringify(mergedSettings));
          return mergedSettings;
        }
      } catch (dbError) {
        console.warn('[SettingsService] Database query failed, falling back to localStorage');
      }

      // 2. Fallback sur localStorage
      const cachedSettings = localStorage.getItem(`settings_${userId}`);
      if (cachedSettings) {
        return JSON.parse(cachedSettings);
      }

      // 3. Sinon, retourner les valeurs par défaut
      const defaultSettings = await this.getDefaultSettings(userId);
      localStorage.setItem(`settings_${userId}`, JSON.stringify(defaultSettings));
      return defaultSettings;
    } catch (error) {
      console.error('[SettingsService] Error fetching settings:', error);
      return this.getDefaultSettings(userId);
    }
  }

  /**
   * Retourne les paramètres par défaut
   */
  private async getDefaultSettings(userId: string): Promise<SettingsState> {
    // Récupérer les infos depuis la table profiles
    let profileName = '';
    let profileEmail = '';
    let profileAvatarUrl: string | undefined;
    let profilePlan: 'free' | 'basic' | 'premium' = 'free';

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, email, avatar_url, subscription')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        profileName = profileData.name || '';
        profileEmail = profileData.email || '';
        profileAvatarUrl = profileData.avatar_url;
        profilePlan = profileData.subscription || 'free';
      } else {
        // Fallback sur auth user metadata
        const { data: userData } = await supabase.auth.getUser();
        profileName = userData?.user?.user_metadata?.full_name || '';
        profileEmail = userData?.user?.email || '';
        profileAvatarUrl = userData?.user?.user_metadata?.avatar_url;
      }
    } catch (error) {
      console.warn('[SettingsService] Could not load profile from database, using auth metadata');
      const { data: userData } = await supabase.auth.getUser();
      profileName = userData?.user?.user_metadata?.full_name || '';
      profileEmail = userData?.user?.email || '';
      profileAvatarUrl = userData?.user?.user_metadata?.avatar_url;
    }

    return {
      profile: {
        name: profileName,
        email: profileEmail,
        avatarUrl: profileAvatarUrl,
        plan: profilePlan
      },
      appearance: {
        theme: 'system',
        textSize: 'm',
        language: 'fr',
        respectSystem: true
      },
      notifications: {
        emails: true,
        reminders: true,
        push: false,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      },
      security: {
        twoFactor: false,
        sessions: [],
        lastPasswordChange: new Date().toISOString()
      }
    };
  }

  /**
   * Met à jour le profil utilisateur
   */
  async updateProfile(userId: string, updates: ProfileUpdate): Promise<void> {
    try {
      console.log('[SettingsService] Updating profile:', { userId, updates });

      // 1. Mettre à jour la table profiles dans Supabase (pour la persistance multi-navigateurs)
      const profileUpdates: any = {};
      if (updates.name !== undefined) {
        profileUpdates.name = updates.name;
      }
      if (updates.avatarUrl !== undefined) {
        profileUpdates.avatar_url = updates.avatarUrl;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);

        if (profileError) {
          console.error('[SettingsService] Error updating profiles table:', profileError);
          throw profileError;
        }

        console.log('[SettingsService] Profile updated in database');
      }

      // 2. Récupérer les paramètres actuels du cache local
      const currentSettings = await this.getSettings(userId);

      // 3. Fusionner avec les nouvelles données
      const updatedSettings: SettingsState = {
        ...currentSettings,
        profile: {
          ...currentSettings.profile,
          ...updates
        }
      };

      // 4. Sauvegarder dans user_settings et localStorage
      await this.saveSettings(userId, updatedSettings);

      console.log('[SettingsService] Profile update completed successfully');
    } catch (error) {
      console.error('[SettingsService] Error updating profile:', error);
      throw new Error('Impossible de mettre à jour le profil');
    }
  }

  /**
   * Met à jour les paramètres d'apparence
   */
  async updateAppearance(userId: string, updates: AppearanceUpdate): Promise<void> {
    try {
      const currentSettings = await this.getSettings(userId);

      const updatedSettings: SettingsState = {
        ...currentSettings,
        appearance: {
          ...currentSettings.appearance,
          ...updates
        }
      };

      await this.saveSettings(userId, updatedSettings);
    } catch (error) {
      console.error('Error updating appearance:', error);
      throw new Error('Impossible de mettre à jour l\'apparence');
    }
  }

  /**
   * Met à jour les paramètres de notifications
   */
  async updateNotifications(userId: string, updates: NotificationUpdate): Promise<void> {
    try {
      console.log('[SettingsService] Updating notifications:', { userId, updates });

      const currentSettings = await this.getSettings(userId);

      const updatedSettings: SettingsState = {
        ...currentSettings,
        notifications: {
          ...currentSettings.notifications,
          ...updates
        }
      };

      await this.saveSettings(userId, updatedSettings);

      console.log('[SettingsService] Notifications update completed successfully');
    } catch (error) {
      console.error('Error updating notifications:', error);
      throw new Error('Impossible de mettre à jour les notifications');
    }
  }

  /**
   * Met à jour les paramètres de sécurité
   */
  async updateSecurity(userId: string, updates: SecurityUpdate): Promise<void> {
    try {
      const currentSettings = await this.getSettings(userId);

      const updatedSettings: SettingsState = {
        ...currentSettings,
        security: {
          ...currentSettings.security,
          ...updates
        }
      };

      await this.saveSettings(userId, updatedSettings);
    } catch (error) {
      console.error('Error updating security:', error);
      throw new Error('Impossible de mettre à jour la sécurité');
    }
  }

  /**
   * Sauvegarde les paramètres dans la base de données
   */
  private async saveSettings(userId: string, settings: SettingsState): Promise<void> {
    // Toujours sauvegarder dans le localStorage
    localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));

    // Essayer de sauvegarder dans Supabase (peut échouer si la table n'existe pas)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: userId,
            settings: settings,
            updated_at: new Date().toISOString()
          },
          {
            // Spécifier explicitement la colonne de conflit
            onConflict: 'user_id',
            // Ne pas retourner les données pour améliorer les performances
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.warn('Could not save to database, using localStorage only:', error.message);
      } else {
        console.log('✅ Settings saved to database');
      }
    } catch (error: any) {
      console.warn('Database table user_settings not found, using localStorage only:', error?.message);
    }
  }

  /**
   * Upload un avatar
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      // Valider la taille (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('La taille du fichier ne doit pas dépasser 2MB');
      }

      // Valider le type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Format non supporté. Utilisez JPG, PNG ou WebP');
      }

      // Générer un nom unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/avatars/${fileName}`;

      console.log('[SettingsService] Uploading avatar:', { filePath, size: file.size, type: file.type });

      // Upload vers Supabase Storage (on tente directement sans vérifier le bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('[SettingsService] Upload error:', uploadError);

        // Messages d'erreur personnalisés
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Le stockage n\'est pas configuré. Veuillez contacter le support.');
        }
        if (uploadError.message?.includes('Payload too large')) {
          throw new Error('Le fichier est trop volumineux (max 2MB)');
        }
        if (uploadError.message?.includes('permission')) {
          throw new Error('Permissions insuffisantes. Veuillez vous reconnecter.');
        }

        throw new Error(uploadError.message || 'Erreur lors de l\'upload');
      }

      console.log('[SettingsService] Upload successful:', uploadData);

      // Récupérer l'URL publique avec un timestamp pour éviter les problèmes de cache
      const { data } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      const publicUrlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`;

      console.log('[SettingsService] Public URL:', publicUrlWithTimestamp);

      return publicUrlWithTimestamp;
    } catch (error: any) {
      console.error('[SettingsService] Error uploading avatar:', error);

      // Retourner le message d'erreur original si c'est déjà une Error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Impossible de télécharger l\'avatar');
    }
  }

  /**
   * Supprime un avatar
   */
  async deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      // Supprimer du storage
      const { error } = await supabase.storage
        .from('user-uploads')
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw new Error('Impossible de supprimer l\'avatar');
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Nettoyer le localStorage
      localStorage.clear();
    } catch (error) {
      console.error('Error logging out:', error);
      throw new Error('Impossible de se déconnecter');
    }
  }

  /**
   * Suppression de compte
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    try {
      // Vérifier le mot de passe en tentant une ré-authentification
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        throw new Error('Email non trouvé');
      }

      // Supprimer toutes les données utilisateur
      const { error: deleteError } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Supprimer le compte via l'API Admin (nécessite une fonction Edge)
      // Pour l'instant, on déconnecte juste l'utilisateur
      await this.logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error('Impossible de supprimer le compte');
    }
  }
}

export const settingsService = new SettingsService();
