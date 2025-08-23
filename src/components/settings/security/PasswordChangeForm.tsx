import React, { useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Key
} from 'lucide-react';

interface PasswordChangeFormProps {
  darkMode: boolean;
  onBack: () => void;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

export function PasswordChangeForm({ darkMode, onBack }: PasswordChangeFormProps) {
  // État local persistant - ne sera jamais réinitialisé lors des changements d'onglets
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<PasswordFormData>>({});

  // Fonctions de gestion optimisées pour éviter les re-renders
  const handleCurrentPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, currentPassword: value }));
    if (errors.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: undefined }));
    }
  }, [errors.currentPassword]);

  const handleNewPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, newPassword: value }));
    if (errors.newPassword) {
      setErrors(prev => ({ ...prev, newPassword: undefined }));
    }
  }, [errors.newPassword]);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, confirmPassword: value }));
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  }, [errors.confirmPassword]);

  const togglePasswordVisibility = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    else feedback.push('Au moins 8 caractères');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Une lettre minuscule');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Une lettre majuscule');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Un chiffre');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else feedback.push('Un caractère spécial');

    let color = 'red';
    if (score >= 4) color = 'green';
    else if (score >= 3) color = 'yellow';
    else if (score >= 2) color = 'orange';

    return { score, feedback, color };
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PasswordFormData> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Le mot de passe actuel est requis';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmation est requise';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe doit être différent de l\'actuel';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Simulation d'appel API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Réinitialiser le formulaire après succès
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setMessage({
        type: 'success',
        text: 'Mot de passe modifié avec succès ! Vous serez déconnecté dans quelques secondes.'
      });

      // Simulation de déconnexion après 3 secondes
      setTimeout(() => {
        setMessage(null);
        onBack();
      }, 3000);

    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erreur lors de la modification du mot de passe. Veuillez réessayer.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.newPassword);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={onBack}
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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Modifier le mot de passe
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Choisissez un mot de passe fort et unique
            </p>
          </div>
        </div>
      </div>

      {/* Message de notification */}
      {message && (
        <div className={`
          p-4 rounded-lg border flex items-center space-x-3
          ${message.type === 'success' 
            ? darkMode 
              ? 'bg-green-900/20 border-green-800 text-green-400' 
              : 'bg-green-50 border-green-200 text-green-800'
            : darkMode 
              ? 'bg-red-900/20 border-red-800 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-800'
          }
        `}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulaire */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-8
      `}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ caché pour l'accessibilité */}
          <input 
            type="text" 
            name="username" 
            autoComplete="username" 
            style={{ display: 'none' }} 
            readOnly 
            tabIndex={-1}
          />

          {/* Mot de passe actuel */}
          <div>
            <label 
              htmlFor="current-password" 
              className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Mot de passe actuel *
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Lock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input
                id="current-password"
                name="current-password"
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={handleCurrentPasswordChange}
                autoComplete="current-password"
                className={`
                  w-full pl-10 pr-12 py-3 rounded-lg border transition-colors
                  ${errors.currentPassword 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
                placeholder="Entrez votre mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              >
                {showPasswords.current ? (
                  <EyeOff className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <Eye className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.currentPassword}</span>
              </p>
            )}
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label 
              htmlFor="new-password" 
              className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Nouveau mot de passe *
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Shield className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input
                id="new-password"
                name="new-password"
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleNewPasswordChange}
                autoComplete="new-password"
                className={`
                  w-full pl-10 pr-12 py-3 rounded-lg border transition-colors
                  ${errors.newPassword 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
                placeholder="Entrez votre nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              >
                {showPasswords.new ? (
                  <EyeOff className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <Eye className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
            </div>
            
            {/* Indicateur de force du mot de passe */}
            {formData.newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Force du mot de passe
                  </span>
                  <span className={`text-sm font-medium text-${passwordStrength.color}-500`}>
                    {passwordStrength.score === 5 ? 'Très fort' :
                     passwordStrength.score === 4 ? 'Fort' :
                     passwordStrength.score === 3 ? 'Moyen' :
                     passwordStrength.score === 2 ? 'Faible' : 'Très faible'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full bg-${passwordStrength.color}-500 transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="mt-2">
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Manque : {passwordStrength.feedback.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.newPassword}</span>
              </p>
            )}
          </div>

          {/* Confirmation du mot de passe */}
          <div>
            <label 
              htmlFor="confirm-password" 
              className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Confirmer le nouveau mot de passe *
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Shield className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                autoComplete="new-password"
                className={`
                  w-full pl-10 pr-12 py-3 rounded-lg border transition-colors
                  ${errors.confirmPassword 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
                placeholder="Confirmez votre nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              >
                {showPasswords.confirm ? (
                  <EyeOff className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <Eye className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onBack}
              className={`
                px-6 py-3 rounded-lg border font-medium transition-colors
                ${darkMode 
                  ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg'
                }
                text-white
              `}
            >
              {isLoading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}