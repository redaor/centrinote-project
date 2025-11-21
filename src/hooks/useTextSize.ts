import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type TextSize = 's' | 'm' | 'l';

interface UseTextSizeReturn {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

export function useTextSize(): UseTextSizeReturn {
  const [storedTextSize, setStoredTextSize] = useLocalStorage<TextSize>('centrinote-text-size', 'm');
  const [textSize, setTextSizeState] = useState<TextSize>(storedTextSize);

  // Fonction pour appliquer la taille du texte au DOM
  const applyTextSize = useCallback((size: TextSize) => {
    const root = document.documentElement;

    // Retirer toutes les classes de taille
    root.classList.remove('text-size-s', 'text-size-m', 'text-size-l');

    // Ajouter la classe correspondante
    root.classList.add(`text-size-${size}`);

    // Définir une variable CSS custom pour une utilisation flexible
    // Utiliser rem au lieu de px pour que ça fonctionne avec les classes Tailwind
    const fontSizeMap = {
      's': '0.875rem', // 14px à taille normale = 0.875rem
      'm': '1rem',     // 16px à taille normale = 1rem (base)
      'l': '1.125rem'  // 18px à taille normale = 1.125rem
    };
    
    // Définir la variable ET aussi directement sur html avec font-size pour cascade streaming
    root.style.setProperty('--base-font-size', fontSizeMap[size]);
    
    // ✅ IMPORTANT : Modifier directement font-size sur html pour que les rem dans Tailwind héritent
    // Cela permet aux classes Tailwind qui utilisent rem d'hériter de cette taille de base
    root.style.fontSize = fontSizeMap[size];
    
    // Log pour debug
    if (process.env.NODE_ENV === 'development') {
      console.log('[useTextSize] Taille appliquée:', size, fontSizeMap[size]);
    }
  }, []);

  // Initialiser la taille du texte au montage
  useEffect(() => {
    applyTextSize(textSize);
  }, [textSize, applyTextSize]);

  // Fonction pour changer la taille du texte
  const handleSetTextSize = useCallback((newSize: TextSize) => {
    setTextSizeState(newSize);
    setStoredTextSize(newSize);
    applyTextSize(newSize);

    // ✅ Dispatcher un événement custom pour synchronisation same-tab
    window.dispatchEvent(new CustomEvent('text-size-changed', {
      detail: { textSize: newSize }
    }));
  }, [setStoredTextSize, applyTextSize]);

  return {
    textSize,
    setTextSize: handleSetTextSize
  };
}
