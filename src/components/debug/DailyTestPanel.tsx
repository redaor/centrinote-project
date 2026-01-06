// 🧪 Panel de test Daily.co pour diagnostiquer les problèmes
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Video, Webhook } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface TestResult {
  step: string;
  status: 'pending' | 'testing' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function DailyTestPanel() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [roomCreated, setRoomCreated] = useState<any>(null);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (step: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(r => 
      r.step === step ? { ...r, ...updates } : r
    ));
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    setRoomCreated(null);

    // Test 1: Vérifier l'utilisateur
    addResult({
      step: 'Authentification',
      status: 'testing',
      message: 'Vérification utilisateur...'
    });

    if (!user) {
      updateResult('Authentification', {
        status: 'error',
        message: 'Utilisateur non connecté'
      });
      setTesting(false);
      return;
    }

    updateResult('Authentification', {
      status: 'success',
      message: `Utilisateur: ${user.email}`,
      data: { userId: user.id }
    });

    // Test 2: Vérifier les variables d'environnement côté client
    addResult({
      step: 'Variables environnement',
      status: 'testing',
      message: 'Vérification configuration...'
    });

    const envVars = {
      dailyApiKey: import.meta.env.VITE_DAILY_API_KEY,
      dailyDomain: import.meta.env.VITE_DAILY_DOMAIN,
      n8nRecording: import.meta.env.VITE_N8N_DAILY_RECORDING,
      n8nEvents: import.meta.env.VITE_N8N_DAILY_EVENTS,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL
    };

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      updateResult('Variables environnement', {
        status: 'error',
        message: `Variables manquantes: ${missingVars.join(', ')}`
      });
    } else {
      updateResult('Variables environnement', {
        status: 'success',
        message: 'Toutes les variables sont configurées',
        data: {
          dailyDomain: envVars.dailyDomain,
          hasWebhooks: !!envVars.n8nRecording && !!envVars.n8nEvents
        }
      });
    }

    // Test 3: Tester la Supabase Edge Function create-meeting
    addResult({
      step: 'Supabase Edge Function',
      status: 'testing',
      message: 'Test création réunion...'
    });

    try {
      const testData = {
        title: `Test Daily.co - ${new Date().toLocaleTimeString()}`,
        description: 'Réunion de test pour vérifier l\'intégration',
        scheduled_at: new Date().toISOString(),
        duration_minutes: 30,
        participants: [],
        created_by: user.id
      };

      console.log('🧪 [DAILY-TEST] Envoi données test:', testData);

      // ✅ Utiliser la Supabase Edge Function (avec secrets Supabase)
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-meeting', {
        body: testData
      });

      console.log('📡 [DAILY-TEST] Réponse Supabase Edge Function:', responseData);

      if (invokeError || !responseData?.success) {
        updateResult('Supabase Edge Function', {
          status: 'error',
          message: `Erreur: ${invokeError?.message || responseData?.error || 'Inconnue'}`,
          data: responseData || invokeError
        });

        // Vérifier si c'est un problème de secrets
        if (responseData?.debug?.includes('DAILY_API_KEY')) {
          addResult({
            step: 'Configuration Supabase',
            status: 'error',
            message: 'DAILY_API_KEY non configurée dans Supabase Secrets'
          });
        }

        setTesting(false);
        return;
      }

      updateResult('Supabase Edge Function', {
        status: 'success',
        message: 'Réunion créée avec succès!',
        data: {
          meetingId: responseData.meetingId,
          roomName: responseData.roomName,
          roomUrl: responseData.roomUrl
        }
      });

      setRoomCreated(responseData);

      // Test 4: Vérifier la salle Daily.co
      if (responseData.roomUrl) {
        addResult({
          step: 'Vérification Daily.co',
          status: 'testing',
          message: 'Vérification de la salle...'
        });

        // Vérifier que l'URL est valide
        const isValidUrl = responseData.roomUrl.includes('daily.co');
        
        if (isValidUrl) {
          updateResult('Vérification Daily.co', {
            status: 'success',
            message: 'Salle Daily.co accessible',
            data: { url: responseData.roomUrl }
          });
        } else {
          updateResult('Vérification Daily.co', {
            status: 'error',
            message: 'URL Daily.co invalide'
          });
        }
      }

      // Test 5: Vérifier les webhooks
      addResult({
        step: 'Webhooks n8n',
        status: responseData.dailyConfig?.hasWebhooks ? 'success' : 'error',
        message: responseData.dailyConfig?.hasWebhooks 
          ? 'Webhooks configurés' 
          : 'Webhooks non configurés sur Netlify'
      });

    } catch (error) {
      console.error('❌ [DAILY-TEST] Erreur:', error);
      updateResult('Fonction Netlify', {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: error
      });
    }

    setTesting(false);
  };

  const deleteTestRoom = async () => {
    if (!roomCreated) return;

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.functions.invoke('delete-meeting', {
        body: { meetingId: roomCreated.meetingId }
      });

      if (!error && data?.success) {
        setRoomCreated(null);
        addResult({
          step: 'Nettoyage',
          status: 'success',
          message: 'Réunion de test supprimée'
        });
      } else {
        throw new Error(error?.message || data?.error || 'Erreur suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      addResult({
        step: 'Nettoyage',
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur suppression'
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🧪 Test Daily.co Integration
          </h2>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Diagnostiquer les problèmes de configuration
          </p>
        </div>
        
        <button
          onClick={runTests}
          disabled={testing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {testing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Test en cours...</span>
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              <span>Lancer les tests</span>
            </>
          )}
        </button>
      </div>

      {/* Résultats des tests */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {result.step}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {result.message}
                  </p>
                  
                  {result.data && (
                    <pre className={`mt-2 p-2 rounded text-xs overflow-auto ${
                      darkMode 
                        ? 'bg-gray-800 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions après test */}
      {roomCreated && (
        <div className={`mt-6 p-4 rounded-lg ${
          darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-blue-400' : 'text-blue-800'
          }`}>
            ✅ Réunion de test créée
          </h3>
          <div className="space-y-2">
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              URL: {roomCreated.roomUrl}
            </p>
            <div className="flex space-x-3">
              <a
                href={roomCreated.roomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Ouvrir la salle
              </a>
              <button
                onClick={deleteTestRoom}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Supprimer la réunion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className={`mt-6 p-4 rounded-lg border ${
        darkMode
          ? 'bg-gray-700/50 border-gray-600'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <h3 className={`font-semibold mb-2 ${
          darkMode ? 'text-yellow-400' : 'text-yellow-800'
        }`}>
          📋 Checklist Configuration Supabase Secrets
        </h3>
        <ul className={`text-sm space-y-1 ${
          darkMode ? 'text-yellow-300' : 'text-yellow-700'
        }`}>
          <li>✅ DAILY_API_KEY (dans Supabase Secrets)</li>
          <li>✅ SUPABASE_SERVICE_ROLE_KEY (dans Supabase Secrets)</li>
          <li>✅ VITE_DAILY_DOMAIN (dans .env)</li>
          <li>✅ VITE_N8N_DAILY_RECORDING (dans Supabase Secrets)</li>
          <li>✅ VITE_N8N_DAILY_EVENTS (dans Supabase Secrets)</li>
          <li>✅ VITE_SUPABASE_URL (dans .env)</li>
          <li>✅ VITE_SUPABASE_ANON_KEY (dans .env)</li>
        </ul>
        <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          💡 Utilise maintenant la Supabase Edge Function au lieu de Netlify Functions
        </p>
      </div>
    </div>
  );
}