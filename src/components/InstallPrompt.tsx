import React, { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Vérifier si déjà installé ou masqué récemment
    const checkDismissed = () => {
      const dismissed = localStorage.getItem('centrinote-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const now = Date.now();
        const hours24 = 24 * 60 * 60 * 1000;
        
        // Si refusé il y a moins de 24h, ne pas afficher
        if (now - dismissedTime < hours24) {
          return false;
        } else {
          // Plus de 24h, on peut réafficher
          localStorage.removeItem('centrinote-install-dismissed');
        }
      }
      return true;
    };

    // Vérifier si installé (standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    if (isInstalled) {
      return; // Déjà installé, ne pas afficher
    }

    if (!checkDismissed()) {
      return; // Masqué récemment
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      promptEventRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);
    };

    // Écouter l'installation réussie
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      promptEventRef.current = null;
      // Masquer définitivement après installation
      localStorage.setItem('centrinote-install-dismissed', Date.now().toString());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Afficher immédiatement si l'événement n'est pas encore déclenché
    // (certains navigateurs ne déclenchent pas beforeinstallprompt immédiatement)
    const timer = setTimeout(() => {
      if (!promptEventRef.current && checkDismissed()) {
        setShowPrompt(true);
      }
    }, 100);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Utiliser l'événement natif
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          // Installation acceptée
          setShowPrompt(false);
          setDeferredPrompt(null);
          promptEventRef.current = null;
          localStorage.setItem('centrinote-install-dismissed', Date.now().toString());
        } else {
          // Installation refusée
          setShowPrompt(false);
          setDeferredPrompt(null);
          promptEventRef.current = null;
          localStorage.setItem('centrinote-install-dismissed', Date.now().toString());
        }
      } catch (error) {
        console.warn('Erreur lors de l\'installation:', error);
        setShowPrompt(false);
      }
    } else {
      // Fallback : afficher les instructions pour installation manuelle
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('Pour installer Centrinote sur iOS:\n1. Appuyez sur le bouton Partager\n2. Sélectionnez "Sur l\'écran d\'accueil"');
      } else if (isAndroid) {
        alert('Pour installer Centrinote sur Android:\n1. Appuyez sur le menu (⋮)\n2. Sélectionnez "Ajouter à l\'écran d\'accueil"');
      } else {
        alert('Pour installer Centrinote:\nUtilisez le menu de votre navigateur pour "Installer l\'application"');
      }
      
      // Masquer après affichage des instructions
      localStorage.setItem('centrinote-install-dismissed', Date.now().toString());
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('centrinote-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-[#2563eb] rounded-xl flex items-center justify-center text-2xl">
            📲
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
              Installer Centrinote
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Installez l'application pour un accès rapide et une meilleure expérience.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-[#2563eb] hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
