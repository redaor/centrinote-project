import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface AvatarUploaderProps {
  currentAvatar?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  darkMode?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarUploader({
  currentAvatar,
  onUpload,
  onRemove,
  darkMode = false,
  disabled = false,
  size = 'lg',
  className = ''
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-16 h-16',
          icon: 'w-6 h-6',
          button: 'w-6 h-6',
          text: 'text-xs'
        };
      case 'md':
        return {
          container: 'w-20 h-20',
          icon: 'w-8 h-8',
          button: 'w-7 h-7',
          text: 'text-sm'
        };
      default:
        return {
          container: 'w-24 h-24',
          icon: 'w-10 h-10',
          button: 'w-8 h-8',
          text: 'text-base'
        };
    }
  };

  const sizes = getSizeClasses();

  const handleFileSelect = useCallback(async (file: File) => {
    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      setError('Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.');
      return;
    }

    if (file.size > maxSize) {
      setError('L\'image est trop volumineuse. Maximum 2MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Créer une URL temporaire pour l'aperçu
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Uploader le fichier
      await onUpload(file);
      
      // Nettoyer l'URL temporaire après succès
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Erreur lors de l\'upload:', err);
      setError('Erreur lors du téléversement de l\'image');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = useCallback(async () => {
    if (!onRemove) return;
    
    setIsUploading(true);
    try {
      await onRemove();
      setPreviewUrl(null);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression de l\'image');
    } finally {
      setIsUploading(false);
    }
  }, [onRemove]);

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const displayUrl = previewUrl || currentAvatar;

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Avatar Container */}
      <div className="relative">
        <div className={`
          ${sizes.container} rounded-full flex items-center justify-center shadow-lg
          ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-all duration-200 hover:scale-105
        `}>
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <Camera className={`${sizes.icon} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`${sizes.text} ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Photo
              </span>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {!disabled && (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className={`
              absolute -bottom-2 -right-2 ${sizes.button} rounded-full shadow-lg
              ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}
              text-white flex items-center justify-center transition-all duration-200
              ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
            `}
            aria-label="Changer la photo de profil"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Remove Button */}
        {displayUrl && onRemove && !disabled && (
          <button
            onClick={handleRemove}
            disabled={isUploading}
            className={`
              absolute -top-2 -right-2 w-6 h-6 rounded-full shadow-lg
              ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}
              text-white flex items-center justify-center transition-all duration-200
              ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
            `}
            aria-label="Supprimer la photo de profil"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        aria-label="Sélectionner une image"
      />

      {/* Error Message */}
      {error && (
        <div className={`
          text-center px-3 py-2 rounded-lg text-sm
          ${darkMode ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'}
        `}>
          {error}
        </div>
      )}

      {/* Help Text */}
      <div className="text-center">
        <p className={`${sizes.text} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          JPG, PNG, GIF ou WebP
        </p>
        <p className={`${sizes.text} ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Maximum 2MB
        </p>
      </div>
    </div>
  );
}
