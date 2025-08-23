import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, BarChart3 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { AutomationDashboard } from './AutomationDashboard';
import { AutomationBuilder } from './AutomationBuilder';
import { AutomationTemplates } from './AutomationTemplates';
import { automationService } from '../../services/automationService';
import type { 
  Automation, 
  AutomationTemplate, 
  AutomationFormData 
} from '../../types/automation';

type ViewMode = 'dashboard' | 'templates' | 'builder' | 'edit' | 'execution';

export function AutomationManager() {
  const { state } = useApp();
  const { darkMode, user } = state;

  // View state management
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // Handle navigation
  const handleCreateAutomation = useCallback(() => {
    setSelectedAutomation(null);
    setSelectedTemplate(null);
    setCurrentView('templates');
  }, []);

  const handleEditAutomation = useCallback((automation: Automation) => {
    setSelectedAutomation(automation);
    setCurrentView('builder');
  }, []);

  const handleSelectTemplate = useCallback((template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setCurrentView('builder');
  }, []);

  const handleCreateCustom = useCallback(() => {
    setSelectedTemplate(null);
    setSelectedAutomation(null);
    setCurrentView('builder');
  }, []);

  const handleViewExecution = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId);
    setCurrentView('execution');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedAutomation(null);
    setSelectedTemplate(null);
    setSelectedExecutionId(null);
  }, []);

  // Handle automation save
  const handleSaveAutomation = useCallback(async (formData: AutomationFormData) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      if (selectedAutomation) {
        // Update existing automation
        await automationService.updateAutomation({
          id: selectedAutomation.id,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          trigger_type: formData.trigger.type,
          trigger_config: formData.trigger.config,
          action_type: formData.action.type,
          action_config: formData.action.config,
          conditions: formData.conditions,
          schedule_config: formData.schedule,
          is_active: formData.settings.is_active,
          priority: formData.settings.priority
        });
      } else if (selectedTemplate) {
        // Create from template with custom configuration
        await automationService.createFromTemplate(
          user.id,
          selectedTemplate.id,
          formData.name
        );
      } else {
        // Create new custom automation
        await automationService.createAutomation(user.id, formData);
      }

      handleBackToDashboard();
    } catch (error) {
      console.error('Failed to save automation:', error);
      throw error;
    }
  }, [user?.id, selectedAutomation, selectedTemplate, handleBackToDashboard]);

  // Prepare initial data for builder
  const getBuilderInitialData = useCallback((): Partial<AutomationFormData> | undefined => {
    if (selectedAutomation) {
      return {
        name: selectedAutomation.name,
        description: selectedAutomation.description,
        category: selectedAutomation.category as any,
        trigger: {
          type: selectedAutomation.trigger_type,
          config: selectedAutomation.trigger_config
        },
        action: {
          type: selectedAutomation.action_type,
          config: selectedAutomation.action_config
        },
        conditions: selectedAutomation.conditions,
        schedule: selectedAutomation.schedule_config,
        settings: {
          is_active: selectedAutomation.is_active,
          priority: selectedAutomation.priority,
          retry_config: selectedAutomation.retry_config
        }
      };
    }

    if (selectedTemplate) {
      return {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        category: selectedTemplate.category as any,
        trigger: {
          type: selectedTemplate.trigger_schema.type,
          config: selectedTemplate.trigger_schema
        },
        action: {
          type: selectedTemplate.action_schema.type,
          config: selectedTemplate.action_schema
        },
        conditions: [],
        schedule: {},
        settings: {
          is_active: false,
          priority: 5,
          retry_config: { max_retries: 3, retry_delay: 300 }
        }
      };
    }

    return undefined;
  }, [selectedAutomation, selectedTemplate]);

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <AutomationDashboard
            onCreateAutomation={handleCreateAutomation}
            onEditAutomation={handleEditAutomation}
            onViewExecution={handleViewExecution}
          />
        );

      case 'templates':
        return (
          <AutomationTemplates
            onSelectTemplate={handleSelectTemplate}
            onCreateCustom={handleCreateCustom}
          />
        );

      case 'builder':
        return (
          <AutomationBuilder
            initialData={getBuilderInitialData()}
            onSave={handleSaveAutomation}
            onCancel={handleBackToDashboard}
            isEditing={!!selectedAutomation}
          />
        );

      case 'execution':
        return (
          <div className="text-center py-12">
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Execution Details
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Execution ID: {selectedExecutionId}
            </p>
            <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Detailed execution viewer coming soon...
            </p>
            <button
              onClick={handleBackToDashboard}
              className="mt-4 text-blue-500 hover:text-blue-600 font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Get page title
  const getPageTitle = () => {
    switch (currentView) {
      case 'templates':
        return 'Choose Template';
      case 'builder':
        return selectedAutomation ? 'Edit Automation' : 'Create Automation';
      case 'execution':
        return 'Execution Details';
      default:
        return 'Automation Center';
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Header */}
        {currentView !== 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-4 mb-6"
          >
            <button
              onClick={handleBackToDashboard}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'text-gray-300 hover:bg-gray-800 hover:text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div className={`h-6 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {getPageTitle()}
            </h1>
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Actions (only on dashboard) */}
      {currentView === 'dashboard' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-6 right-6 flex flex-col space-y-3"
        >
          <button
            onClick={handleCreateAutomation}
            className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
            title="Create new automation"
          >
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={() => {/* TODO: Add analytics view */}}
            className={`w-12 h-12 ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
            } border ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center`}
            title="View analytics"
          >
            <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </motion.div>
      )}
    </div>
  );
}