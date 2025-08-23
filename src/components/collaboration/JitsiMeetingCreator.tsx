import React, { useState } from 'react';
import { 
  Video, 
  Users, 
  Shield, 
  Lock, 
  Settings, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Mic,
  Monitor,
  MessageCircle,
  FileText
} from 'lucide-react';
import { jitsiService, JitsiMeetingRoom, JitsiMeetingConfig } from '../../services/jitsiService';
import { useApp } from '../../contexts/AppContext';

interface JitsiMeetingCreatorProps {
  darkMode: boolean;
  onMeetingCreated: (room: JitsiMeetingRoom) => void;
  onCancel: () => void;
}

export function JitsiMeetingCreator({ darkMode, onMeetingCreated, onCancel }: JitsiMeetingCreatorProps) {
  const { state } = useApp();
  const { user } = state;
  
  const [formData, setFormData] = useState({
    subject: '',
    password: '',
    enableE2EE: true,
    enableLobby: false,
    enableRecording: true,
    enableChat: true,
    enableScreenSharing: true,
    enableWhiteboard: true
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compatibility, setCompatibility] = useState<{ compatible: boolean; issues: string[] } | null>(null);

  // Vérifier la compatibilité au montage
  React.useEffect(() => {
    const checkCompatibility = async () => {
      const compat = jitsiService.checkBrowserCompatibility();
      setCompatibility(compat);
      
      if (compat.compatible) {
        // Tester les permissions média
        try {
          await jitsiService.testMediaPermissions();
        } catch (err) {
          console.warn('Permissions média non disponibles:', err);
        }
      }
    };
    
    checkCompatibility();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.subject.trim()) {
      setError('Le sujet de la réunion est obligatoire');
      return false;
    }
    
    if (formData.password && formData.password.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères');
      return false;
    }
    
    return true;
  };

  const handleCreateMeeting = async () => {
    if (!validateForm() || !user) return;
    
    setIsCreating(true);
    setError(null);
    
    try {
      const config: Partial<JitsiMeetingConfig> = {
        displayName: user.name,
        email: user.email,
        subject: formData.subject.trim(),
        password: formData.password || undefined,
        enableE2EE: formData.enableE2EE,
        enableLobby: formData.enableLobby,
        enableRecording: formData.enableRecording,
        enableChat: formData.enableChat,
        enableScreenSharing: formData.enableScreenSharing,
        enableWhiteboard: formData.enableWhiteboard
      };
      
      const room = jitsiService.createMeetingRoom(config);
      
      // Simuler un délai de création
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onMeetingCreated(room);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la réunion');
    } finally {
      setIsCreating(false);
    }
  };

  // Affichage d'incompatibilité
  if (compatibility && !compatibility.compatible) {
    return (
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-8 text-center
      `}>
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Navigateur non compatible
        </h3>
        <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="mb-2">Votre navigateur ne supporte pas toutes les fonctionnalités requises :</p>
          <ul className="text-sm space-y-1">
            {compatibility.issues.map((issue, index) => (
              <li key={index}>• {issue}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Nous recommandons d'utiliser Chrome, Firefox, Safari ou Edge récents.
          </p>
          <button
            onClick={onCancel}
            className={`
              px-6 py-2 rounded-lg border transition-colors
              ${darkMode 
                ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Créer une réunion vidéo
          </h2>
        </div>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Réunion sécurisée avec Jitsi Meet - Aucune installation requise
        </p>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className={`
          p-4 rounded-lg border flex items-center space-x-3
          ${darkMode 
            ? 'bg-red-900/20 border-red-800 text-red-400' 
            : 'bg-red-50 border-red-200 text-red-800'
          }
        `}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulaire */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6 space-y-6
      `}>
        {/* Informations de base */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Informations de la réunion
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Sujet de la réunion *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Ex: Révision Machine Learning - Équipe Centrinote"
                className={`
                  w-full px-3 py-2 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Mot de passe (optionnel)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Laisser vide pour une réunion ouverte"
                  className={`
                    w-full px-3 py-2 pr-10 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  ) : (
                    <Eye className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Options de sécurité */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Sécurité et confidentialité
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Chiffrement de bout en bout (E2EE)
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Chiffrement maximum pour la confidentialité
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleInputChange('enableE2EE', !formData.enableE2EE)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${formData.enableE2EE ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.enableE2EE ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Salle d'attente (Lobby)
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Contrôler qui peut rejoindre la réunion
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleInputChange('enableLobby', !formData.enableLobby)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${formData.enableLobby ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.enableLobby ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Fonctionnalités disponibles
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'enableRecording',
                icon: Video,
                title: 'Enregistrement',
                description: 'Enregistrer la réunion localement'
              },
              {
                key: 'enableChat',
                icon: MessageCircle,
                title: 'Chat intégré',
                description: 'Messages texte pendant la réunion'
              },
              {
                key: 'enableScreenSharing',
                icon: Monitor,
                title: 'Partage d\'écran',
                description: 'Partager votre écran ou applications'
              },
              {
                key: 'enableWhiteboard',
                icon: FileText,
                title: 'Tableau blanc',
                description: 'Collaboration visuelle en temps réel'
              }
            ].map((feature) => {
              const Icon = feature.icon;
              const isEnabled = formData[feature.key as keyof typeof formData] as boolean;
              
              return (
                <div
                  key={feature.key}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all duration-200
                    ${isEnabled
                      ? darkMode
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-blue-500 bg-blue-50'
                      : darkMode
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  onClick={() => handleInputChange(feature.key, !isEnabled)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${
                      isEnabled 
                        ? darkMode ? 'text-blue-400' : 'text-blue-600'
                        : darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    {isEnabled && (
                      <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    )}
                  </div>
                  <h4 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informations techniques */}
        <div className={`
          ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}
          border rounded-lg p-4
        `}>
          <div className="flex items-start space-x-3">
            <CheckCircle className={`w-5 h-5 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                Avantages de Jitsi Meet
              </h4>
              <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                <li>• 100% gratuit et open source</li>
                <li>• Aucune installation ou compte requis</li>
                <li>• Compatible tous navigateurs et mobiles</li>
                <li>• Serveurs européens sécurisés</li>
                <li>• Chiffrement de bout en bout disponible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
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
          onClick={handleCreateMeeting}
          disabled={isCreating || !formData.subject.trim()}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isCreating || !formData.subject.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg'
            }
            text-white
          `}
        >
          {isCreating ? 'Création...' : 'Créer la réunion'}
        </button>
      </div>
    </div>
  );
}