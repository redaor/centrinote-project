import { useId } from 'react';

/**
 * Hook pour générer automatiquement id/name pour les champs de formulaire
 * Élimine les warnings d'accessibilité
 */
export function useFormIds(count: number = 1) {
  const baseId = useId();
  
  const ids = Array.from({ length: count }, (_, index) => ({
    id: `field-${baseId}-${index}`,
    name: `field-${baseId}-${index}`
  }));
  
  return count === 1 ? ids[0] : ids;
}

/**
 * Génère des attributs id/name pour un input
 */
export function generateInputProps(prefix?: string) {
  const id = `${prefix || 'input'}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: id
  };
}