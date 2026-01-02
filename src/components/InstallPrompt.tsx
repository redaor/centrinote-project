import React, { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Vérifier si déjà installé (standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    if (isInstalled) {
      return; // Déjà installé, ne pas afficher
    }

    // Écouter l'événement beforeinstallprompt UNIQUEMENT
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      promptEventRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // Écouter l'installation réussie
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      promptEventRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      // Masquer définitivement après l'action (accepted ou dismissed)
      setDeferredPrompt(null);
      promptEventRef.current = null;
    } catch (error) {
      console.warn('Erreur lors de l\'installation:', error);
      setDeferredPrompt(null);
      promptEventRef.current = null;
    }
  };

  // N'afficher rien tant que beforeinstallprompt n'est pas capturé
  if (!deferredPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Installer centrinote"
    >
      <span className="text-lg">📲</span>
      <span className="font-medium">Installer centrinote</span>
    </button>
  );
}
