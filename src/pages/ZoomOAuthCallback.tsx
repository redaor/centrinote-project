// ❌ ANCIEN COMPOSANT CALLBACK OAUTH - DÉSACTIVÉ
// Remplacé par Supabase OAuth natif qui gère automatiquement les callbacks
// ========================================================================

/* COMPOSANT DÉSACTIVÉ - LE CALLBACK EST GÉRÉ AUTOMATIQUEMENT PAR SUPABASE

import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';

function ZoomOAuthCallbackDisabled() {
*/

import React from 'react';

export default function ZoomOAuthCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl text-red-600">⚠️</div>
          </div>
          
          <h2 className="text-xl font-semibold mb-4 text-red-800">
            Ancien système OAuth désactivé
          </h2>
          
          <p className="text-red-600 mb-4">
            Ce composant faisait partie de l'ancien système OAuth manuel.
          </p>
          
          <p className="text-red-600 text-sm mb-4">
            Le nouveau système utilise <strong>Supabase OAuth natif</strong> qui gère automatiquement les callbacks.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
            <strong>Nouvelle URL de callback :</strong><br/>
            <code className="text-xs">https://your-project.supabase.co/auth/v1/callback</code>
          </div>
          
          <p className="text-gray-500 text-xs mt-4">
            Utilisez SupabaseZoomAuth.tsx pour l'authentification Zoom
          </p>
        </div>
      </div>
    </div>
  );
}