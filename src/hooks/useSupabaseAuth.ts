import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import type { User } from '../types';

export function useSupabaseAuth() {
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fonction pour récupérer la session et l'utilisateur
    const getSession = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session?.user) {
          console.log("Session Supabase trouvée, utilisateur authentifié:", session.user.id);

          try {
            // Récupérer les informations du profil utilisateur
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              console.warn("Erreur lors de la récupération du profil:", profileError);
              // Créer un profil par défaut si aucun n'existe
              const defaultUser: User = {
                id: session.user.id,
                name: session.user.email?.split('@')[0] || 'Utilisateur',
                email: session.user.email || '',
                role: 'user',
                subscription: 'free'
              };
              setUser(defaultUser);
              dispatch({ type: 'SET_USER', payload: defaultUser });
            } else {
              // Créer l'objet utilisateur à partir du profil
              const userData: User = {
                id: profile.id,
                name: profile.name || session.user.email?.split('@')[0] || 'Utilisateur',
                email: session.user.email || '',
                avatar: profile.avatar_url,
                role: profile.role || 'user',
                subscription: profile.subscription || 'free'
              };
              
              setUser(userData);
              dispatch({ type: 'SET_USER', payload: userData });
            }
          } catch (err) {
            console.error("Erreur lors du traitement du profil:", err);
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
          }
        } else {
          console.log("Aucune session Supabase trouvée");
          setUser(null);
          dispatch({ type: 'SET_USER', payload: null });
        }
      } catch (err) {
        console.error("Erreur d'authentification:", err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setUser(null);
        dispatch({ type: 'SET_USER', payload: null });
      } finally {
        setLoading(false);
      }
    };
    
    // Récupérer la session au chargement
    getSession();
    
    // Écouter les changements d'état d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Changement d'état d'authentification:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Récupérer les informations du profil utilisateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        // Créer l'objet utilisateur
        const user: User = {
          id: session.user.id, 
          name: profile?.name || session.user.email?.split('@')[0] || 'Utilisateur', 
          email: session.user.email || '', 
          avatar: profile?.avatar_url, 
          role: profile?.role || 'user', 
          subscription: profile?.subscription || 'free' 
        };
        
        // Mettre à jour le contexte
        setUser(user);
        dispatch({ type: 'SET_USER', payload: user });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        dispatch({ type: 'SET_USER', payload: null });
      }
    });
    
    // Nettoyer l'écouteur
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  return { user, loading, error };
}