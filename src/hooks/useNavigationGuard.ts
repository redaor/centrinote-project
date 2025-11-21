import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export function useNavigationGuard() {
  // HOOK COMPLÈTEMENT DÉSACTIVÉ - Causait des boucles infinies
  // La synchronisation URL ↔ State est gérée par AppLayout.tsx
  
  const forceNavigationReset = () => {
    console.log('🚨 [NAV-GUARD] Reset forcé de la navigation');
    // Ne rien faire pour éviter les boucles
  };
  
  return { forceNavigationReset };
}