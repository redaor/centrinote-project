import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  Users,
  Video,
  PlayCircle,
  StopCircle,
  UserPlus,
  UserMinus,
  AlertCircle,
  Database,
  Mail,
  Settings,
  TestTube
} from 'lucide-react';
import { testWebhookConfig, testWebhookConnection } from '../../utils/webhookTest';

interface WebhookEvent {
  id: string;
  event: string;
  roomName: string;
  timestamp: Date;
  success: boolean;
  blocked: boolean;
  shouldSendEmail: boolean;
  data: any;
  error?: string;
  workflowId?: string;
  responseTime?: number;
}

export function N8nSyncDiagnostic() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'errors' | 'emails'>('all');
  const [configTest, setConfigTest] = useState<any>(null);
  const [connectionTest, setConnectionTest] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Intercepter les logs webhook pour tracking
  useEffect(() => {
    if (!isMonitoring) return;

    const originalLog = console.log;
    const originalError = console.error;

    // Intercepter les logs de webhook
    console.log = (...args) => {
      const message = args.join(' ');
      
      // Détecter envoi webhook
      if (message.includes('📡 Envoi webhook n8n:')) {
        const data = args[1];
        if (data && typeof data === 'object') {
          const event: WebhookEvent = {
            id: `${Date.now()}_${Math.random()}`,
            event: data.event || 'unknown',
            roomName: data.roomName || 'unknown',
            timestamp: new Date(),
            success: false, // En attente
            blocked: false,
            shouldSendEmail: data.shouldSendEmail || false,
            data: data
          };
          setEvents(prev => [event, ...prev.slice(0, 99)]); // Max 100 événements
        }
      }
      
      // Détecter succès webhook
      if (message.includes('✅ Webhook n8n envoyé avec succès:')) {
        const eventName = args[1];
        setEvents(prev => 
          prev.map(e => 
            e.event === eventName && !e.success 
              ? { ...e, success: true, responseTime: Date.now() - e.timestamp.getTime() }
              : e
          )
        );
      }

      // Détecter webhooks spécifiques
      if (message.includes('✅ [WEBHOOK]') && message.includes('envoyé vers n8n')) {
        const parts = message.split(' ');
        const eventType = parts.find(part => part.endsWith('_joined') || part.endsWith('_started') || part.endsWith('_ended'));
        if (eventType) {
          setEvents(prev => 
            prev.map(e => 
              e.event === eventType && !e.success 
                ? { ...e, success: true, responseTime: Date.now() - e.timestamp.getTime() }
                : e
            )
          );
        }
      }

      originalLog(...args);
    };

    // Intercepter les erreurs webhook
    console.error = (...args) => {
      const message = args.join(' ');
      
      if (message.includes('❌ [WEBHOOK]') || message.includes('❌ Erreur envoi webhook n8n:')) {
        const errorEvent: WebhookEvent = {
          id: `${Date.now()}_${Math.random()}`,
          event: 'error',
          roomName: 'unknown',
          timestamp: new Date(),
          success: false,
          blocked: false,
          shouldSendEmail: false,
          data: {},
          error: args[1]?.message || message
        };
        setEvents(prev => [errorEvent, ...prev.slice(0, 99)]);
      }

      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [isMonitoring]);

  const getEventIcon = (event: WebhookEvent) => {
    if (event.blocked) return <Clock className="w-4 h-4 text-yellow-500" />;
    if (!event.success && event.error) return <XCircle className="w-4 h-4 text-red-500" />;
    if (!event.success) return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
    
    // Icônes par type d'événement
    switch (event.event) {
      case 'room_joined': return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'session_started': return <PlayCircle className="w-4 h-4 text-green-500" />;
      case 'session_ended': return <StopCircle className="w-4 h-4 text-gray-500" />;
      case 'participant_joined': return <Users className="w-4 h-4 text-blue-500" />;
      case 'participant_left': return <UserMinus className="w-4 h-4 text-orange-500" />;
      case 'recording_started': return <Video className="w-4 h-4 text-red-500" />;
      case 'recording_stopped': return <StopCircle className="w-4 h-4 text-red-400" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getEventColor = (event: WebhookEvent) => {
    if (event.error) return 'bg-red-50 border-red-400';
    if (event.blocked) return 'bg-yellow-50 border-yellow-400';
    if (!event.success) return 'bg-blue-50 border-blue-400';
    return 'bg-green-50 border-green-400';
  };

  const filteredEvents = events.filter(event => {
    switch (filter) {
      case 'success': return event.success;
      case 'errors': return !event.success && !!event.error;
      case 'emails': return event.shouldSendEmail;
      default: return true;
    }
  });

  const stats = {
    total: events.length,
    success: events.filter(e => e.success).length,
    pending: events.filter(e => !e.success && !e.error).length,
    errors: events.filter(e => !e.success && e.error).length,
    emails: events.filter(e => e.shouldSendEmail).length,
    avgResponseTime: events.filter(e => e.responseTime).reduce((acc, e) => acc + (e.responseTime || 0), 0) / events.filter(e => e.responseTime).length || 0
  };

  const eventTypes = [...new Set(events.map(e => e.event))];

  // Tester la configuration webhook
  const handleTestConfig = () => {
    const result = testWebhookConfig();
    setConfigTest(result);
  };

  // Tester la connexion n8n
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testWebhookConnection();
      setConnectionTest(result);
    } catch (error) {
      setConnectionTest({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test au montage du composant
  useEffect(() => {
    handleTestConfig();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🔄 Diagnostic Synchronisation n8n
            </h2>
            <p className="text-gray-600">
              Surveillance en temps réel des webhooks vers n8n
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!isMonitoring ? (
            <button
              onClick={() => setIsMonitoring(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Démarrer</span>
            </button>
          ) : (
            <button
              onClick={() => setIsMonitoring(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              <span>Arrêter</span>
            </button>
          )}
          
          <button
            onClick={() => setEvents([])}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-medium">Total</span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-medium">Succès</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.success}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-medium">En cours</span>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.pending}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-600 font-medium">Erreurs</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-900">{stats.errors}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-purple-600 font-medium">Emails</span>
            <Mail className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.emails}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Temps moy.</span>
            <Clock className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{Math.round(stats.avgResponseTime)}ms</p>
        </div>
      </div>

      {/* Configuration Test */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🔧 Configuration Webhook n8n</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleTestConfig}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Test Config</span>
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              <span>{isTestingConnection ? 'Test...' : 'Test Connexion'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Events Webhook */}
          <div className={`p-4 rounded-lg border ${
            configTest?.primary?.configured && configTest?.primary?.isCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {configTest?.primary?.configured && configTest?.primary?.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">🎯 Centrinote Events</span>
            </div>
            <p className="text-sm text-gray-600">
              URL: {configTest?.primary?.url || 'Non configurée'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Expected: {configTest?.primary?.expected}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              📊 Tous événements (tracking + analytics)
            </p>
          </div>

          {/* Recording Webhook */}
          <div className={`p-4 rounded-lg border ${
            configTest?.recording?.configured && configTest?.recording?.isCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {configTest?.recording?.configured && configTest?.recording?.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">🎬 Jitsi Recording</span>
            </div>
            <p className="text-sm text-gray-600">
              URL: {configTest?.recording?.url || 'Non configurée'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Expected: {configTest?.recording?.expected}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              📧 Événements recording (avec emails)
            </p>
          </div>

          {/* Primary Connection Test */}
          <div className={`p-4 rounded-lg border ${
            connectionTest === null
              ? 'bg-gray-50 border-gray-200'
              : connectionTest?.primary?.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {connectionTest === null ? (
                <Clock className="w-5 h-5 text-gray-500" />
              ) : connectionTest?.primary?.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">🎯 Primary Connection</span>
            </div>
            <p className="text-sm text-gray-600">
              {connectionTest === null
                ? 'Pas encore testée'
                : connectionTest?.primary?.success
                ? `✅ Connecté (${connectionTest.primary.status})`
                : `❌ Échec: ${connectionTest?.primary?.error}`
              }
            </p>
            {connectionTest?.primary?.data && (
              <p className="text-xs text-gray-500 mt-1">
                Response: {JSON.stringify(connectionTest.primary.data).slice(0, 100)}...
              </p>
            )}
          </div>

          {/* Recording Connection Test */}
          <div className={`p-4 rounded-lg border ${
            connectionTest === null
              ? 'bg-gray-50 border-gray-200'
              : connectionTest?.recording?.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {connectionTest === null ? (
                <Clock className="w-5 h-5 text-gray-500" />
              ) : connectionTest?.recording?.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">🎬 Recording Connection</span>
            </div>
            <p className="text-sm text-gray-600">
              {connectionTest === null
                ? 'Pas encore testée'
                : connectionTest?.recording?.success
                ? `✅ Connecté (${connectionTest.recording.status})`
                : `❌ Échec: ${connectionTest?.recording?.error}`
              }
            </p>
            {connectionTest?.recording?.data && (
              <p className="text-xs text-gray-500 mt-1">
                Response: {JSON.stringify(connectionTest.recording.data).slice(0, 100)}...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center space-x-4 mb-6">
        <span className="text-sm font-medium text-gray-700">Filtrer :</span>
        {[
          { key: 'all', label: 'Tous', icon: Activity },
          { key: 'success', label: 'Succès', icon: CheckCircle },
          { key: 'errors', label: 'Erreurs', icon: XCircle },
          { key: 'emails', label: 'Emails', icon: Mail }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Types d'événements */}
      {eventTypes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Types d'événements détectés</h3>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(type => (
              <span
                key={type}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Liste des événements */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun événement webhook détecté.</p>
            <p className="text-sm">
              {isMonitoring 
                ? 'Créez ou rejoignez une réunion Jitsi pour voir les webhooks.'
                : 'Démarrez le monitoring pour voir les événements en temps réel.'
              }
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-lg border-l-4 ${getEventColor(event)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getEventIcon(event)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{event.event}</h4>
                      <span className="text-sm text-gray-500">{event.roomName}</span>
                      {event.shouldSendEmail && (
                        <Mail className="w-4 h-4 text-purple-500" title="Déclenche un email" />
                      )}
                      {event.responseTime && (
                        <span className="text-xs text-gray-400">
                          {event.responseTime}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.error || (event.success ? 'Envoyé avec succès' : 'En cours...')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {event.data && Object.keys(event.data).length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Voir payload webhook
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {/* État du monitoring */}
      <div className={`mt-6 p-4 rounded-lg border ${
        isMonitoring 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium text-gray-900">
            {isMonitoring 
              ? '🟢 Monitoring actif - Tous les webhooks sont interceptés' 
              : '🔴 Monitoring inactif - Cliquez "Démarrer" pour surveiller'
            }
          </span>
        </div>
      </div>
    </div>
  );
}