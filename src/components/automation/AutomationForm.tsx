import React, { useState, useEffect } from 'react';
import { X, Save, Info, AlertCircle } from 'lucide-react';

interface AutomationFormProps {
  darkMode: boolean;
  isEditing: boolean;
  currentAutomation: any;
  setCurrentAutomation: (automation: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
  automationTypes: any[];
}

export function AutomationForm({
  darkMode,
  isEditing,
  currentAutomation,
  setCurrentAutomation,
  onSave,
  onCancel,
  isSaving,
  error,
  automationTypes
}: AutomationFormProps) {
  const [jsonPreview, setJsonPreview] = useState<string>('');
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Mettre à jour l'aperçu JSON lorsque l'automatisation change
  useEffect(() => {
    if (currentAutomation) {
      // Créer un payload JSON standardisé
      const standardizedPayload = createStandardizedPayload(currentAutomation);
      setJsonPreview(JSON.stringify(standardizedPayload, null, 2));
    }
  }, [currentAutomation]);

  // Créer un payload JSON standardisé pour n8n
  const createStandardizedPayload = (automation: any) => {
    // Trouver le type d'automatisation sélectionné
    const selectedType = automationTypes.find(type => type.id === automation.action_type);
    
    // Créer un objet de base avec tous les champs requis
    const basePayload = {
      action: 'create_automation',
      action: automation.action_type || '',
      userId: 'user_id_placeholder',
      timestamp: new Date().toISOString()
    };
    
    // Ajouter les champs spécifiques à l'action
    if (selectedType) {
      for (const field of selectedType.requiredFields) {
        basePayload[field] = (automation.action_config && automation.action_config[field]) || '';
      }
    }
    
    return basePayload;
  };

  // Valider le formulaire
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!currentAutomation.name.trim()) {
      errors.name = 'Le nom est obligatoire';
    }
    
    if (!currentAutomation.action_type) {
      errors.action_type = 'Le type d\'action est obligatoire';
    }
    
    // Valider les champs spécifiques à l'action
    if (currentAutomation.action_type) {
      const selectedType = automationTypes.find(type => type.id === currentAutomation.action_type);
      
      if (selectedType) {
        for (const field of selectedType.requiredFields) {
          const value = currentAutomation.action_config?.[field];
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors[`action_config.${field}`] = `Le champ ${field} est obligatoire`;
          }
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave();
    }
  };

