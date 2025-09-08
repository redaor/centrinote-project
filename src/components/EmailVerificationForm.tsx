import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { verifyEmailCode, resendVerificationCode, markEmailAsVerified, getTimeUntilExpiry } from '../services/emailVerificationService';

interface EmailVerificationFormProps {
  email: string;
  userId?: string | null;
  onVerificationSuccess: () => void;
  onBack?: () => void;
  onSkip?: () => void; // Nouveau : permettre de passer la vérification
  isRequired?: boolean; // Nouveau : indique si la vérification est obligatoire
}

export default function EmailVerificationForm({ 
  email, 
  userId, 
  onVerificationSuccess, 
  onBack,
  onSkip,
  isRequired = false
}: EmailVerificationFormProps) {
  // 🔒 Récupérer l'email depuis la session si non fourni et vérification obligatoire
  const [currentEmail, setCurrentEmail] = useState(email);
  
  useEffect(() => {
    if (isRequired && !email) {
      // Récupérer l'email depuis la session Supabase
      import('../lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.email) {
            setCurrentEmail(session.user.email);
          }
        });
      });
    }
  }, [isRequired, email]);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  // Refs pour focus automatique entre inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer pour l'expiration
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Permettre le renvoi après 1 minute
  useEffect(() => {
    const resendTimer = setTimeout(() => {
      setCanResend(true);
    }, 60000); // 1 minute

    return () => clearTimeout(resendTimer);
  }, []);

  // Format du timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Gestion saisie des codes
  const handleInputChange = (index: number, value: string) => {
    // Permettre seulement les chiffres
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Focus automatique sur l'input suivant
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Vérification automatique si code complet
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerification(newCode.join(''));
    }
  };

  // Gestion backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Gestion paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerification(pastedData);
    }
  };

  // Vérification du code
  const handleVerification = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    
    if (codeToVerify.length !== 6) {
      setError('Veuillez saisir le code complet à 6 chiffres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Vérification code:', codeToVerify, 'pour email:', currentEmail);

      const result = await verifyEmailCode(currentEmail, codeToVerify);

      if (result.success) {
        setSuccess('✅ Email vérifié avec succès !');
        
        // Marquer comme vérifié dans Supabase si userId fourni
        if (userId) {
          await markEmailAsVerified(userId);
        }

        // Délai pour montrer le succès puis callback
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      } else {
        setError(result.error.message || 'Code invalide ou expiré');
        // Réinitialiser le code en cas d'erreur
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('❌ Erreur vérification:', error);
      setError('Erreur de vérification. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // Renvoi du code
  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📧 Renvoi code pour:', currentEmail);

      const result = await resendVerificationCode(currentEmail, userId);

      if (result.success) {
        setSuccess('📧 Nouveau code envoyé !');
        setTimeLeft(300); // Reset timer
        setCanResend(false);
        
        // Réactiver le renvoi après 1 minute
        setTimeout(() => setCanResend(true), 60000);
        
        // Clear success message
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error.message || 'Impossible de renvoyer le code');
      }
    } catch (error) {
      console.error('❌ Erreur renvoi:', error);
      setError('Erreur de réseau. Réessayez.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Retour à l'inscription
            </button>
          )}
          
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Vérifiez votre email
          </h2>
          
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Nous avons envoyé un code à 6 chiffres à
          </p>
          
          <p className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
            {currentEmail || 'Récupération de l\'email...'}
          </p>
        </div>

        {/* Formulaire de vérification */}
        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {/* Inputs pour le code */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                Saisissez le code à 6 chiffres
              </label>
              
              <div className="flex justify-center space-x-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 text-center text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 inline mr-2" />
              {timeLeft > 0 ? (
                <span>Code valide encore {formatTime(timeLeft)}</span>
              ) : (
                <span className="text-red-500">Code expiré</span>
              )}
            </div>

            {/* Bouton Vérifier */}
            <button
              type="button"
              onClick={() => handleVerification()}
              disabled={loading || code.join('').length !== 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="animate-spin h-5 w-5" />
              ) : (
                <>
                  Vérifier le code
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>

          {/* Section Renvoi */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Vous n'avez pas reçu le code ?
              </p>
              
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || !canResend}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {canResend ? 'Renvoyer le code' : 'Disponible dans 1 minute'}
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            Vérifiez votre dossier spam si vous ne voyez pas l'email.
          </p>
          <p className="mt-1">
            Le code expire dans 5 minutes.
          </p>
        </div>

        {/* 🆘 Options d'échappement */}
        {(onBack || onSkip) && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Problème avec la vérification ?
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ← Retour
                  </button>
                )}
                
                {onSkip && !isRequired && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="inline-flex items-center justify-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-md shadow-sm text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Passer pour l'instant
                  </button>
                )}
              </div>
              
              {isRequired && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  ⚠️ La vérification email est obligatoire pour accéder à l'application
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}