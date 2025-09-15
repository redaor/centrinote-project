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
    console.log('🔄 AuthProvider: Initialisation avec Supabase...');
    
    // 1. Vérifier d'abord s'il y a une session existante
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 AuthProvider: Session initiale:', session ? 'Trouvée' : 'Aucune');
        
        if (session?.user) {
          console.log('✅ AuthProvider: Session initiale trouvée pour:', session.user.email);
          
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
        console.log('🔄 AuthProvider: Changement d\'état auth:', event);
        
        if (session?.user) {
          console.log('✅ AuthProvider: Session Supabase trouvée pour:', session.user.email);
          
          // Créer l'objet utilisateur à partir de la session Supabase
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilisateur',
            avatar: session.user.user_metadata?.avatar_url,
            role: 'user',
            subscription: 'free'
          };
          
          console.log('👤 AuthProvider: Utilisateur final créé:', userData);
          setUser(userData);
        } else {
          console.log('❌ AuthProvider: Aucune session trouvée');
          setUser(null);
        }
        
        setLoading(false);
      }
    );
    
    // Nettoyage
    return () => {
      console.log('🧹 AuthProvider: Nettoyage de l\'abonnement auth');
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