/**
 * API Client - Service pour communiquer avec le backend
 * 
 * Utilise l'URL du backend configurée via les variables d'environnement
 */

class APIClient {
  private baseURL: string;

  constructor() {
    // En développement avec ngrok, utilise VITE_BACKEND_URL
    // En production, utilise l'URL de production
    this.baseURL = import.meta.env.VITE_BACKEND_URL || 
                   (import.meta.env.PROD ? 
                    window.location.origin : 
                    'http://localhost:5174');
    
    console.log('🌐 API Client configuré avec baseURL:', this.baseURL);
  }

  /**
   * Effectue une requête HTTP vers le backend
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important pour les cookies de session
    };

    const config = { ...defaultOptions, ...options };
    
    console.log(`🔗 API Request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Request successful');
      return data;
    } catch (error) {
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
   */
  async getAuthStatus(): Promise<{ authenticated: boolean; message: string }> {
    return this.get('/auth/me');
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;