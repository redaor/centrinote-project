import React, { useState } from 'react';
import { ArrowLeft, Smartphone, QrCode, Key, CheckCircle, Copy } from 'lucide-react';

interface TwoFactorAuthProps {
  darkMode: boolean;
  onBack: () => void;
}

export function TwoFactorAuth({ darkMode, onBack }: TwoFactorAuthProps) {
  const [step, setStep] = useState<'setup' | 'qr' | 'verify' | 'complete'>('setup');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes] = useState([
    'A1B2-C3D4-E5F6',
    'G7H8-I9J0-K1L2',
    'M3N4-O5P6-Q7R8',
    'S9T0-U1V2-W3X4',
    'Y5Z6-A7B8-C9D0'
  ]);

  const secretKey = 'JBSWY3DPEHPK3PXP';

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey);
  };

  const handleCopyBackupCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      setStep('complete');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'setup':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Configuration de l'authentification à deux facteurs
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Ajoutez une couche de sécurité supplémentaire à votre compte
              </p>
            </div>

            <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-6 rounded-lg`}>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Étapes de configuration :
              </h4>
              <ol className="space-y-2">
                <li className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
                  <span>Téléchargez une application d'authentification</span>
                </li>
                <li className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                  <span>Scannez le code QR ou entrez la clé secrète</span>
                </li>
                <li className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
                  <span>Entrez le code de vérification</span>
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-center`}>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h5 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Google Authenticator</h5>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recommandé</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-center`}>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h5 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Authy</h5>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Alternative</p>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'} text-center`}>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h5 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Microsoft Authenticator</h5>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Alternative</p>
              </div>
            </div>

            <button
              onClick={() => setStep('qr')}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              Continuer
            </button>
          </div>
        );

      case 'qr':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Scannez le code QR
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Utilisez votre application d'authentification pour scanner ce code
              </p>
            </div>

            <div className="flex justify-center">
              <div className={`${darkMode ? 'bg-white' : 'bg-white'} p-6 rounded-lg`}>
                <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-gray-400" />
                </div>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
              <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Ou entrez cette clé manuellement :
              </h4>
              <div className="flex items-center space-x-2">
                <code className={`flex-1 px-3 py-2 ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'} rounded border font-mono text-sm`}>
                  {secretKey}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              J'ai configuré l'application
            </button>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Vérification
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Entrez le code à 6 chiffres généré par votre application
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className={`
                  w-full px-4 py-3 text-center text-2xl font-mono rounded-lg border
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6}
              className={`
                w-full py-3 rounded-lg font-medium transition-all duration-200
                ${verificationCode.length === 6
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Vérifier
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Authentification à deux facteurs activée !
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Votre compte est maintenant protégé par l'authentification à deux facteurs
              </p>
            </div>

            <div className={`${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border p-4 rounded-lg`}>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
                Codes de récupération
              </h4>
              <p className={`text-sm mb-3 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                Sauvegardez ces codes dans un endroit sûr. Ils vous permettront d'accéder à votre compte si vous perdez votre téléphone.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <code className={`${darkMode ? 'text-yellow-300' : 'text-yellow-800'} font-mono text-sm`}>
                      {code}
                    </code>
                    <button
                      onClick={() => handleCopyBackupCode(code)}
                      className="p-1 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              Terminer
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={step === 'setup' ? onBack : () => {
            if (step === 'qr') setStep('setup');
            else if (step === 'verify') setStep('qr');
            else if (step === 'complete') onBack();
          }}
          className={`
            p-2 rounded-lg transition-colors
            ${darkMode 
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Authentification à deux facteurs
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Renforcez la sécurité de votre compte
            </p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-8
      `}>
        {renderStep()}
      </div>
    </div>
  );
}