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
    
    // Écouter les changements d'état d'authentification
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
            avatar_url: session.user.user_metadata?.avatar_url || null,
            role: 'user',
            subscription: 'free',
            created_at: session.user.created_at,
            updated_at: new Date().toISOString()
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
      console.log('🔄 Déconnexion Supabase...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      console.log('✅ Déconnexion Supabase réussie');
      setUser(null);
    } catch (err) {
      console.error('❌ Erreur lors de la déconnexion Supabase:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      // Même en cas d'erreur, nettoyer l'état local
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