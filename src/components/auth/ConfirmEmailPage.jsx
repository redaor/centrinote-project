// 📧 Page de confirmation email robuste avec fallback OTP manuel
// ================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const ConfirmEmailPage = () => {
  // États principaux
  const [status, setStatus] = useState('loading'); // loading, success, expired, manual, error
  const [message, setMessage] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Hooks de navigation
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // 1. EFFET INITIAL - TENTATIVE AUTO-CONFIRMATION
  // ==========================================

  useEffect(() => {
    handleAutoConfirmation();
  }, []);

  // Timer pour le countdown des renvois d'email
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // ==========================================
  // 2. CONFIRMATION AUTOMATIQUE (MAGIC LINK)
  // ==========================================

  const handleAutoConfirmation = async () => {
    try {
      console.log('🔍 Début confirmation automatique');
      console.log('🔗 URL complète:', window.location.href);

      // Récupérer les paramètres de l'URL
      const urlParams = new URLSearchParams(location.search);
      const tokenHash = urlParams.get('token_hash');
      const type = urlParams.get('type');
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');

      console.log('📝 Paramètres URL:', {
        tokenHash: tokenHash ? tokenHash.substring(0, 16) + '...' : null,
        type,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      });

      // Si on a directement les tokens, c'est déjà confirmé
      if (accessToken && refreshToken) {
        console.log('✅ Tokens directement reçus - confirmation réussie');
        setStatus('success');
        setMessage('Email confirmé avec succès !');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      // Sinon, essayer avec le token_hash
      if (tokenHash && type) {
        const result = await authService.confirmEmailWithToken(tokenHash, type);

        if (result.error) {
          console.warn('⚠️ Erreur confirmation auto:', result.error);

          if (result.error.isExpired) {
            setStatus('expired');
            setMessage('Le lien de confirmation a expiré. Utilisez le code reçu par email ou demandez un nouveau lien.');
          } else {
            setStatus('error');
            setMessage(`Erreur de confirmation: ${result.error.message}`);
          }
        } else {
          console.log('✅ Confirmation automatique réussie');
          setStatus('success');
          setMessage('Email confirmé avec succès !');
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } else {
        // Pas de paramètres de confirmation, afficher le formulaire manuel
        console.log('ℹ️ Aucun paramètre de confirmation trouvé');
        setStatus('manual');
        setMessage('Entrez le code de confirmation reçu par email');
      }

    } catch (err) {
      console.error('❌ Erreur inattendue auto-confirmation:', err);
      setStatus('error');
      setMessage('Erreur inattendue lors de la confirmation');
    }
  };

  // ==========================================
  // 3. CONFIRMATION MANUELLE AVEC CODE OTP
  // ==========================================

  const handleManualConfirmation = async (e) => {
    e.preventDefault();

    // Validation des champs
    if (!email.trim()) {
      setMessage('Veuillez saisir votre email');
      return;
    }

    if (!otpCode.trim() || otpCode.length !== 6) {
      setMessage('Veuillez saisir un code à 6 chiffres');
      return;
    }

    setIsSubmitting(true);
    setMessage('Vérification en cours...');

    try {
      const result = await authService.confirmEmailWithOTP(email, otpCode);

      if (result.error) {
        console.error('❌ Erreur OTP manuel:', result.error);
        setMessage(result.error.message);
      } else {
        console.log('✅ Confirmation manuelle réussie');
        setStatus('success');
        setMessage('Email confirmé avec succès !');
        setTimeout(() => navigate('/dashboard'), 2000);
      }

    } catch (err) {
      console.error('❌ Erreur inattendue OTP:', err);
      setMessage('Erreur lors de la vérification du code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 4. RENVOYER UN NOUVEAU CODE
  // ==========================================

  const handleResendEmail = async () => {
    if (!email.trim()) {
      setMessage('Veuillez saisir votre email');
      return;
    }

    if (countdown > 0) {
      return; // Encore en attente
    }

    try {
      setMessage('Envoi en cours...');
      
      const result = await authService.resendConfirmationEmail(email);

      if (result.error) {
        console.error('❌ Erreur renvoi email:', result.error);
        setMessage(result.error.message);
      } else {
        console.log('✅ Email renvoyé');
        setMessage('Nouveau code envoyé ! Vérifiez votre boîte mail.');
        setCountdown(60); // 60 secondes avant le prochain renvoi
      }

    } catch (err) {
      console.error('❌ Erreur inattendue renvoi:', err);
      setMessage('Erreur lors du renvoi de l\'email');
    }
  };

  // ==========================================
  // 5. HANDLERS UTILITAIRES
  // ==========================================

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
    setOtpCode(value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value.toLowerCase().trim());
  };

  // ==========================================
  // 6. RENDU DES COMPOSANTS
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        
        {/* En-tête */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📧 Confirmation Email
          </h1>
          <p className="text-gray-600 text-sm">
            Confirmez votre inscription à Centrinote
          </p>
        </div>

        {/* État de chargement */}
        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Vérification en cours...</p>
          </div>
        )}

        {/* Succès */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              Email confirmé !
            </h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            <div className="text-sm text-gray-500">
              Redirection automatique...
            </div>
          </div>
        )}

        {/* Formulaire manuel (cas expiré ou manuel) */}
        {(status === 'expired' || status === 'manual' || status === 'error') && (
          <div>
            {/* Message d'état */}
            <div className={`mb-6 p-3 rounded-lg text-sm ${
              status === 'error' 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : status === 'expired'
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {message || 'Entrez votre code de confirmation'}
            </div>

            {/* Formulaire */}
            <form onSubmit={handleManualConfirmation} className="space-y-4">
              
              {/* Champ email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="votre@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Champ code OTP */}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Code de confirmation (6 chiffres)
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={handleOtpChange}
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl font-mono tracking-widest"
                  maxLength="6"
                  pattern="[0-9]{6}"
                  required
                />
              </div>

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isSubmitting || !email.trim() || otpCode.length !== 6}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '🔄 Vérification...' : '✅ Confirmer'}
              </button>

            </form>

            {/* Actions supplémentaires */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              
              {/* Bouton renvoyer email */}
              <button
                onClick={handleResendEmail}
                disabled={countdown > 0 || !email.trim()}
                className="w-full text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {countdown > 0 
                  ? `Renvoyer un code dans ${countdown}s`
                  : '📧 Renvoyer un nouveau code'
                }
              </button>

              {/* Lien retour */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate('/auth/login')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Retour à la connexion
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Debug info (développement uniquement) */}
        {import.meta.env.DEV && (
          <div className="mt-8 p-3 bg-gray-50 rounded text-xs text-gray-500">
            <strong>Debug:</strong> Status = {status}
            <br />
            URL: {window.location.search}
          </div>
        )}

      </div>
    </div>
  );
};

export default ConfirmEmailPage;