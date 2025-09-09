// Utilitaire de logging production-ready
// Les logs techniques sont uniquement visibles en mode développement

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: unknown[]) => {
    // Les erreurs sont toujours loggées mais de façon silencieuse en production
    if (isDev) {
      console.error(`[ERROR] ${message}`, ...args);
    } else {
      // En production, on pourrait envoyer à un service de monitoring
      // comme Sentry, LogRocket, etc.
    }
  },
  
  // Logs utilisateur - toujours visibles mais élégants
  user: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Ces logs restent visibles car ils concernent l'UX utilisateur
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    console.log(`${prefix} ${message}`);
  }
};

export default logger;