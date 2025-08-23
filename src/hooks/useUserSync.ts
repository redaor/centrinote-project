import { useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { User } from '../types';

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
      console.log('🔄 Chargement du profil utilisateur:', userId);
      
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

        console.log('✅ Profil utilisateur chargé:', user);
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
      console.log('🆕 Création du profil utilisateur:', authUser.id);
      
      // Vérifier d'abord si le profil existe déjà
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();
        
      if (existingProfile) {
        console.log('Profil existant trouvé, pas besoin de le créer');
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

      console.log('✅ Profil utilisateur créé:', data);
      return await loadUserProfile(authUser.id);
    } catch (error) {
      console.error('❌ Erreur lors de la création du profil:', error);
      return null;
    }
  }, [loadUserProfile]);

  // Fonction pour mettre à jour le profil utilisateur
  const updateUserProfile = useCallback(async (userId: string, updates: Partial<UserProfile>) => {
    try {
      console.log('🔄 Mise à jour du profil utilisateur:', userId, JSON.stringify(updates));
      
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
        console.log('✅ Profil utilisateur mis à jour:', data);
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
    console.log('🔄 Changement d\'état d\'authentification:', event, session?.user?.id);
    
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
        console.log('👋 Utilisateur déconnecté');
        dispatch({ type: 'SET_USER', payload: null });
        break;
        
      case 'TOKEN_REFRESHED':
        console.log('🔄 Token rafraîchi');
        // Le profil reste le même, pas besoin de recharger
        break;
        
      case 'USER_UPDATED':
        if (session?.user) {
          console.log('👤 Données utilisateur mises à jour');
          await loadUserProfile(session.user.id);
        }
        break;
        
      default:
        console.log('🔄 Événement d\'authentification:', event);
    }
  }, [loadUserProfile, createUserProfile, dispatch]);

  // Écouter les changements d'authentification
  useEffect(() => {
    console.log('🎧 Configuration de l\'écoute des changements d\'authentification');
    
    // Vérifier la session actuelle au démarrage
    const checkCurrentSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Erreur lors de la vérification de la session:', error);
        return;
      }
      
      if (session?.user) {
        console.log('🔍 Session existante trouvée:', session.user.id);
        await syncAuthState('SIGNED_IN', session);
      } else {
        console.log('❌ Aucune session active');
        dispatch({ type: 'SET_USER', payload: null });
      }
    };

    checkCurrentSession();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(syncAuthState);

    return () => {
      console.log('🔇 Arrêt de l\'écoute des changements d\'authentification');
      subscription.unsubscribe();
    };
  }, [syncAuthState, dispatch]);

  // Écouter les changements en temps réel sur la table profiles
  useEffect(() => {
    if (!state.user?.id) return;

    console.log('🎧 Configuration de l\'écoute des changements de profil en temps réel');
    
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${state.user.id}`
        },
        (payload) => {
          console.log('🔄 Changement de profil détecté:', payload);
          if (payload.new) {
            const updatedUser: User = {
              id: payload.new.id,
              name: payload.new.name,
              email: payload.new.email,
              avatar: payload.new.avatar_url,
              role: payload.new.role,
              subscription: payload.new.subscription
            };
            dispatch({ type: 'SET_USER', payload: updatedUser });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔇 Arrêt de l\'écoute des changements de profil');
      supabase.removeChannel(channel);
    };
  }, [state.user?.id, dispatch]);

  return {
    loadUserProfile,
    updateUserProfile,
    createUserProfile,
    syncAuthState
  };
}