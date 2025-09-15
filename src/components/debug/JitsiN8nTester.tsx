import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Send,
  Activity
} from 'lucide-react';
import { jitsiService } from '../../services/jitsiService';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
  response?: any;
}

export function JitsiN8nTester() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testRoomName, setTestRoomName] = useState('test-room-centrinote');

  const addTestResult = (test: Omit<TestResult, 'id' | 'timestamp'>) => {
    const result: TestResult = {
      ...test,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setTests(prev => [result, ...prev]);
    return result;
  };

  const clearTests = () => {
    setTests([]);
  };

  // Test 1: Vérification de la configuration
  const testConfiguration = async (): Promise<TestResult> => {
    const webhookUrl = import.meta.env.VITE_N8N_JITSI_WEBHOOK;
    
    if (!webhookUrl) {
      return addTestResult({
        name: 'Configuration Webhook',
        status: 'error',
        message: 'VITE_N8N_JITSI_WEBHOOK non configuré dans les variables d\'environnement'
      });
    }

    return addTestResult({
      name: 'Configuration Webhook',
      status: 'success',
      message: `URL webhook configurée: ${webhookUrl}`,
      response: { webhookUrl }
    });
  };

  // Test 2: Test de connectivité n8n
  const testConnectivity = async (): Promise<TestResult> => {
    try {
      const result = await jitsiService.triggerWebhook('connectivity_test', {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'debug_tester'
      });

      if (result.success) {
        return addTestResult({
          name: 'Connectivité n8n',
          status: 'success',
          message: 'Connexion n8n réussie',
          response: result
        });
      } else {
        return addTestResult({
          name: 'Connectivité n8n',
          status: 'error',
          message: `Erreur: ${result.error}`,
          response: result
        });
      }
    } catch (error) {
      return addTestResult({
        name: 'Connectivité n8n',
        status: 'error',
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  };

  // Test 3: Test événement participant_joined
  const testParticipantJoined = async (): Promise<TestResult> => {
    try {
      const result = await jitsiService.triggerWebhook('participant_joined', {
        roomName: testRoomName,
        participant: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@centrinote.fr',
          joinTime: new Date().toISOString()
        },
        totalParticipants: 1
      });

      return addTestResult({
        name: 'Participant Joined Event',
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Événement participant_joined envoyé' : `Erreur: ${result.error}`,
        response: result
      });
    } catch (error) {
      return addTestResult({
        name: 'Participant Joined Event',
        status: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  };

  // Test 4: Test événement recording_started
  const testRecordingStarted = async (): Promise<TestResult> => {
    try {
      const result = await jitsiService.triggerWebhook('recording_started', {
        roomName: testRoomName,
        recordingId: 'test-recording-123',
        participants: [
          { id: 'test-user-123', name: 'Test User', email: 'test@centrinote.fr' }
        ],
        sessionType: 'test',
        startTime: new Date().toISOString()
      });

      return addTestResult({
        name: 'Recording Started Event',
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Événement recording_started envoyé' : `Erreur: ${result.error}`,
        response: result
      });
    } catch (error) {
      return addTestResult({
        name: 'Recording Started Event',
        status: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  };

  // Test 5: Test événement recording_stopped
  const testRecordingStopped = async (): Promise<TestResult> => {
    try {
      const result = await jitsiService.triggerWebhook('recording_stopped', {
        roomName: testRoomName,
        recordingId: 'test-recording-123',
        duration: 300, // 5 minutes
        endTime: new Date().toISOString(),
        participants: [
          { id: 'test-user-123', name: 'Test User', email: 'test@centrinote.fr' }
        ]
      });

      return addTestResult({
        name: 'Recording Stopped Event',
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Événement recording_stopped envoyé' : `Erreur: ${result.error}`,
        response: result
      });
    } catch (error) {
      return addTestResult({
        name: 'Recording Stopped Event',
        status: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  };

  // Exécuter tous les tests
  const runAllTests = async () => {
    setIsRunning(true);
    clearTests();

    try {
      addTestResult({
        name: 'Démarrage des tests',
        status: 'success',
        message: 'Série de tests Jitsi + n8n démarrée'
      });

      // Exécution séquentielle des tests
      await testConfiguration();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testConnectivity();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testParticipantJoined();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testRecordingStarted();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testRecordingStopped();

      addTestResult({
        name: 'Tests terminés',
        status: 'success',
        message: 'Tous les tests ont été exécutés'
      });

    } catch (error) {
      addTestResult({
        name: 'Erreur générale',
        status: 'error',
        message: `Erreur lors de l'exécution des tests: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TestTube className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🧪 Testeur Jitsi + n8n
            </h2>
            <p className="text-gray-600">
              Diagnostic et test de l'intégration Jitsi Meet avec n8n
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={testRoomName}
            onChange={(e) => setTestRoomName(e.target.value)}
            placeholder="Nom de la room de test"
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Tests en cours...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Lancer les tests</span>
              </>
            )}
          </button>

          <button
            onClick={clearTests}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Effacer</span>
          </button>
        </div>
      </div>

      {/* Configuration actuelle */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          📋 Configuration actuelle
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Webhook URL:</span> 
            <code className="ml-2 px-2 py-1 bg-blue-100 rounded">
              {import.meta.env.VITE_N8N_JITSI_WEBHOOK || 'Non configuré'}
            </code>
          </div>
          <div>
            <span className="font-medium">Room de test:</span> 
            <code className="ml-2 px-2 py-1 bg-blue-100 rounded">
              {testRoomName}
            </code>
          </div>
        </div>
      </div>

      {/* Résultats des tests */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Résultats des tests ({tests.length})
        </h3>

        {tests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TestTube className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun test exécuté. Cliquez sur "Lancer les tests" pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tests.map((test) => (
              <div
                key={test.id}
                className={`p-4 rounded-lg border-l-4 ${
                  test.status === 'success'
                    ? 'bg-green-50 border-green-400'
                    : test.status === 'error'
                    ? 'bg-red-50 border-red-400'
                    : test.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-gray-50 border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {test.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {test.response && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Voir la réponse détaillée
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(test.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}