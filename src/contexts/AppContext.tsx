import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AppContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  user: null,
  loading: true,
  signOut: async () => {}
});

export const useAuth = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // IMPORTANT : Timeout pour éviter le blocage
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Auth timeout - continuing without auth');
        setLoading(false);
      }
    }, 3000); // 3 secondes max

    // Vérifier la session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    checkSession();

    // Écouter les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AppContext.Provider>
  );
}