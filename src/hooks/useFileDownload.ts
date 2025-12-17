// 📥 Hook pour gérer les téléchargements de fichiers de façon sécurisée - STRICTMODE SAFE
import { useCallback, useRef, useEffect } from 'react';

interface DownloadOptions {
  filename: string;
  data: string | Blob;
  mimeType?: string;
}

export function useFileDownload() {
  const activeLinksRef = useRef<Set<HTMLAnchorElement>>(new Set());
  const mountedRef = useRef(true);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      // Nettoyer tous les liens actifs
      const activeLinks = activeLinksRef.current;
      activeLinks.forEach(link => {
        try {
          link.remove();
        } catch (e) {
          // Ignorer si déjà supprimé
        }
      });
      activeLinks.clear();
    };
  }, []);

  const downloadFile = useCallback(({ filename, data, mimeType = 'application/octet-stream' }: DownloadOptions) => {
    try {
      // Créer le blob si les données sont une chaîne
      const blob = data instanceof Blob 
        ? data 
        : new Blob([data], { type: mimeType });
      
      const url = URL.createObjectURL(blob);
      
      // Créer et utiliser le lien de téléchargement de façon sécurisée
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Fonction de cleanup idempotente
      const cleanup = () => {
        try {
          // Utiliser remove() qui est plus sûr que removeChild
          link.remove();
          activeLinksRef.current.delete(link);
        } catch (e) {
          // Ignorer si déjà supprimé
        } finally {
          // Toujours libérer l'URL blob
          URL.revokeObjectURL(url);
        }
      };
      
      try {
        // Ajouter au DOM
        document.body.appendChild(link);
        activeLinksRef.current.add(link);
        
        // Déclencher le téléchargement
        link.click();
        
        // Cleanup après un court délai
        if (mountedRef.current) {
          setTimeout(() => {
            if (mountedRef.current) {
              cleanup();
            }
          }, 100);
        } else {
          // Si déjà démonté, nettoyer immédiatement
          cleanup();
        }
        
        return { success: true };
      } catch (error) {
        console.error('[DOWNLOAD] Erreur:', error);
        cleanup();
        return { success: false, error };
      }
    } catch (error) {
      console.error('[DOWNLOAD] Erreur création blob:', error);
      return { success: false, error };
    }
  }, []);

  return { downloadFile };
}