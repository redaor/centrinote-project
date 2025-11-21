/**
 * Composant d'upload d'avatar
 * Conformément au cahier des charges - Section 5.4
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface AvatarUploaderProps {
  currentAvatar?: string;
  userName: string;
  onUpload: (file: File) => Promise<void>;
  isDark?: boolean;
  hasPendingFile?: boolean; // Indique un fichier en attente
  clearPreview?: boolean; // Signal pour effacer le preview
}

export function AvatarUploader({
  currentAvatar,
  userName,
  onUpload,
  isDark = false,
  hasPendingFile = false,
  clearPreview = false
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Effacer le preview quand clearPreview devient true
  useEffect(() => {
    if (clearPreview && preview) {
      setPreview(null);
      setUploadSuccess(false);
      setError(null);

      if (import.meta.env.DEV) {
        console.log('[AvatarUploader] Preview cleared after save');
      }
    }
  }, [clearPreview, preview]);

  // Initiales pour l'avatar par défaut
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadSuccess(false);

    // Validation côté client
    if (file.size > 2 * 1024 * 1024) {
      setError('La taille du fichier ne doit pas dépasser 2MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WebP');
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Passer le fichier au parent (sans upload immédiat)
    try {
      await onUpload(file);
      // Le fichier a été enregistré par le parent
    } catch (err: any) {
      setError(err.message);
      setPreview(null);
    }
  };

  const displayAvatar = preview || currentAvatar;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="relative group">
        <div
          className={`
            w-24 h-24 rounded-full overflow-hidden
            ${isDark ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-purple-500'}
            flex items-center justify-center
            transition-all duration-200
            ${isUploading ? 'opacity-50' : 'opacity-100'}
          `}
          style={{ minWidth: '96px', minHeight: '96px' }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white">
              {initials}
            </span>
          )}
        </div>

        {/* Overlay au hover */}
        {!isUploading && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`
              absolute inset-0 rounded-full
              bg-black/60 opacity-0 group-hover:opacity-100
              transition-opacity duration-200
              flex items-center justify-center
              cursor-pointer
              focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:opacity-100
            `}
            aria-label="Changer la photo de profil"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        id="avatar-upload-input"
        name="avatar-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Sélectionner une photo de profil"
      />

      {/* Bouton upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`
          px-4 py-2 rounded-lg
          text-sm font-medium
          transition-all duration-200
          ${isDark
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-4 focus:ring-blue-500/20
          transform hover:scale-105
        `}
        style={{ minHeight: '44px' }}
      >
        {isUploading ? 'Téléchargement...' : 'Changer la photo'}
      </button>

      {/* Message de succès */}
      {uploadSuccess && (
        <p className="text-sm text-green-500 text-center" role="status">
          ✓ Photo de profil mise à jour avec succès
        </p>
      )}

      {/* Message d'erreur */}
      {error && (
        <p className="text-sm text-red-500 text-center" role="alert">
          {error}
        </p>
      )}

      {/* Aide */}
      <p
        className={`
          text-xs text-center
          ${isDark ? 'text-gray-500' : 'text-gray-500'}
        `}
      >
        JPG, PNG ou WebP. Max 2MB.
      </p>
    </div>
  );
}
