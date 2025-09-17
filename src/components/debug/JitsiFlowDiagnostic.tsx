import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Play,
  Pause,
  RotateCcw,
  Monitor,
  Settings,
  Zap,
  Eye
} from 'lucide-react';

interface DiagnosticStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  timestamp?: Date;
  details?: any;
  error?: string;
  duration?: number;
}

export function JitsiFlowDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { id: 'url-detection', name: '🔗 Détection paramètre URL ?room=', status: 'pending' },
    { id: 'user-ready', name: '👤 Utilisateur connecté et prêt', status: 'pending' },
    { id: 'room-creation', name: '🏗️ Création objet room via joinExistingRoom', status: 'pending' },
    { id: 'component-mount', name: '🎬 Montage composant JitsiMeeting', status: 'pending' },
    { id: 'dom-container', name: '📦 Container DOM jitsi-container disponible', status: 'pending' },
    { id: 'script-loaded', name: '📜 Script JitsiMeetExternalAPI chargé', status: 'pending' },
    { id: 'browser-compat', name: '🌐 Vérification compatibilité navigateur', status: 'pending' },
    { id: 'media-permissions', name: '🎥 Test permissions caméra/microphone', status: 'pending' },
    { id: 'api-init', name: '🚀 Initialisation JitsiMeetExternalAPI', status: 'pending' },
    { id: 'conference-join', name: '🎯 Connexion à la conférence', status: 'pending' },
    { id: 'participants-sync', name: '👥 Synchronisation participants', status: 'pending' }
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Intercepter les logs pour détecter les étapes
  useEffect(() => {
    if (!isRunning) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Intercepter les logs normaux
    console.log = (...args) => {
      const message = args.join(' ');
      setLogs(prev => [`${new Date().toLocaleTimeString()} | LOG: ${message}`, ...prev.slice(0, 49)]);
      
      // Détecter les étapes du workflow
      if (message.includes('🔄 [AUDIT] useEffect URL room triggered')) {
        updateStep('url-detection', 'running', args[1]);
      }
      if (message.includes('🔗 [UNIQUE] Détection paramètre room dans URL')) {
        updateStep('url-detection', 'success');
        updateStep('user-ready', 'running');
      }
      if (message.includes('🚀 [AUDIT] Création room depuis URL')) {
        updateStep('user-ready', 'success');
        updateStep('room-creation', 'running');
      }
      if (message.includes('✅ [AUDIT] Room créée depuis URL')) {
        updateStep('room-creation', 'success', args[1]);
        updateStep('component-mount', 'running');
      }
      if (message.includes('🔄 [AUDIT] JitsiMeeting useEffect triggered')) {
        updateStep('component-mount', 'success');
        updateStep('dom-container', 'running');
      }
      if (message.includes('🔍 [AUDIT] DOM container verification') && args[1]?.containerFound) {
        updateStep('dom-container', 'success', args[1]);
        updateStep('script-loaded', 'running');
      }
      if (message.includes('Jitsi Meet API chargée')) {
        updateStep('script-loaded', 'success');
        updateStep('browser-compat', 'running');
      }
      if (message.includes('🔍 [AUDIT] Browser compatibility result') && args[1]?.compatible) {
        updateStep('browser-compat', 'success', args[1]);
        updateStep('media-permissions', 'running');
      }
      if (message.includes('🎥 [AUDIT] Media permissions result')) {
        updateStep('media-permissions', 'success', args[1]);
        updateStep('api-init', 'running');
      }
      if (message.includes('🚀 [AUDIT] Création JitsiMeetExternalAPI')) {
        updateStep('api-init', 'running');
      }
      if (message.includes('✅ [AUDIT] JitsiMeetExternalAPI créé avec succès')) {
        updateStep('api-init', 'success');
        updateStep('conference-join', 'running');
      }
      if (message.includes('✅ [AUDIT] Conférence rejointe')) {
        updateStep('conference-join', 'success');
        updateStep('participants-sync', 'running');
      }
      if (message.includes('Participant rejoint:')) {
        updateStep('participants-sync', 'success');
      }

      originalLog(...args);
    };

    // Intercepter les erreurs
    console.error = (...args) => {
      const message = args.join(' ');
      setLogs(prev => [`${new Date().toLocaleTimeString()} | ERROR: ${message}`, ...prev.slice(0, 49)]);
      
      // Détecter les échecs d'étapes
      if (message.includes('❌ [AUDIT]')) {
        // Marquer l'étape en cours comme échouée
        setSteps(prev => prev.map(step => 
          step.status === 'running' 
            ? { ...step, status: 'error', error: message, timestamp: new Date() }
            : step
        ));
      }

      originalError(...args);
    };

    // Intercepter les warnings
    console.warn = (...args) => {
      const message = args.join(' ');
      setLogs(prev => [`${new Date().toLocaleTimeString()} | WARN: ${message}`, ...prev.slice(0, 49)]);
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isRunning]);

  const updateStep = (stepId: string, status: DiagnosticStep['status'], details?: any) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        const now = new Date();
        return {
          ...step,
          status,
          timestamp: now,
          details,
          duration: step.timestamp ? now.getTime() - step.timestamp.getTime() : undefined
        };
      }
      return step;
    }));
  };

  const startDiagnostic = () => {
    setIsRunning(true);
    setStartTime(new Date());
    setLogs([]);
    // Reset all steps
    setSteps(prev => prev.map(step => ({ 
      ...step, 
      status: 'pending', 
      timestamp: undefined, 
      details: undefined,
      error: undefined,
      duration: undefined
    })));
    setLogs(['🚀 Diagnostic Jitsi Flow démarré - Ouvrez un lien d\'email avec ?room= pour tester']);
  };

  const stopDiagnostic = () => {
    setIsRunning(false);
    setStartTime(null);
  };

  const resetDiagnostic = () => {
    stopDiagnostic();
    setLogs([]);
    setSteps(prev => prev.map(step => ({ 
      ...step, 
      status: 'pending', 
      timestamp: undefined, 
      details: undefined,
      error: undefined,
      duration: undefined
    })));
  };

  const getStepIcon = (step: DiagnosticStep) => {
    switch (step.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const generateTestUrl = () => {
    const baseUrl = window.location.origin;
    const roomName = `TestRoom${Date.now()}`;
    return `${baseUrl}/collaboration?room=${roomName}`;
  };

  const stats = {
    total: steps.length,
    completed: steps.filter(s => s.status === 'success').length,
    errors: steps.filter(s => s.status === 'error').length,
    warnings: steps.filter(s => s.status === 'warning').length,
    running: steps.filter(s => s.status === 'running').length
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Monitor className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🔬 Diagnostic Flux Jitsi
            </h2>
            <p className="text-gray-600">
              Analyse en temps réel du workflow de redirection email → réunion
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!isRunning ? (
            <button
              onClick={startDiagnostic}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Démarrer</span>
            </button>
          ) : (
            <button
              onClick={stopDiagnostic}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Arrêter</span>
            </button>
          )}
          
          <button
            onClick={resetDiagnostic}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-medium">Total</span>
            <Settings className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-medium">Succès</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-medium">En cours</span>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.running}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-600 font-medium">Warnings</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{stats.warnings}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-600 font-medium">Erreurs</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-900">{stats.errors}</p>
        </div>
      </div>

      {/* URL de test */}
      {isRunning && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-2">📝 URL de test</h3>
          <p className="text-sm text-yellow-800 mb-2">
            Copiez cette URL et ouvrez-la dans un nouvel onglet pour déclencher le workflow:
          </p>
          <code className="block bg-yellow-100 p-2 rounded text-xs text-yellow-800 break-all">
            {generateTestUrl()}
          </code>
        </div>
      )}

      {/* Timeline des étapes */}
      <div className="space-y-3 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">📊 Timeline du workflow</h3>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 rounded-lg border-l-4 ${
              step.status === 'success'
                ? 'bg-green-50 border-green-400'
                : step.status === 'error'
                ? 'bg-red-50 border-red-400'
                : step.status === 'warning'
                ? 'bg-yellow-50 border-yellow-400'
                : step.status === 'running'
                ? 'bg-blue-50 border-blue-400'
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">
                      {index + 1}. {step.name}
                    </h4>
                    {step.duration && (
                      <span className="text-xs text-gray-500">
                        ({step.duration}ms)
                      </span>
                    )}
                  </div>
                  {step.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {step.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                  {step.error && (
                    <p className="text-sm text-red-600 mt-1">{step.error}</p>
                  )}
                  {step.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Voir détails
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logs en temps réel */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">📜 Logs temps réel</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">Aucun log pour le moment...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}