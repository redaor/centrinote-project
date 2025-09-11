// 🔘 Bouton de connexion Google Meet OAuth
// Composant pour initier l'authentification Google via Supabase
// =============================================================

import React, { useState } from 'react';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';

interface GoogleMeetOAuthButtonProps {
  onSuccess?: (session: any) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const GoogleMeetOAuthButton: React.FC<GoogleMeetOAuthButtonProps> = ({
  onSuccess,
  onError,
  size = 'md',
  variant = 'primary',
  disabled = false,
  children,
  className = ''
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (disabled || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Dynamique import pour éviter les erreurs SSR
      const { googleMeetService } = await import('../../services/googleMeetService');
      
      const result = await googleMeetService.signInWithGoogle();
      
      if (result.success) {
        console.log('✅ Connexion Google Meet initiée');
        onSuccess?.(result.session);
        
        // Note: La redirection OAuth se fait automatiquement
        // L'utilisateur sera redirigé vers Google puis de retour vers l'app
      } else {
        const errorMsg = result.error || 'Erreur de connexion Google';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inattendue';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('❌ Erreur connexion Google Meet:', err);
    } finally {
      // Ne pas désactiver isConnecting car l'utilisateur va être redirigé
      // setIsConnecting(false);
    }
  };

  // Classes CSS basées sur les props
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
  };

  const baseClasses = `
    inline-flex items-center justify-center space-x-2 rounded-lg font-medium 
    border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20
    ${sizeClasses[size]} ${variantClasses[variant]}
    ${disabled || isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 cursor-pointer'}
    ${className}
  `;

  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={disabled || isConnecting}
        className={baseClasses}
        type="button"
        title="Se connecter avec Google Meet"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connexion en cours...</span>
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            <span>
              {children || 'Se connecter avec Google Meet'}
            </span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {isConnecting && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Vous allez être redirigé vers Google pour autoriser l'accès...
        </div>
      )}
    </div>
  );
};