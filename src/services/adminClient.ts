/**
 * CLIENT POUR APPELER LA NETLIFY ADMIN FUNCTION
 *
 * ⚠️ IMPORTANT : Ce fichier est côté client mais ne contient PAS de secrets
 * Le ADMIN_SECRET doit être stocké et utilisé UNIQUEMENT par les admins
 *
 * Usage typique :
 * - Appels depuis un panneau d'admin protégé
 * - L'admin saisit le secret dans un champ sécurisé
 * - Le secret n'est jamais stocké dans le localStorage ou dans le code
 */

interface AdminClientConfig {
  baseUrl?: string;
  adminSecret: string; // Fourni par l'admin à chaque session
}

interface AdminResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AdminClient {
  private baseUrl: string;
  private adminSecret: string;

  constructor(config: AdminClientConfig) {
    this.baseUrl = config.baseUrl || '/.netlify/functions/admin';
    this.adminSecret = config.adminSecret;
  }

  /**
   * Effectue une requête sécurisée vers la fonction admin
   */
  private async request<T>(
    endpoint: string,
    body: any,
    method: 'POST' | 'GET' = 'POST'
  ): Promise<AdminResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': this.adminSecret
        },
        body: method === 'POST' ? JSON.stringify(body) : undefined
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Admin API error [${response.status}]:`, data);
      }

      return data;
    } catch (error: any) {
      console.error('Admin API request failed:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  /**
   * Confirmer l'email d'un utilisateur directement
   */
  async confirmUserEmail(userId: string, email: string): Promise<AdminResponse> {
    return this.request('/confirm-email', { userId, email });
  }

  /**
   * Créer un token de confirmation personnalisé
   */
  async createConfirmationToken(
    userId: string,
    email: string
  ): Promise<AdminResponse<{ token: string; expiresAt: string }>> {
    return this.request('/create-token', { userId, email });
  }

  /**
   * Utiliser un token de confirmation
   */
  async useConfirmationToken(
    token: string
  ): Promise<AdminResponse<{ userId: string; email: string }>> {
    return this.request('/use-token', { token });
  }

  /**
   * Vérifier si un utilisateur peut renvoyer un email de confirmation
   */
  async canResendConfirmation(
    email: string
  ): Promise<AdminResponse<{ canResend: boolean; nextResendAt?: string }>> {
    return this.request('/can-resend', { email });
  }

  /**
   * Invalider tous les tokens d'un utilisateur
   */
  async invalidateOldTokens(userId: string): Promise<AdminResponse> {
    return this.request('/invalidate-tokens', { userId });
  }
}

/**
 * EXEMPLE D'UTILISATION DANS UN COMPOSANT ADMIN
 *
 * ```tsx
 * import { AdminClient } from '@/services/adminClient';
 *
 * function AdminPanel() {
 *   const [adminSecret, setAdminSecret] = useState('');
 *   const [client, setClient] = useState<AdminClient | null>(null);
 *
 *   const handleLogin = () => {
 *     // L'admin saisit le secret
 *     const newClient = new AdminClient({ adminSecret });
 *     setClient(newClient);
 *   };
 *
 *   const handleConfirmEmail = async (userId: string, email: string) => {
 *     if (!client) return;
 *
 *     const result = await client.confirmUserEmail(userId, email);
 *     if (result.success) {
 *       alert('Email confirmé !');
 *     } else {
 *       alert(`Erreur: ${result.error}`);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {!client ? (
 *         <div>
 *           <input
 *             type="password"
 *             placeholder="Admin Secret"
 *             value={adminSecret}
 *             onChange={(e) => setAdminSecret(e.target.value)}
 *           />
 *           <button onClick={handleLogin}>Se connecter</button>
 *         </div>
 *       ) : (
 *         <div>
 *           <h2>Panneau Admin</h2>
 *           <button onClick={() => handleConfirmEmail('user-id', 'user@example.com')}>
 *             Confirmer Email
 *           </button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * EXEMPLE D'UTILISATION DANS UN EDGE FUNCTION SERVEUR
 * (Si vous avez besoin d'appeler la fonction admin depuis un autre Edge Function)
 *
 * ```ts
 * import { AdminClient } from './adminClient';
 *
 * // Dans un Edge Function Supabase
 * const adminClient = new AdminClient({
 *   baseUrl: 'https://centrinote.fr/.netlify/functions/admin',
 *   adminSecret: Deno.env.get('ADMIN_SECRET')!
 * });
 *
 * const result = await adminClient.confirmUserEmail(userId, email);
 * ```
 */
