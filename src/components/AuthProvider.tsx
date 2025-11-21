import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔄 Initialisation avec Supabase réel
  useEffect(() => {
    // 1. Vérifier d'abord s'il y a une session existante
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Vérifier uniquement la confirmation native Supabase
          const emailConfirmed = !!session.user.email_confirmed_at;

          if (!emailConfirmed) {
            console.warn('📧 AuthProvider: Session détectée mais email non confirmé - fermeture de session');
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.warn('⚠️ AuthProvider: échec signOut (non bloquant):', signOutError);
            }
            setUser(null);
            return;
          }

          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilisateur',
            avatar: session.user.user_metadata?.avatar_url,
            role: 'user',
            subscription: 'free'
          };

          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('❌ AuthProvider: Erreur vérification session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();
    
    // 2. Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 🚀 PERFORMANCE: Ignorer les événements redondants
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          // Ces événements ne nécessitent pas de mise à jour car déjà gérés
          return;
        }

        if (session?.user) {
          // Vérifier uniquement la confirmation native Supabase
          const emailConfirmed = !!session.user.email_confirmed_at;

          if (!emailConfirmed) {
            console.warn('📧 AuthProvider: événement auth reçu mais email non vérifié - fermeture de session');
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.warn('⚠️ AuthProvider: échec signOut (non bloquant):', signOutError);
            }
            setUser(null);
            return;
          }

          // Créer l'objet utilisateur à partir de la session Supabase
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilisateur',
            avatar: session.user.user_metadata?.avatar_url,
            role: 'user',
            subscription: 'free'
          };

          setUser(userData);
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );
    
    // Nettoyage
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🔚 Déconnexion avec Supabase réel
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Continuer avec le nettoyage local même en cas d'erreur
      }
      
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de déconnexion');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}