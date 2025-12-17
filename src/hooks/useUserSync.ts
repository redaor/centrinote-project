import { useEffect, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { User } from '../types';

// Debug flag pour production
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'basic' | 'premium';
  created_at: string;
  updated_at: string;
}

export function useUserSync() {
  const { state, dispatch } = useApp();

  // Fonction pour charger le profil utilisateur depuis Supabase
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      DEBUG && console.log('🔄 Chargement du profil utilisateur:', userId);

      // ✅ Vérifier la session d'authentification AVANT la requête
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        DEBUG && console.error('❌ Session invalide ou expirée:', sessionError);
        return null;
      }

      // Récupérer le profil depuis la table profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erreur lors du chargement du profil:', error);
        return null;
      }

      if (profile) {
        const user: User = {
          id: profile.id,
          name: profile.name || profile.email?.split('@')[0] || 'Utilisateur',
          email: profile.email,
          avatar: profile.avatar_url,
          role: profile.role || 'user',
          subscription: profile.subscription || 'free'
        };

        DEBUG && console.log('✅ Profil utilisateur chargé:', user);
        dispatch({ type: 'SET_USER', payload: user });
        return user;
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur lors du chargement du profil:', error);
      return null;
    }
  }, [dispatch]);

  // Fonction pour créer un profil utilisateur
  const createUserProfile = useCallback(async (authUser: any) => {
    try {
      DEBUG && console.log('🆕 Création du profil utilisateur:', authUser.id);

      // ✅ Vérifier la session d'authentification AVANT la requête
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        DEBUG && console.error('❌ Session invalide lors de la création du profil:', sessionError);
        return null;
      }

      // Vérifier d'abord si le profil existe déjà
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();
        
      if (existingProfile) {
        DEBUG && console.log('Profil existant trouvé, pas besoin de le créer');
        return await loadUserProfile(authUser.id);
      }
      
      const profileData = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Utilisateur',
        avatar_url: authUser.user_metadata?.avatar_url,
        role: 'user',
        subscription: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur lors de la création du profil:', error);
        
        // Si l'erreur est due à un conflit de clé unique, essayons de charger le profil existant
        if (error.code === '23505') { // Code PostgreSQL pour violation de contrainte unique
          console.log('Tentative de récupération du profil existant après erreur de doublon');
          return await loadUserProfile(authUser.id);
        }
        
        return null;
      }

      DEBUG && console.log('✅ Profil utilisateur créé:', data);
      return await loadUserProfile(authUser.id);
    } catch (error) {
      console.error('❌ Erreur lors de la création du profil:', error);
      return null;
    }
  }, [loadUserProfile]);

  // Fonction pour mettre à jour le profil utilisateur
  const updateUserProfile = useCallback(async (userId: string, updates: Partial<UserProfile>) => {
    try {
      DEBUG && console.log('🔄 Mise à jour du profil utilisateur:', userId, JSON.stringify(updates));

      // ✅ Vérifier la session d'authentification AVANT la requête
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        DEBUG && console.error('❌ Session invalide lors de la mise à jour:', sessionError);
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur lors de la mise à jour du profil:', error);
        throw error;
      } else {
        DEBUG && console.log('✅ Profil utilisateur mis à jour:', data);
      }

      // Recharger le profil pour s'assurer de la synchronisation
      await loadUserProfile(userId);
      
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }, [loadUserProfile]);

  // Fonction pour synchroniser avec l'état d'authentification
  const syncAuthState = useCallback(async (event: string, session: any) => {
    DEBUG && console.log('🔄 Changement d\'état d\'authentification:', event, session?.user?.id);
    
    switch (event) {
      case 'SIGNED_IN':
        if (session?.user) {
          // Essayer de charger le profil existant
          let user = await loadUserProfile(session.user.id);
          
          // Si le profil n'existe pas, le créer
          if (!user) {
            user = await createUserProfile(session.user);
          }
        }
        break;
        
      case 'SIGNED_OUT':
        DEBUG && console.log('👋 Utilisateur déconnecté');
        dispatch({ type: 'SET_USER', payload: null });
        break;
        
      case 'TOKEN_REFRESHED':
        DEBUG && console.log('🔄 Token rafraîchi');
        // Le profil reste le même, pas besoin de recharger
        break;
        
      case 'USER_UPDATED':
        if (session?.user) {
          DEBUG && console.log('👤 Données utilisateur mises à jour');
          await loadUserProfile(session.user.id);
        }
        break;
        
      default:
        DEBUG && console.log('🔄 Événement d\'authentification:', event);
    }
  }, [loadUserProfile, createUserProfile, dispatch]);

  // Écouter les changements d'authentification
  useEffect(() => {
    DEBUG && console.log('🎧 Configuration de l\'écoute des changements d\'authentification');
    
    // Vérifier la session actuelle au démarrage
    const checkCurrentSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Erreur lors de la vérification de la session:', error);
        return;
      }
      
      if (session?.user) {
        DEBUG && console.log('🔍 Session existante trouvée:', session.user.id);
        await syncAuthState('SIGNED_IN', session);
      } else {
        DEBUG && console.log('❌ Aucune session active');
        dispatch({ type: 'SET_USER', payload: null });
      }
    };

    checkCurrentSession();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(syncAuthState);

    return () => {
      DEBUG && console.log('🔇 Arrêt de l\'écoute des changements d\'authentification');
      subscription.unsubscribe();
    };
  }, [syncAuthState, dispatch]);

  // Polling pour synchroniser le profil utilisateur toutes les 30 secondes
  useEffect(() => {
    if (!state.user?.id) return;

    DEBUG && console.log('[useUserSync] Starting profile polling for user:', state.user.id);

    // Fonction pour vérifier les changements du profil
    const checkProfileUpdates = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('name, avatar_url, updated_at')
          .eq('id', state.user!.id)
          .single();

        if (error) {
          DEBUG && console.warn('[useUserSync] Error checking profile updates:', error);
          return;
        }

        if (profile) {
          // Comparer avec l'état actuel
          const hasChanges =
            profile.name !== state.user?.name ||
            profile.avatar_url !== state.user?.avatar;

          if (hasChanges) {
            DEBUG && console.log('[useUserSync] Profile changes detected, reloading...');
            await loadUserProfile(state.user!.id);
          }
        }
      } catch (error) {
        DEBUG && console.error('[useUserSync] Error in polling:', error);
      }
    };

    // Vérifier immédiatement
    checkProfileUpdates();

    // ⚡ PERFORMANCE: Augmenté à 5 minutes (le profil change rarement)
    const intervalId = setInterval(checkProfileUpdates, 300000); // 5 minutes au lieu de 30 secondes

    return () => {
      DEBUG && console.log('[useUserSync] Stopping profile polling');
      clearInterval(intervalId);
    };
  }, [state.user?.id, state.user?.name, state.user?.avatar, state.user, loadUserProfile]);

  return {
    loadUserProfile,
    updateUserProfile,
    createUserProfile,
    syncAuthState
  };
}