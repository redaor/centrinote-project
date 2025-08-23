import React from 'react';
import { SimplifiedZoomManager } from './SimplifiedZoomManager';

/**
 * Zoom Manager - Version simplifiée avec SDK
 * 
 * Remplace l'ancienne version OAuth par une approche SDK plus simple et sécurisée.
 * Plus besoin d'authentification OAuth complexe - utilise directement le Zoom Meeting SDK.
 */
export function ZoomManager() {
  return <SimplifiedZoomManager />;
}