  // Mettre à jour un champ de configuration d'action
  const updateActionConfig = (field: string, value: any) => {
    setCurrentAutomation({
      ...currentAutomation,
      action_config: {
        ...currentAutomation.action_config,
        [field]: value
      }
    });
    
    // Effacer l'erreur de validation pour ce champ
    if (validationErrors[`action_config.${field}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`action_config.${field}`];
      setValidationErrors(newErrors);
    }
  };

  // Obtenir les champs de formulaire pour le type d'action sélectionné
  const renderActionFields = () => {
    if (!currentAutomation.action_type) return null;
    
    const selectedType = automationTypes.find(type => type.id === currentAutomation.action_type);
    if (!selectedType) return null;
    
    return (
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Configuration de l'action
        </h3>
        
        {selectedType.requiredFields.map(field => {
          // Déterminer le type d'input en fonction du nom du champ
          let inputType = 'text';
          if (field === 'email') inputType = 'email';
          if (field === 'dueDate' || field === 'scheduledFor') inputType = 'datetime-local';
          if (field === 'duration') inputType = 'number';
          
          return (
            <div key={field}>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} *
              </label>
              {field === 'message' || field === 'description' ? (
                <textarea
                  value={(currentAutomation.action_config?.[field] || '')}
                  onChange={(e) => updateActionConfig(field, e.target.value)}
                  rows={3}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors resize-none
                    ${validationErrors[`action_config.${field}`] 
                      ? 'border-red-500 focus:ring-red-500/20' 
                      : darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder={`Entrez ${field}`}
                />
              ) : field === 'type' && currentAutomation.action_type === 'notification.send' ? (
                <select
                  value={(currentAutomation.action_config?.[field] || '')}
                  onChange={(e) => updateActionConfig(field, e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${validationErrors[`action_config.${field}`] 
                      ? 'border-red-500 focus:ring-red-500/20' 
                      : darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                >
                  <option value="">Sélectionnez un type</option>
                  <option value="info">Information</option>
                  <option value="success">Succès</option>
                  <option value="warning">Avertissement</option>
                  <option value="error">Erreur</option>
                </select>
              ) : field === 'priority' && currentAutomation.action_type === 'task.create' ? (
                <select
                  value={(currentAutomation.action_config?.[field] || '')}
                  onChange={(e) => updateActionConfig(field, e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${validationErrors[`action_config.${field}`] 
                      ? 'border-red-500 focus:ring-red-500/20' 
                      : darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                >
                  <option value="">Sélectionnez une priorité</option>
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              ) : (
                <input
                  type={inputType}
                  value={(currentAutomation.action_config?.[field] || '')}
                  onChange={(e) => updateActionConfig(field, e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${validationErrors[`action_config.${field}`] 
                      ? 'border-red-500 focus:ring-red-500/20' 
                      : darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder={`Entrez ${field}`}
                  min={field === 'duration' ? "1" : undefined}
                />
              )}
              {validationErrors[`action_config.${field}`] && (
                <p className="mt-1 text-sm text-red-500">
                  {validationErrors[`action_config.${field}`]}
                </p>
              )}
              
              {/* Aide contextuelle pour les variables */}
              {(field === 'message' || field === 'subject' || field === 'title' || field === 'email') && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Vous pouvez utiliser des variables comme {"{{"} name {"}}"},  {"{{"} email {"}}"}, ou saisir directement une valeur.
                </p>
              )}
            </div>
          );
        })}
        
        {/* Aperçu JSON */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} flex items-center space-x-1`}
            >
              <Info className="w-4 h-4" />
              <span>{showJsonPreview ? 'Masquer' : 'Afficher'} l'aperçu JSON</span>
            </button>
          </div>
          
          {showJsonPreview && (
            <div className={`
              p-3 rounded-lg border text-sm
              ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}
            `}>
              <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Structure JSON standardisée qui sera envoyée à n8n :
              </p>
              <pre className={`
                text-xs p-2 rounded-lg overflow-auto max-h-40
                ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-800'}
              `}>
                {jsonPreview}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onCancel} />
      <div className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
        ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto
      `}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isEditing ? 'Modifier l\'automatisation' : 'Créer une automatisation'}
          </h2>
          <button
            onClick={onCancel}
            className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
          >
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>
        
        {error && (
          <div className={`
            mb-4 p-3 rounded-lg
            ${darkMode ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}
          `}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Nom *
            </label>
            <input
              type="text"
              value={currentAutomation?.name || ''}
              onChange={(e) => {
                setCurrentAutomation({...currentAutomation, name: e.target.value});
                if (validationErrors.name) {
                  const newErrors = {...validationErrors};
                  delete newErrors.name;
                  setValidationErrors(newErrors);
                }
              }}
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors
                ${validationErrors.name 
                  ? 'border-red-500 focus:ring-red-500/20' 
                  : darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
              placeholder="Nom de l'automatisation"
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-500">
                {validationErrors.name}
              </p>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              value={currentAutomation?.description || ''}
              onChange={(e) => setCurrentAutomation({...currentAutomation, description: e.target.value})}
              rows={3}
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors resize-none
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
              placeholder="Description optionnelle"
            />
          </div>
          
          {/* Type de déclencheur */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Déclencheur *
            </label>
            <select
              value={currentAutomation?.trigger_type || ''}
              onChange={(e) => setCurrentAutomation({
                ...currentAutomation, 
                trigger_type: e.target.value,
                trigger_config: {} // Réinitialiser la config lors du changement de type
              })}
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            >
              <option value="">Sélectionnez un déclencheur</option>
              <option value="manual">Manuel (test uniquement)</option>
              <option value="document_created">Document créé</option>
              <option value="document_updated">Document mis à jour</option>
              <option value="document_shared">Document partagé</option>
              <option value="note_created">Note créée</option>
              <option value="vocabulary_added">Vocabulaire ajouté</option>
              <option value="vocabulary_mastered">Vocabulaire maîtrisé</option>
              <option value="study_session_completed">Session d'étude terminée</option>
              <option value="schedule_time">Planification horaire</option>
              <option value="user_registered">Utilisateur inscrit</option>
            </select>
          </div>
          
          {/* Configuration du déclencheur */}
          {currentAutomation?.trigger_type === 'schedule_time' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Heure de déclenchement
              </label>
              <input
                type="time"
                value={(currentAutomation?.trigger_config as any)?.time || ''}
                onChange={(e) => setCurrentAutomation({
                  ...currentAutomation, 
                  trigger_config: { ...currentAutomation.trigger_config, time: e.target.value } 
                })}
                className={`
                  w-full px-3 py-2 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>
          )}
          
          {/* Type d'action */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Action *
            </label>
            <select
              value={currentAutomation?.action_type || ''}
              onChange={(e) => {
                setCurrentAutomation({
                  ...currentAutomation, 
                  action_type: e.target.value,
                  action_config: {} // Réinitialiser la config lors du changement de type
                });
                if (validationErrors.action_type) {
                  const newErrors = {...validationErrors};
                  delete newErrors.action_type;
                  setValidationErrors(newErrors);
                }
              }}
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors
                ${validationErrors.action_type 
                  ? 'border-red-500 focus:ring-red-500/20' 
                  : darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            >
              <option value="">Sélectionnez une action</option>
              {automationTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            {validationErrors.action_type && (
              <p className="mt-1 text-sm text-red-500">
                {validationErrors.action_type}
              </p>
            )}
          </div>
          
          {/* Champs spécifiques à l'action */}
          {currentAutomation?.action_type && renderActionFields()}
          
          {/* Statut */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Statut
              </label>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Activer ou désactiver cette automatisation
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentAutomation({...currentAutomation, is_active: !currentAutomation.is_active})}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${currentAutomation?.is_active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${currentAutomation?.is_active ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                darkMode 
                  ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Mettre à jour' : 'Créer'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}