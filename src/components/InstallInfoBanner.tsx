import React, { useState, useEffect, useRef } from 'react';

export function InstallInfoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<{ name: string; instruction: string } | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Vérifier si déjà installé (standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    if (isInstalled) {
      return; // Déjà installé, ne pas afficher
    }

    // Vérifier localStorage (masqué il y a moins de 7 jours)
    const checkDismissed = () => {
      const dismissed = localStorage.getItem('centrinote-info-closed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const now = Date.now();
        const days7 = 7 * 24 * 60 * 60 * 1000;
        
        // Si masqué il y a moins de 7 jours, ne pas afficher
        if (now - dismissedTime < days7) {
          return false;
        } else {
          // Plus de 7 jours, on peut réafficher
          localStorage.removeItem('centrinote-info-closed');
        }
      }
      return true;
    };

    if (!checkDismissed()) {
      return; // Masqué récemment
    }

    // Attendre un délai pour voir si beforeinstallprompt est déclenché
    // Si InstallPrompt capture l'événement, il s'affichera et on n'affichera pas ce banner
    let beforeInstallPromptFired = false;
    
    const handleBeforeInstallPrompt = () => {
      beforeInstallPromptFired = true;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Attendre 2 secondes pour voir si l'événement est déclenché
    const checkTimer = setTimeout(() => {
      // Si beforeinstallprompt a été déclenché, InstallPrompt s'en occupe, on n'affiche rien
      if (beforeInstallPromptFired) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return;
      }

      // Détecter le navigateur pour afficher les bonnes instructions
      const detectBrowser = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/iphone|ipad|ipod/.test(userAgent)) {
          return {
            name: 'Safari iOS',
            instruction: 'Safari iOS : "Ajouter à l\'écran d\'accueil"'
          };
        } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
          return {
            name: 'Opera',
            instruction: 'Opera : Menu → "Installer l\'application"'
          };
        } else if (userAgent.includes('firefox')) {
          return {
            name: 'Firefox',
            instruction: 'Firefox : installation non disponible'
          };
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
          return {
            name: 'Safari',
            instruction: 'Safari : Menu → "Ajouter à l\'écran d\'accueil"'
          };
        }
        
        return {
          name: 'Navigateur',
          instruction: 'Utilisez le menu de votre navigateur pour installer l\'application'
        };
      };

      const browser = detectBrowser();
      setBrowserInfo(browser);
      setIsVisible(true);

      // Auto-disparition après 8 secondes
      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        localStorage.setItem('centrinote-info-closed', Date.now().toString());
      }, 8000);

      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, 2000);

    return () => {
      clearTimeout(checkTimer);
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    localStorage.setItem('centrinote-info-closed', Date.now().toString());
  };

  if (!isVisible || !browserInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 transition-all duration-300 opacity-100">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-xl">ℹ️</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white mb-1">
              Pour installer Centrinote, utilisez le menu de votre navigateur :
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              • {browserInfo.instruction}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
