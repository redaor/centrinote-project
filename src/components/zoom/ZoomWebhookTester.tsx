import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Globe,
  Settings,
  Eye,
  Code
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { n8nWebhookService } from '../../services/n8nWebhookService';

interface WebhookTestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  duration: number;
}

export function ZoomWebhookTester() {
  const { state } = useApp();
  const { darkMode } = state;
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingZoomEvent, setIsTestingZoomEvent] = useState(false);
  const [connectionResult, setConnectionResult] = useState<WebhookTestResult | null>(null);
  const [zoomEventResult, setZoomEventResult] = useState<WebhookTestResult | null>(null);
  const [showPayloadDetails, setShowPayloadDetails] = useState(false);

  const webhookUrl = 'https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75';

  const testWebhookConnection = async () => {
    setIsTestingConnection(true);
    const startTime = Date.now();

    try {
      const result = await n8nWebhookService.testWebhookConnectivity();
      const duration = Date.now() - startTime;

      setConnectionResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful' : 'Connection failed'),
        data: result.data,
        error: result.error,
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      setConnectionResult({
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testZoomWebhookEvent = async () => {
    setIsTestingZoomEvent(true);
    const startTime = Date.now();

    try {
      // Simulate a Zoom meeting event
      const testEventData = {
        meeting: {
          id: 'test_meeting_123',
          topic: 'Test Meeting - Webhook Integration',
          start_time: new Date().toISOString(),
          duration: 30,
          host_email: 'test@example.com'
        },
        participants: [
          {
            name: 'Test User',
            email: 'testuser@example.com',
            join_time: new Date().toISOString()
          }
        ],
        zoom_payload: {
          event: 'meeting.started',
          account_id: 'test_account',
          object: {
            uuid: 'test_uuid_123',
            id: 'test_meeting_123',
            topic: 'Test Meeting - Webhook Integration',
            type: 2,
            start_time: new Date().toISOString(),
            host_id: 'test_host_123'
          }
        }
      };

      const result = await n8nWebhookService.sendZoomWebhook(
        'meeting.started',
        testEventData,
        'test_meeting_123'
      );

      const duration = Date.now() - startTime;

      setZoomEventResult({
        success: result.success,
        message: result.message || (result.success ? 'Zoom event sent successfully' : 'Failed to send Zoom event'),
        data: result.data,
        error: result.error,
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      setZoomEventResult({
        success: false,
        message: 'Zoom event test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
    } finally {
      setIsTestingZoomEvent(false);
    }
  };

  const getStatusIcon = (result: WebhookTestResult | null, isLoading: boolean) => {
    if (isLoading) {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (!result) {
      return <Activity className="w-5 h-5 text-gray-400" />;
    }
    return result.success ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (result: WebhookTestResult | null) => {
    if (!result) return 'text-gray-500';
    return result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Zoom Webhook Tester
        </h2>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Test your N8N webhook connectivity and Zoom integration
        </p>
      </div>

      {/* Webhook URL Info */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6
      `}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Globe className="w-6 h-6 text-blue-500" />
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              N8N Webhook Configuration
            </h3>
          </div>
          <button
            onClick={() => setShowPayloadDetails(!showPayloadDetails)}
            className={`
              flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            `}
          >
            {showPayloadDetails ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
            <span className="text-sm">{showPayloadDetails ? 'Hide Details' : 'Show Details'}</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Webhook URL:
            </label>
            <div className={`
              mt-1 p-3 rounded-lg font-mono text-sm border
              ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}
            `}>
              {webhookUrl}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Method:
              </span>
              <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                POST
              </span>
            </div>
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Content-Type:
              </span>
              <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                application/json
              </span>
            </div>
          </div>

          {showPayloadDetails && (
            <details className="mt-4">
              <summary className={`cursor-pointer font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Example Payload Structure
              </summary>
              <pre className={`
                mt-2 p-4 rounded-lg text-xs overflow-auto
                ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}
              `}>
{`{
  "source": "centrinote_zoom",
  "event": "meeting.started",
  "timestamp": "2024-08-06T17:30:00Z",
  "data": {
    "meeting": {
      "id": "123456789",
      "topic": "Team Meeting",
      "start_time": "2024-08-06T17:30:00Z",
      "duration": 60
    },
    "participants": [...],
    "zoom_payload": {...}
  },
  "meetingId": "uuid-meeting-id",
  "userId": "uuid-user-id"
}`}
              </pre>
            </details>
          )}
        </div>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Test */}
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-xl p-6
        `}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(connectionResult, isTestingConnection)}
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Connection Test
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Test basic webhook connectivity
                </p>
              </div>
            </div>
          </div>

          {connectionResult && (
            <div className="mb-4 space-y-2">
              <div className={`text-sm font-medium ${getStatusColor(connectionResult)}`}>
                {connectionResult.message}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Response time: {connectionResult.duration}ms
              </div>
              {connectionResult.error && (
                <div className="text-xs text-red-500 mt-1">
                  Error: {connectionResult.error}
                </div>
              )}
            </div>
          )}

          <button
            onClick={testWebhookConnection}
            disabled={isTestingConnection}
            className={`
              w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${isTestingConnection
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
              } text-white
            `}
          >
            {isTestingConnection ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* Zoom Event Test */}
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-xl p-6
        `}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(zoomEventResult, isTestingZoomEvent)}
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Zoom Event Test
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Send a test Zoom meeting event
                </p>
              </div>
            </div>
          </div>

          {zoomEventResult && (
            <div className="mb-4 space-y-2">
              <div className={`text-sm font-medium ${getStatusColor(zoomEventResult)}`}>
                {zoomEventResult.message}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Response time: {zoomEventResult.duration}ms
              </div>
              {zoomEventResult.error && (
                <div className="text-xs text-red-500 mt-1">
                  Error: {zoomEventResult.error}
                </div>
              )}
              {zoomEventResult.data && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-500 cursor-pointer">
                    View response data
                  </summary>
                  <pre className={`
                    text-xs mt-1 p-2 rounded overflow-auto
                    ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {JSON.stringify(zoomEventResult.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          <button
            onClick={testZoomWebhookEvent}
            disabled={isTestingZoomEvent}
            className={`
              w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${isTestingZoomEvent
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
              } text-white
            `}
          >
            {isTestingZoomEvent ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            <span>{isTestingZoomEvent ? 'Sending...' : 'Send Test Event'}</span>
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className={`
        ${darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}
        border rounded-xl p-6
      `}>
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className={`font-semibold mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              Configuration requise dans N8N
            </h3>
            <div className={`text-sm space-y-2 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
              <p>Pour que les webhooks fonctionnent, vous devez créer un workflow N8N avec :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Un nœud <strong>Webhook</strong> avec l'URL : <code className="bg-black/20 px-1 rounded">/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75</code></li>
                <li>Méthode <strong>POST</strong></li>
                <li>Le workflow doit être <strong>activé</strong> (toggle en haut à droite)</li>
                <li>Ajouter des nœuds de traitement pour gérer les événements Zoom</li>
              </ul>
              <p className="mt-3">
                <strong>Important :</strong> Le workflow doit être actif pour recevoir les webhooks de production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}