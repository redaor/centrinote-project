// 📤 Hook pour gérer les uploads de fichiers de façon sécurisée - STRICTMODE SAFE
import { useCallback, useRef, useEffect } from 'react';

interface UploadOptions {
  accept?: string;
  multiple?: boolean;
  onFileSelect: (files: FileList | null) => void;
}

export function useFileUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  // Cleanup au démontage du composant
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      // Nettoyer l'input s'il existe encore
      if (inputRef.current && inputRef.current.parentNode) {
        try {
          inputRef.current.remove(); // Utiliser remove() plutôt que removeChild
        } catch (e) {
          // Ignorer silencieusement si déjà supprimé
        }
        inputRef.current = null;
      }
    };
  }, []);

  const selectFile = useCallback(({ accept = '*', multiple = false, onFileSelect }: UploadOptions) => {
    try {
      // Cleanup de l'input précédent s'il existe (idempotent)
      if (inputRef.current) {
        try {
          inputRef.current.remove();
        } catch (e) {
          // Ignorer si déjà supprimé
        }
        inputRef.current = null;
      }

      // Créer un nouvel input de façon sécurisée
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = 'none';
      
      // Fonction de cleanup réutilisable et idempotente
      const cleanup = () => {
        if (!mountedRef.current) return;
        
        setTimeout(() => {
          try {
            // Utiliser remove() qui est plus sûr
            input.remove();
          } catch (e) {
            // Ignorer si déjà supprimé
          }
          if (mountedRef.current && inputRef.current === input) {
            inputRef.current = null;
          }
        }, 100);
      };
      
      // Gestionnaire d'événement avec cleanup automatique
      const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        onFileSelect(target.files);
        cleanup();
      };

      const handleCancel = () => {
        onFileSelect(null);
        cleanup();
      };

      input.addEventListener('change', handleChange, { once: true });
      input.addEventListener('cancel', handleCancel, { once: true });
      
      // Ajouter au DOM et déclencher
      document.body.appendChild(input);
      inputRef.current = input;
      
      // Déclencher le sélecteur
      input.click();

      // Cleanup de sécurité après 30 secondes (au cas où l'utilisateur ne fait rien)
      setTimeout(() => {
        if (inputRef.current === input) {
          cleanup();
        }
      }, 30000);

      return { success: true };
    } catch (error) {
      console.error('[UPLOAD] Erreur:', error);
      return { success: false, error };
    }
  }, []);

  return { selectFile };
}