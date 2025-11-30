// 🚫 Désactiver Google Translate et autres extensions qui manipulent le DOM

const DEBUG = import.meta.env.DEV; // Logs seulement en dev

export function disableTranslateExtensions() {
  // Désactiver Google Translate
  const meta = document.createElement('meta');
  meta.name = 'google';
  meta.content = 'notranslate';
  document.head.appendChild(meta);

  // Ajouter la classe notranslate au body
  document.body.classList.add('notranslate');

  // Définir l'attribut translate
  document.documentElement.setAttribute('translate', 'no');

  // Bloquer les scripts de Google Translate
  if (typeof window !== 'undefined') {
    // Intercepter et bloquer les requêtes de traduction
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0]?.toString() || '';
      if (url.includes('translate.googleapis.com') || url.includes('translate-pa.googleapis.com')) {
        if (DEBUG) {
          // Utiliser logger au lieu de console
          // logger.debug('[disableTranslate] Blocked Google Translate request');
        }
        return Promise.reject(new Error('Translation blocked'));
      }
      return originalFetch.apply(this, args);
    };
    
    // Intercepter console.log et console.error pour masquer les messages de fetch
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = function(...args: any[]) {
      const message = args.join(' ');
      // Masquer les messages de fetch
      if (message.includes('Fetch a fini') || message.includes('Échec du chargement')) {
        return;
      }
      // En dev seulement, logger le reste
      if (DEBUG) {
        originalConsoleLog.apply(console, args);
      }
    };
    
    console.error = function(...args: any[]) {
      const message = args.join(' ');
      // Masquer les erreurs CORS et fetch
      if (message.includes('CORS') || message.includes('fetch') || message.includes('ERR_FAILED') || message.includes('Échec du chargement')) {
        return;
      }
      // En dev seulement, logger le reste
      if (DEBUG) {
        originalConsoleError.apply(console, args);
      }
    };

    // Bloquer XMLHttpRequest vers Google Translate
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
      if (url.includes('translate.googleapis.com') || url.includes('translate-pa.googleapis.com')) {
        if (DEBUG) {
          console.debug('[disableTranslate] Blocked Google Translate XHR:', url);
        }
        throw new Error('Translation blocked');
      }
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
  }

  // Ne plus logger - silencieux
}

// Protéger les éléments critiques contre la modification
export function protectCriticalElements() {
  // Observer pour détecter les modifications non autorisées
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // Détecter les tentatives de Google Translate
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            if (node.className?.includes('goog-') ||
                node.id?.includes('goog') ||
                node.getAttribute?.('class')?.includes('translate')) {
            // Ne plus logger - silencieux
              node.remove();
            }
          }
        });
      }
    });
  });

  // Observer le body pour les modifications
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  // Ne plus logger - silencieux

  return observer;
}