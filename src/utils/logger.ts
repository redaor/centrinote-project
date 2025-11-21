/**
 * Logger anti-flood pour production
 * Coupe tous les logs inutiles et limite la taille en prod
 */

const isProd = import.meta.env.PROD;
// Niveau de verbosité global
let ENABLE_DEBUG = !isProd;

export function setDebug(enabled: boolean) { 
  ENABLE_DEBUG = enabled; 
}

export const log = {
  debug: (...args: any[]) => { 
    if (ENABLE_DEBUG) console.debug('[DBG]', ...args); 
  },
  info: (...args: any[]) => { 
    if (!isProd) console.info('[INF]', ...args); 
  },
  warn: (...args: any[]) => { 
    if (!isProd) console.warn('[WRN]', ...args); 
  },
  error: (...args: any[]) => { 
    // En prod, limiter la taille pour éviter le flood
    const out = args.map(a => (typeof a === 'string' ? a.slice(0, 300) : a));
    console.error('[ERR]', ...out);
  },
};

// Export pour compatibilité
export default log;