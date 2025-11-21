/**
 * 🔑 Utilitaires JWT
 */

// Clé JWT (une seule clé)
export const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'default-jwt-secret';

/**
 * Vérifier si la clé JWT est configurée
 */
export function isJWTConfigured(): boolean {
  return !!(JWT_SECRET && JWT_SECRET !== 'default-jwt-secret');
}

/**
 * Obtenir le statut de configuration JWT
 */
export function getJWTConfigurationStatus(): { configured: boolean; message: string } {
  if (!JWT_SECRET || JWT_SECRET === 'default-jwt-secret') {
    return {
      configured: false,
      message: 'VITE_JWT_SECRET non configurée'
    };
  }

  return {
    configured: true,
    message: 'JWT configuré et prêt'
  };
}
