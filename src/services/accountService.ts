import { supabase } from '../lib/supabase';

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  userId?: string;
  deletedAt?: string;
  error?: string;
  details?: string;
}

class AccountService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!this.baseUrl) {
      console.warn('VITE_SUPABASE_URL non configuré');
    }
  }

  /**
   * Supprime complètement le compte utilisateur via l'Edge Function sécurisée
   */
  async deleteAccount(confirmation: string): Promise<DeleteAccountResponse> {
    try {
      // Vérifier la confirmation
      if (confirmation !== 'SUPPRIMER') {
        return {
          success: false,
          error: 'Confirmation invalide. Veuillez taper "SUPPRIMER" exactement.'
        };
      }

      // Récupérer le token d'authentification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'Session non valide. Veuillez vous reconnecter.'
        };
      }

      // Appeler l'Edge Function de suppression
      const functionUrl = `${this.baseUrl}/functions/v1/delete-user-account`;
      
      console.log('🔗 Appel de l\'Edge Function:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          confirmation: confirmation
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur de l\'Edge Function:', result);
        return {
          success: false,
          error: result.error || 'Erreur lors de la suppression du compte',
          details: result.details
        };
      }

      console.log('✅ Suppression réussie:', result);
      return result;

    } catch (error) {
      console.error('❌ Erreur lors de l\'appel à l\'Edge Function:', error);
      
      let errorMessage = 'Erreur de connexion lors de la suppression du compte';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else if (error instanceof Error) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Nettoie complètement les données locales
   */
  clearLocalData(): void {
    try {
      console.log('🧹 Nettoyage des données locales...');
      
      // Lister toutes les clés à supprimer
      const keysToRemove: string[] = [];
      
      // Parcourir localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') || 
          key.includes('centrinote') ||
          key.includes('sb-') ||
          key.startsWith('auth-')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Supprimer les clés identifiées
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Supprimé: ${key}`);
      });
      
      // Nettoyer sessionStorage
      sessionStorage.clear();
      
      // Nettoyer les cookies liés à Supabase si possible
      if (document.cookie) {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') || name.includes('sb-')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });
      }
      
      console.log('✅ Nettoyage local terminé');
      
    } catch (error) {
      console.warn('⚠️ Erreur lors du nettoyage local:', error);
    }
  }

  /**
   * Déconnecte l'utilisateur de Supabase
   */
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Déconnexion de Supabase...');
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.warn('⚠️ Erreur lors de la déconnexion:', error);
    }
  }

  /**
   * Processus complet de suppression de compte
   */
  async deleteAccountComplete(confirmation: string): Promise<DeleteAccountResponse> {
    console.log('🚀 Début du processus de suppression complète...');
    
    // Étape 1: Supprimer le compte via l'Edge Function
    const deleteResult = await this.deleteAccount(confirmation);
    
    if (!deleteResult.success) {
      return deleteResult;
    }
    
    // Étape 2: Déconnexion
    await this.signOut();
    
    // Étape 3: Nettoyage local
    this.clearLocalData();
    
    console.log('✅ Processus de suppression complète terminé');
    
    return {
      ...deleteResult,
      message: 'Compte supprimé avec succès ! Toutes vos données ont été définitivement effacées.'
    };
  }

  /**
   * Vérifier si l'Edge Function est disponible
   */
  async checkEdgeFunctionAvailability(): Promise<{ available: boolean; error?: string }> {
    try {
      const functionUrl = `${this.baseUrl}/functions/v1/delete-user-account`;
      
      const response = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
      
      return { available: response.ok };
      
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }
}

// Instance singleton
export const accountService = new AccountService();