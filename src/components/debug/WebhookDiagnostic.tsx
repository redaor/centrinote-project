import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Mail,
  MailOff,
  Filter,
  RefreshCw,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';

interface WebhookEvent {
  id: string;
  event: string;
  roomName: string;
  timestamp: Date;
  success: boolean;
  blocked: boolean;
  shouldSendEmail: boolean;
  error?: string;
  debugInfo?: any;
}

export function WebhookDiagnostic() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'emails' | 'blocked' | 'errors'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Intercepter les appels triggerWebhook pour logging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    // Intercépter les logs de webhook
    console.log = (...args) => {
      const message = args.join(' ');
      
      // Détecter les logs de webhook
      if (message.includes('📡 Envoi webhook n8n:')) {
        const data = args[1];
        if (data && typeof data === 'object') {
          const event: WebhookEvent = {
            id: `${Date.now()}_${Math.random()}`,
            event: data.event || 'unknown',
            roomName: data.roomName || 'unknown',
            timestamp: new Date(),
            success: true,
            blocked: false,
            shouldSendEmail: data.shouldSendEmail || false,
            debugInfo: data
          };
          setEvents(prev => [event, ...prev.slice(0, 49)]); // Garder max 50 événements
        }
      }
      
      if (message.includes('✅ Webhook n8n envoyé avec succès:')) {
        const eventName = args[1];
        setEvents(prev => 
          prev.map(e => 
            e.event === eventName && !e.success 
              ? { ...e, success: true }
              : e
          )
        );
      }

      if (message.includes('🚫 Webhook bloqué (debounce):')) {
        const parts = message.split(' ');
        const eventName = parts[4];
        const roomName = parts[6];
        
        const blockedEvent: WebhookEvent = {
          id: `${Date.now()}_${Math.random()}`,
          event: eventName,
          roomName: roomName,
          timestamp: new Date(),
          success: false,
          blocked: true,
          shouldSendEmail: false,
          error: 'Bloqué par système anti-spam'
        };
        setEvents(prev => [blockedEvent, ...prev.slice(0, 49)]);
      }

      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      
      if (message.includes('❌ Erreur envoi webhook n8n:')) {
        const errorEvent: WebhookEvent = {
          id: `${Date.now()}_${Math.random()}`,
          event: 'error',
          roomName: 'unknown',
          timestamp: new Date(),
          success: false,
          blocked: false,
          shouldSendEmail: false,
          error: args[1]?.message || 'Erreur inconnue'
        };
        setEvents(prev => [errorEvent, ...prev.slice(0, 49)]);
      }

      originalError(...args);
    };

    setIsMonitoring(true);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      setIsMonitoring(false);
    };
  }, []);

  const filteredEvents = events.filter(event => {
    switch (filter) {
      case 'emails':
        return event.shouldSendEmail;
      case 'blocked':
        return event.blocked;
      case 'errors':
        return !event.success && !event.blocked;
      default:
        return true;
    }
  });

  const stats = {
    total: events.length,
    emails: events.filter(e => e.shouldSendEmail).length,
    blocked: events.filter(e => e.blocked).length,
    errors: events.filter(e => !e.success && !e.blocked).length,
    success: events.filter(e => e.success).length
  };

  const getEventIcon = (event: WebhookEvent) => {
    if (event.blocked) return <XCircle className="w-4 h-4 text-yellow-500" />;
    if (!event.success) return <XCircle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🔍 Diagnostic Webhook
            </h2>
            <p className="text-gray-600">
              Surveillance en temps réel des événements webhook
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isMonitoring 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isMonitoring ? '🟢 Monitoring actif' : '🔴 Monitoring inactif'}
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showDetails ? 'Masquer' : 'Détails'}</span>
          </button>

          <button
            onClick={clearEvents}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-purple-600 font-medium">Emails</span>
            <Mail className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.emails}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-600 font-medium">Bloqués</span>
            <XCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{stats.blocked}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-600 font-medium">Erreurs</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-900">{stats.errors}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center space-x-4 mb-6">
        <Filter className="w-5 h-5 text-gray-500" />
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'Tous', icon: Activity },
            { key: 'emails', label: 'Emails', icon: Mail },
            { key: 'blocked', label: 'Bloqués', icon: XCircle },
            { key: 'errors', label: 'Erreurs', icon: AlertTriangle }
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
      </div>

      {/* Liste des événements */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun événement webhook détecté.</p>
            <p className="text-sm">Rejoignez une réunion Jitsi pour voir les événements.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-lg border-l-4 ${
                event.blocked
                  ? 'bg-yellow-50 border-yellow-400'
                  : !event.success
                  ? 'bg-red-50 border-red-400'
                  : 'bg-green-50 border-green-400'
              }`}
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
                      {event.blocked && (
                        <XCircle className="w-4 h-4 text-yellow-500" title="Bloqué par anti-spam" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.error || (event.success ? 'Succès' : 'En cours...')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {showDetails && event.debugInfo && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Voir les détails techniques
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.debugInfo, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {/* Guide de résolution */}
      {stats.blocked > 5 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">⚠️ Beaucoup d'événements bloqués</h4>
              <p className="text-sm text-yellow-800 mt-1">
                Le système anti-spam bloque de nombreux webhooks. C'est normal et évite le spam d'emails.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.errors > 3 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">❌ Erreurs détectées</h4>
              <p className="text-sm text-red-800 mt-1">
                Plusieurs webhooks ont échoué. Vérifiez la configuration n8n et la connectivité réseau.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}