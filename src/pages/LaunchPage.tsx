import React, { useEffect } from 'react';

/**
 * Page de lancement CentriNote
 * Cette page redirige vers le fichier HTML statique /launch.html
 */
export function LaunchPage() {
  useEffect(() => {
    // Rediriger vers le fichier HTML statique
    window.location.href = '/launch.html';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement de la page de lancement...</p>
      </div>
    </div>
  );
}
