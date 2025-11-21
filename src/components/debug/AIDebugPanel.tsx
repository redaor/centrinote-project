import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Wifi, WifiOff, Link, Server, CheckCircle, XCircle, Info } from 'lucide-react';

export function AIDebugPanel() {
  const { state } = useApp();
  const { darkMode } = state;
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // URLs utilisées selon environnement
    const n8nBase = isDev && isLocalhost
      ? 'https://n8n.srv886297.hstgr.cloud/webhook'
      : '/.netlify/functions/n8n-proxy';
      
    const discussionPath = 'fb90cf61-7012-43fd-85e8-2cbc0f9282c7';
    
    const finalUrl = isDev && isLocalhost
      ? `${n8nBase}/${discussionPath}`
      : `${n8nBase}?path=${discussionPath}`;
    
    setDebugInfo({
      environment: isDev ? 'Development' : 'Production',
      isLocalhost,
      n8nBase,
      discussionPath,
      finalUrl,
      proxyUsed: !(isDev && isLocalhost),
      timestamp: new Date().toISOString()
    });
  }, []);
  
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
          <Server className="w-5 h-5" />
          Debug IA - Configuration des URLs
        </h2>
      </div>
      
      <div className="space-y-4">
        {/* Environnement */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Environnement
            </span>
            <span className={`px-2 py-1 rounded text-sm ${
              debugInfo.environment === 'Development' 
                ? 'bg-yellow-500/20 text-yellow-500' 
                : 'bg-green-500/20 text-green-500'
            }`}>
              {debugInfo.environment}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Localhost: {debugInfo.isLocalhost ? 'Oui' : 'Non'}
            </div>
            <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Proxy Netlify: {debugInfo.proxyUsed ? 'Activé' : 'Désactivé'}
            </div>
          </div>
        </div>
        
        {/* URL Discussion IA */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4 text-blue-500" />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              URL Discussion IA (Recherche IA)
            </span>
          </div>
          <div className={`text-xs font-mono p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} break-all`}>
            {debugInfo.finalUrl}
          </div>
        </div>
        
        {/* Webhook Path */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Webhook Path N8N
            </span>
          </div>
          <div className={`text-xs font-mono p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {debugInfo.discussionPath}
          </div>
        </div>
        
        {/* Statut */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <p className="font-medium mb-1">Configuration actuelle:</p>
              <ul className="space-y-1">
                <li>• Mode: {debugInfo.environment}</li>
                <li>• Proxy: {debugInfo.proxyUsed ? 'Via Netlify' : 'Direct N8N'}</li>
                <li>• URL finale: Voir ci-dessus</li>
                <li>• Dernière vérification: {new Date(debugInfo.timestamp || Date.now()).toLocaleTimeString()}</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Instructions de debug */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Pour débugger:
          </p>
          <ol className={`text-sm space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <li>1. Ouvrir la console (F12)</li>
            <li>2. Aller dans l'onglet Network</li>
            <li>3. Filtrer par "n8n" ou "webhook"</li>
            <li>4. Tester depuis "Recherche IA"</li>
            <li>5. Vérifier le statut de la requête</li>
          </ol>
        </div>
      </div>
    </div>
  );
}