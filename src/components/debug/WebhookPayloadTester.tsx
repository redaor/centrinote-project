// 🧪 Composant pour tester le payload enrichi vers n8n
import React, { useState } from 'react';
import { Send } from 'lucide-react';

export function WebhookPayloadTester() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const testEnrichedPayload = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Construire un payload de test complet
      const testPayload = {
        type: 'test.enriched',
        source: 'debug-tester',
        payload: {
          room: 'test-room-123',
          meeting_id: 'test-meeting-uuid',
          url: 'https://centrinote.daily.co/test-room-123',
          participant: {
            user_name: 'Test Organizer',
            email: 'organizer@test.com',
            app_user_id: 'test-org-uuid',
            role: 'organizer',
            session_id: 'test-session-123'
          }
        },
        organizer: {
          id: 'org-uuid-123',
          name: 'Jean Organisateur',
          email: 'jean@organisateur.com'
        },
        invited: [
          { name: 'Pierre Invité', email: 'pierre@invite.com', role: 'guest' },
          { name: 'Marie Invitée', email: 'marie@invite.com', role: 'guest' },
          { name: 'Paul Invité', email: 'paul@invite.com', role: 'guest' }
        ],
        meeting_title: 'Réunion Test Enrichie',
        timestamp: new Date().toISOString()
      };
      
      console.log('📤 [TEST] Sending enriched payload:', testPayload);
      
      // Récupérer l'URL du webhook depuis les variables d'environnement
      const webhookBase = import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv886297.hstgr.cloud';
      const meetingEventsPath = import.meta.env.VITE_N8N_MEETING_EVENTS || '/webhook/daily-meeting-events';
      const webhookUrl = new URL(meetingEventsPath, webhookBase).toString();
      
      console.log('🎯 [TEST] Webhook URL:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Test-Source': 'WebhookPayloadTester'
        },
        body: JSON.stringify(testPayload)
      });
      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
        payload: testPayload
      });
      
      console.log('✅ [TEST] Response:', {
        status: response.status,
        body: responseData
      });
      
    } catch (error) {
      console.error('❌ [TEST] Error:', error);
      setResult({
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        🧪 Test Payload Enrichi n8n
      </h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Ce test envoie un payload enrichi complet vers n8n avec :
          </p>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>✓ Données organizer (id, name, email)</li>
            <li>✓ Liste invited avec 3 invités</li>
            <li>✓ meeting_title</li>
            <li>✓ meeting_id et room_url</li>
          </ul>
        </div>
        
        <button
          onClick={testEnrichedPayload}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? 'Envoi en cours...' : 'Envoyer Payload Test'}</span>
        </button>
        
        {result && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Résultat :</h3>
            
            {result.error ? (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <p className="text-red-800 dark:text-red-300">❌ Erreur : {result.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="text-green-800 dark:text-green-300">
                    ✅ Status : {result.status} {result.statusText}
                  </p>
                </div>
                
                <details className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <summary className="cursor-pointer font-medium">Payload envoyé</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(result.payload, null, 2)}
                  </pre>
                </details>
                
                <details className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <summary className="cursor-pointer font-medium">Réponse n8n</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            💡 Dans n8n, utilisez <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">{`{{ $json.body }}`}</code> pour accéder aux données
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
            Exemple : <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">{`{{ $json.body.invited[0].name }}`}</code> = "Pierre Invité"
          </p>
        </div>
      </div>
    </div>
  );
}