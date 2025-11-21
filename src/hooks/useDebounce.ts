import { useEffect, useState } from 'react';

/**
 * Hook personnalisé pour debouncer une valeur
 * Évite les re-renders excessifs lors de la frappe rapide
 *
 * @param value - La valeur à debouncer (ex: searchTerm)
 * @param delay - Délai en millisecondes avant de mettre à jour (défaut: 300ms)
 * @returns La valeur debouncée
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * // Le filtrage n'utilise que debouncedSearchTerm
 * const filtered = vocabulary.filter(v => v.word.includes(debouncedSearchTerm));
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui mettra à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si value change avant la fin du délai
    // Cela annule l'ancien timer et en crée un nouveau
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
