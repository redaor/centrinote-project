import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Play, 
  CheckCircle, 
  XCircle, 
  Copy, 
  AlertCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { webhookService } from '../../services/webhookService';

interface TesterProps {
  darkMode: boolean;
  automationTypes: any[];
}

export function AutomationTester({ darkMode, automationTypes }: TesterProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    statusCode?: number;
    diagnostics?: any;
  } | null>(null);

  // Mettre à jour le JSON lorsque le type change
  useEffect(() => {
    if (selectedType) {
      const type = automationTypes.find(t => t.id === selectedType);
      if (type) {
        // Créer un template JSON avec tous les champs requis
        const template = {
          body: {
            name: "Test automatisation",
            trigger_type: "manual",
            action_type: type.id,
            userId: 'user_id_placeholder',
            timestamp: new Date().toISOString()
          }
        };
        
        // Ajouter les champs spécifiques à l'action
        for (const field of type.requiredFields) {
          template.body[field] = '';
        }
        
        setJsonInput(JSON.stringify(template, null, 2));
        setIsValid(null);
        setValidationMessage('');
      }
    } else {
      setJsonInput('');
      setIsValid(null);
      setValidationMessage('');
    }
  }, [selectedType, automationTypes]);

  // Valider le JSON
  const validateJson = () => {
    try {
      if (!jsonInput.trim()) {
        setIsValid(false);
        setValidationMessage('Le JSON ne peut pas être vide');
        return false;
      }
      
      const parsed = JSON.parse(jsonInput);
      
      // Vérifier que c'est un objet avec une propriété body
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) || !parsed.body) {
        setIsValid(false);
        setValidationMessage('Le JSON doit être un objet avec une propriété "body"');
        return false;
      }
      
      // Vérifier la présence du champ action_type dans body
      if (!parsed.body.action_type) {
        setIsValid(false);
        setValidationMessage('Le champ "body.action_type" est obligatoire');
        return false;
      }
      
      // Vérifier que l'action est valide
      const type = automationTypes.find(t => t.id === parsed.body.action_type);
      if (!type) {
        setIsValid(false);
        setValidationMessage(`L'action "${parsed.body.action_type}" n'est pas valide`);
        return false;
      }
      
      // Vérifier la présence des champs requis
      for (const field of type.requiredFields) {
        if (parsed.body[field] === undefined) {
          setIsValid(false);
          setValidationMessage(`Le champ "${field}" est obligatoire pour l'action "${type.name}"`);
          return false;
        }
      }
      
      setIsValid(true);
      setValidationMessage('JSON valide');
      return true;
    } catch (err) {
      setIsValid(false);
      setValidationMessage(err instanceof Error ? `Erreur de syntaxe: ${err.message}` : 'Erreur de syntaxe JSON');
      return false;
    }
  };

  // Tester le webhook
  const testWebhook = async () => {
    if (!validateJson()) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const payload = JSON.parse(jsonInput);

      // Extraire l'action_type du body
      const actionType = payload.body?.action_type;
      const action = payload.body?.action;
      
      if (!action && !actionType) {
        setTestResult({
          success: false,
          message: "Le champ 'action' ou 'action_type' est manquant dans l'objet body",
          statusCode: 0
        });
        return;
      }
      
      // Utiliser 'action' en priorité, sinon 'action_type'
      const requestAction = action || actionType;
      const result = await webhookService.sendWebhookRequest(requestAction, payload.body);
      
      setTestResult(result);
      
    } catch (error) {
      console.error('Erreur lors du test du webhook:', error);
      setTestResult({
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        statusCode: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Copier le JSON
  const copyJson = () => {
    navigator.clipboard.writeText(jsonInput);
  };

  // Générer un exemple de JSON
  const generateExample = () => {
    if (!selectedType) return;
    
    const type = automationTypes.find(t => t.id === selectedType);
    if (!type) return;
    
    // Créer un exemple avec le nouveau format
    const example = {
      body: {
        action: type.id,
        name: "Test automatisation",
        trigger_type: "manual",
        name: "Test automatisation",
        trigger_type: "manual",
        userId: 'user_123456',
        timestamp: new Date().toISOString()
      }
    };
    
    // Ajouter des valeurs d'exemple pour chaque champ requis
    for (const field of type.requiredFields) {
      switch (field) {
        case 'email':
          example.body[field] = '{{email}}';
          break;
        case 'subject':
          example.body[field] = 'Sujet de l\'email';
          break;
        case 'message':
          example.body[field] = 'Contenu du message...';
          break;
        case 'title':
          example.body[field] = 'Titre de la notification';
          break;
        case 'dueDate':
          example.body[field] = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'scheduledFor':
          example.body[field] = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          break;
        case 'duration':
          example.body[field] = 30;
          break;
        case 'type':
          example.body[field] = 'info';
          break;
        case 'priority':
          example.body[field] = 'medium';
          break;
        case 'description':
          example.body[field] = 'Description détaillée...';
          break;
        default:
          example.body[field] = `Valeur pour ${field}`;
      }
    }
    
    setJsonInput(JSON.stringify(example, null, 2));
    setIsValid(null);
    setValidationMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Testeur de Webhook n8n
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={validateJson}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
            `}
            title="Valider le JSON"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={copyJson}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
            `}
            title="Copier le JSON"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className={`
        p-4 rounded-lg border
        ${darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-800'}
      `}>
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Testeur de payload JSON</p>
            <p className="text-sm mt-1">
              Cet outil vous permet de tester les payloads JSON envoyés à n8n. Sélectionnez un type d'action,
              modifiez le JSON si nécessaire, puis cliquez sur "Tester" pour envoyer la requête au webhook n8n.
            </p>
            <p className="text-sm mt-1">
              Tous les champs sont envoyés à la racine du JSON et suivent une structure standardisée.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Type d'action
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            >
              <option value="">Sélectionnez un type</option>
              {automationTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          {selectedType && (
            <div>
              <button
                onClick={generateExample}
                className={`
                  w-full px-4 py-2 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                Générer un exemple
              </button>
            </div>
          )}
          
          {isValid !== null && (
            <div className={`
              p-3 rounded-lg
              ${isValid
                ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-800'
                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-800'
              }
            `}>
              <div className="flex items-start space-x-2">
                {isValid ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{validationMessage}</span>
              </div>
            </div>
          )}
          
          <div>
            <button
              onClick={testWebhook}
              disabled={isTesting || !selectedType}
              className={`
                w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors
                ${!selectedType
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:shadow-md'
                }
                ${isTesting ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Tester le webhook</span>
            </button>
          </div>
          
          {testResult && (
            <div className={`
              p-3 rounded-lg
              ${testResult.success
                ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-800'
                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-800'
              }
            `}>
              <div className="flex items-start space-x-2">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {testResult.message}
                    {testResult.statusCode && testResult.statusCode > 0 && (
                      <span className="ml-2 text-xs opacity-75">({testResult.statusCode})</span>
                    )}
                  </p>
                  
                  {/* Informations de diagnostic */}
                  {testResult.diagnostics && (
                    <div className="mt-2 p-2 rounded bg-black/10 dark:bg-white/10">
                      <p className="text-xs font-medium mb-1">Diagnostic :</p>
                      <div className="text-xs space-y-1">
                        <p>Temps de réponse : {testResult.diagnostics.responseTime}ms</p>
                        <p>URL : {typeof testResult.diagnostics.url === 'string' ? testResult.diagnostics.url : JSON.stringify(testResult.diagnostics.url)}</p>
                      </div>
                    </div>
                  )}
                  
                  {testResult.data && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Réponse:</p>
                      <pre className={`text-xs p-2 rounded overflow-auto max-h-32 ${
                        darkMode ? 'bg-gray-800' : 'bg-white'
                      }`}>
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Payload JSON
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setIsValid(null);
                setValidationMessage('');
              }}
              rows={20}
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors font-mono text-sm
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
              placeholder="Entrez votre JSON ici..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}