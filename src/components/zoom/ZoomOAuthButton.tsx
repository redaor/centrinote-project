// 🚀 Composant bouton de connexion Zoom via Supabase OAuth
// Interface simple et professionnelle pour l'authentification Zoom
// ================================================================

import React, { useState } from 'react';
import { Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { zoomOAuthService } from '../../services/zoomOAuthService';

interface ZoomOAuthButtonProps {
  onSuccess?: (session: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
}

export const ZoomOAuthButton: React.FC<ZoomOAuthButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'primary'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleZoomConnect = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setStatus('loading');

    try {
      console.log('🚀 Démarrage connexion Zoom...');
      
      const result = await zoomOAuthService.signInWithZoom();

      if (result.success) {
        setStatus('success');
        console.log('✅ Connexion Zoom initiée avec succès');
        
        // Envoyer les tokens à n8n après connexion
        setTimeout(async () => {
          await zoomOAuthService.sendTokensToN8n();
        }, 2000);
        
        onSuccess?.(result.session);
      } else {
        setStatus('error');
        console.error('❌ Erreur connexion Zoom:', result.error);
        onError?.(result.error || 'Erreur de connexion');
      }
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur inattendue:', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-6 py-4 text-lg';
      default:
        return 'px-4 py-3 text-base';
    }
  };

  const getVariantClasses = () => {
    const baseClasses = 'font-medium rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 min-w-max';
    
    switch (variant) {
      case 'outline':
        return `${baseClasses} border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20`;
      case 'ghost':
        return `${baseClasses} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20`;
      default:
        return `${baseClasses} bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95`;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Video className="w-5 h-5" />;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'loading':
        return 'Connexion en cours...';
      case 'success':
        return 'Connecté !';
      case 'error':
        return 'Erreur - Réessayer';
      default:
        return 'Se connecter avec Zoom';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      onClick={handleZoomConnect}
      disabled={isDisabled}
      className={`
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title="Connecter votre compte Zoom via Supabase OAuth"
    >
      {getStatusIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
};