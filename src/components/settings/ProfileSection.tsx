import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Camera, 
  Mail, 
  Shield, 
  Save, 
  Check, 
  AlertCircle,
  Lock,
  Crown,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUserSync } from '../../hooks/useUserSync';
import { SubscriptionSection } from './subscription/SubscriptionSection';
import { supabase } from '../../lib/supabase';

interface ProfileSectionProps {
  darkMode: boolean;
}

interface ProfileFormData {
  name: string;
  role: 'user' | 'admin';
}

export function ProfileSection({ darkMode }: ProfileSectionProps) {
  const { state } = useApp();
  const { user } = state;
  const { updateUserProfile } = useUserSync();

  // État local pour le formulaire - complètement isolé
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    role: 'user'
  });

  // États pour l'interface
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSubscriptionSection, setShowSubscriptionSection] = useState(false);

  // État pour la gestion de l'upload d'avatar
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Synchronisation initiale UNIQUEMENT - ne se déclenche qu'une fois
  useEffect(() => {
    if (user && !formData.name) {
      console.log('🔄 Initialisation du formulaire profil');
      setFormData({
        name: user.name || '',
        role: user.role || 'user'
      });
    }
  }, [user?.id]); // Dépendance sur l'ID uniquement

  // Détecter les modifications
  useEffect(() => {
    if (user) {
      const nameChanged = formData.name !== user.name;
      const roleChanged = formData.role !== user.role;
      setHasChanges(nameChanged || roleChanged);
    }
  }, [formData, user]);

  // Charger l'URL de l'avatar
  useEffect(() => {
    if (user?.avatar) {
      setAvatarUrl(user.avatar);
    }
  }, [user?.avatar]);

  // Fonction pour télécharger l'avatar
  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;

    try {
      setUploading(true);
      
      // Créer un nom de fichier unique
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Téléverser le fichier dans le bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Mettre à jour le profil avec la nouvelle URL
      await updateUserProfile(user.id, {
        avatar_url: data.publicUrl
      });

      setAvatarUrl(data.publicUrl);
      showMessage('success', 'Photo de profil mise à jour avec succès !');
    } catch (error) {
      console.error('Erreur lors du téléversement:', error);
      showMessage('error', 'Erreur lors du téléversement de l\'image');
    } finally {
      setUploading(false);
      setAvatarFile(null);
    }
  };

  // Gérer la sélection de fichier
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Vérifier le type et la taille du fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!validTypes.includes(file.type)) {
      showMessage('error', 'Type de fichier non supporté. Utilisez JPG, PNG ou GIF.');
      return;
    }
    
    if (file.size > maxSize) {
      showMessage('error', 'L\'image est trop volumineuse. Maximum 2MB.');
      return;
    }
    
    setAvatarFile(file);
    
    // Créer une URL temporaire pour l'aperçu
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);
    
    // Téléverser automatiquement
    setTimeout(() => {
      uploadAvatar();
    }, 100);
  };

  // Handlers optimisés avec useCallback
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
  }, []);

  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'user' | 'admin';
    setFormData(prev => ({ ...prev, role: value }));
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Sauvegarde du profil
  const handleSaveProfile = useCallback(async () => {
    if (!formData.name.trim() || !user) {
      showMessage('error', 'Le nom est obligatoire');
      return;
    }

    setIsLoading(true);

    try {
      await updateUserProfile(user.id, {
        name: formData.name.trim(),
        role: formData.role
      });

      showMessage('success', 'Profil mis à jour avec succès !');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showMessage('error', 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  }, [formData, user, updateUserProfile, showMessage]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  // Si on affiche la section d'abonnement
  if (showSubscriptionSection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => setShowSubscriptionSection(false)}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Gestion de l'abonnement
          </h2>
        </div>
        
        <SubscriptionSection darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3 animate-slide-down
          ${message.type === 'success' 
            ? darkMode 
              ? 'bg-green-800 text-green-200 border border-green-700' 
              : 'bg-green-100 text-green-800 border border-green-200'
            : darkMode 
              ? 'bg-red-800 text-red-200 border border-red-700' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Header moderne */}
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-2xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </span>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform cursor-pointer">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
            <input
              type="file"
              accept="image/jpeg, image/png, image/gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
        
        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Mon profil
        </h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Gérez vos informations personnelles
        </p>
        <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          JPG, PNG ou GIF. Taille max 2MB.
        </p>
      </div>

      {/* Formulaire principal */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-2xl p-8 space-y-8
      `}>
        {/* Champ Nom - Parfaitement fluide */}
        <div>
          <label 
            htmlFor="profile-name"
            className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Nom complet
          </label>
          <input
            id="profile-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            autoComplete="name"
            className={`
              w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-600' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-blue-50'
              }
              focus:outline-none focus:ring-4 focus:ring-blue-500/20
            `}
            placeholder="Entrez votre nom complet"
          />
        </div>

        {/* Email - Lecture seule avec design moderne */}
        <div>
          <label 
            htmlFor="profile-email"
            className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Adresse email
          </label>
          <div className="relative">
            <input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              className={`
                w-full px-4 py-3 pr-12 rounded-xl border-2 cursor-not-allowed
                ${darkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-gray-400' 
                  : 'bg-gray-50 border-gray-300 text-gray-500'
                }
              `}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Lock className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className={`text-xs mt-2 flex items-center space-x-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            <Shield className="w-3 h-3" />
            <span>L'email ne peut pas être modifié pour des raisons de sécurité</span>
          </p>
        </div>

        {/* Rôle */}
        <div>
          <label 
            htmlFor="profile-role"
            className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Rôle
          </label>
          <select
            id="profile-role"
            value={formData.role}
            onChange={handleRoleChange}
            className={`
              w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-4 focus:ring-blue-500/20
            `}
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>

        {/* Abonnement avec design moderne */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Abonnement
          </label>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`
                px-4 py-2 rounded-xl font-medium flex items-center space-x-2
                ${user.subscription === 'premium' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : user.subscription === 'basic'
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }
              `}>
                {user.subscription === 'premium' && <Crown className="w-4 h-4" />}
                <span>Plan {user.subscription}</span>
              </div>
              <button 
                onClick={() => setShowSubscriptionSection(true)}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium hover:underline transition-colors"
              >
                Gérer l'abonnement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton de sauvegarde - Apparaît seulement si modifications */}
      {hasChanges && (
        <div className="flex justify-center animate-slide-up">
          <button 
            onClick={handleSaveProfile}
            disabled={isLoading || !formData.name.trim()}
            className={`
              flex items-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all duration-200 shadow-lg
              ${isLoading || !formData.name.trim()
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:shadow-xl hover:scale-105'
              }
              text-white
            `}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Enregistrer les modifications</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}