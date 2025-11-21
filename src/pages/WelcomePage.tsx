import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const confirmed = searchParams.get('confirmed') === 'true';
  const email = searchParams.get('email') || user?.email || '';

  useEffect(() => {
    // Check if email is confirmed from URL param or user metadata
    if (confirmed || user?.email) {
      setIsEmailConfirmed(true);
    }
  }, [confirmed, user]);

  const handleAccessDashboard = () => {
    if (!isEmailConfirmed) {
      return; // Button disabled if email not confirmed
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 px-4">
      <div className="max-w-2xl w-full text-center">

        {/* Animated welcome icon */}
        <div className="flex justify-center mb-8 animate-bounce-slow">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Welcome title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in">
          Bienvenue sur Centrinote ! 🎉
        </h1>

        {/* User email */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Bonjour <span className="font-semibold text-blue-600 dark:text-blue-400">{email.split('@')[0]}</span> !
        </p>

        {/* Email confirmation status */}
        {isEmailConfirmed ? (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 mb-8 animate-slide-up">
            <div className="flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-2" />
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Votre email est confirmé !
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Vous pouvez maintenant accéder à toutes les fonctionnalités de Centrinote.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 animate-slide-up">
            <div className="flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Vérifiez votre email
              </h3>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Un email de confirmation vous a été envoyé à <strong>{email}</strong>.
              <br />
              Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 N'oubliez pas de vérifier votre dossier spam
            </p>
          </div>
        )}

        {/* Features preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-3xl mb-2">📝</div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Notes intelligentes</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Organisez vos idées</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-3xl mb-2">🎥</div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Réunions vidéo</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Collaborez en temps réel</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-3xl mb-2">🤖</div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">IA intégrée</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Résumés automatiques</p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleAccessDashboard}
          disabled={!isEmailConfirmed}
          className={`
            group relative w-full md:w-auto px-8 py-4 rounded-xl font-semibold text-lg
            transition-all duration-300 transform
            ${isEmailConfirmed
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 hover:shadow-2xl cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span className="flex items-center justify-center">
            {isEmailConfirmed ? 'Accéder à mon espace' : 'Email non confirmé'}
            {isEmailConfirmed && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
          </span>
        </button>

        {!isEmailConfirmed && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Le bouton sera activé après confirmation de votre email
          </p>
        )}

        {/* Footer help text */}
        <div className="mt-12 text-xs text-gray-500 dark:text-gray-400">
          <p>
            Besoin d'aide ? Consultez notre{' '}
            <button
              onClick={() => navigate('/faq')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              FAQ
            </button>{' '}
            ou contactez le{' '}
            <button
              onClick={() => navigate('/support')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              support
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}
