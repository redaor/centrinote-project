/**
 * API Client - Service pour communiquer avec le backend
 * 
 * Utilise l'URL du backend configurée via les variables d'environnement
 */

class APIClient {
  private baseURL: string;

  constructor() {
    // ✅ NOUVELLE LOGIQUE: Utiliser VITE_API_BASE pour pointer vers Netlify Functions
    // Dev: http://localhost:8888/.netlify/functions (Netlify Dev)
    // Prod: /.netlify/functions (relative)
    this.baseURL = import.meta.env.VITE_API_BASE ||
                   import.meta.env.VITE_BACKEND_URL ||
                   (import.meta.env.PROD ?
                    '/.netlify/functions' :
                    'http://localhost:8888/.netlify/functions');

    console.log('🌐 API Client configuré avec baseURL:', this.baseURL);
    console.log('📋 Mode:', import.meta.env.MODE);
    console.log('🔧 VITE_API_BASE:', import.meta.env.VITE_API_BASE || 'NOT_SET');
  }

  /**
   * Effectue une requête HTTP vers le backend
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    // Normaliser l'URL : s'assurer qu'il n'y a qu'un seul slash
    const normalizedBase = this.baseURL.replace(/\/$/, '');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${normalizedBase}${normalizedEndpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important pour les cookies de session
    };

    const config = { ...defaultOptions, ...options };

    console.log(`🔗 API Request: ${config.method || 'GET'} ${url}`);
    if (import.meta.env.DEV || import.meta.env.VITE_API_DEBUG === '1') {
      console.log('   baseURL:', this.baseURL);
      console.log('   endpoint:', endpoint);
      console.log('   normalized URL:', url);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read error response';
        }
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      // ⚠️ GARDE-FOU: Détecter si on reçoit du HTML au lieu de JSON (API misrouted)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();

        // 🚨 CRITIQUE: Si c'est du HTML de la SPA, c'est une erreur de routing
        if (text.trim().startsWith('<!doctype html') ||
            text.trim().startsWith('<!DOCTYPE html') ||
            text.includes('<div id="root">')) {
          console.error('🚨 API MISROUTED: Received SPA HTML instead of JSON');
          console.error('URL:', url);
          console.error('Expected: JSON from Netlify Function');
          console.error('Got: SPA index.html (routing error)');
          throw new Error('API misrouted: received HTML from SPA instead of JSON. Check netlify.toml redirects.');
        }

        console.warn('⚠️ Non-JSON response:', text.substring(0, 200));
        // Essayer de parser quand même si ressemble à du JSON
        try {
          return JSON.parse(text);
        } catch {
          // Retourner comme texte brut si ce n'est pas du JSON
          return text as any;
        }
      }

      const data = await response.json();
      console.log('✅ API Request successful');
      return data;
    } catch (error) {
      // Erreur de syntaxe souvent liée à une URL mal formée
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('❌ Network error or invalid URL:', url);
        throw new Error('Network error: Unable to reach the server');
      }
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }

  /**
   * Alternative health check
   */
  async healthz(): Promise<{ status: string; timestamp: string }> {
    return this.get('/healthz');
  }

  /**
   * Auth status check
   * ⚠️ Note: Utilise /auth-me (avec tiret) pour correspondre à la Netlify Function auth-me.ts
   * baseURL est /.netlify/functions, donc /auth-me → /.netlify/functions/auth-me
   */
  async getAuthStatus(): Promise<{ authenticated: boolean; message: string }> {
    return this.get('/auth-me');
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;