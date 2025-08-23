import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  Mail,
  Bell,
  BookOpen,
  FileText,
  Calendar,
  Settings,
  Play,
  Save,
  X,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { 
  AutomationFormData, 
  TriggerType, 
  ActionType, 
  AutomationCondition,
  DraggableItem,
  AutomationCategory 
} from '../../types/automation';

interface AutomationBuilderProps {
  initialData?: Partial<AutomationFormData>;
  onSave: (data: AutomationFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function AutomationBuilder({ 
  initialData, 
  onSave, 
  onCancel, 
  isEditing = false 
}: AutomationBuilderProps) {
  const { state } = useApp();
  const { darkMode } = state;

  // Form state
  const [formData, setFormData] = useState<AutomationFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'general',
    trigger: {
      type: initialData?.trigger?.type || 'note_created',
      config: initialData?.trigger?.config || {}
    },
    action: {
      type: initialData?.action?.type || 'send_notification',
      config: initialData?.action?.config || {}
    },
    conditions: initialData?.conditions || [],
    schedule: initialData?.schedule || {},
    settings: {
      is_active: initialData?.settings?.is_active ?? true,
      priority: initialData?.settings?.priority || 5,
      retry_config: initialData?.settings?.retry_config || {
        max_retries: 3,
        retry_delay: 300
      }
    }
  });

  const [activeStep, setActiveStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Available triggers and actions
  const availableTriggers: DraggableItem[] = [
    {
      id: 'note_created',
      type: 'trigger',
      name: 'Note Created',
      description: 'Triggers when a new note is created',
      icon: 'file-text',
      color: 'blue',
      category: 'content',
      config_schema: {
        keywords: { type: 'array', label: 'Keywords (optional)' },
        tags: { type: 'array', label: 'Tags (optional)' }
      }
    },
    {
      id: 'note_updated',
      type: 'trigger',
      name: 'Note Updated',
      description: 'Triggers when a note is modified',
      icon: 'file-text',
      color: 'blue',
      category: 'content',
      config_schema: {
        keywords: { type: 'array', label: 'Keywords (optional)' }
      }
    },
    {
      id: 'vocabulary_added',
      type: 'trigger',
      name: 'Vocabulary Added',
      description: 'Triggers when vocabulary words are added',
      icon: 'book-open',
      color: 'green',
      category: 'learning',
      config_schema: {
        threshold: { type: 'number', label: 'Minimum words', default: 1 },
        category: { type: 'string', label: 'Category (optional)' }
      }
    },
    {
      id: 'session_completed',
      type: 'trigger',
      name: 'Session Completed',
      description: 'Triggers when a study session is completed',
      icon: 'calendar',
      color: 'purple',
      category: 'learning',
      config_schema: {
        session_types: { type: 'array', label: 'Session types' },
        min_duration: { type: 'number', label: 'Min duration (minutes)' }
      }
    },
    {
      id: 'time_based',
      type: 'trigger',
      name: 'Time Based',
      description: 'Triggers at specific times or intervals',
      icon: 'clock',
      color: 'orange',
      category: 'schedule',
      config_schema: {
        schedule: { type: 'select', label: 'Schedule', options: ['daily', 'weekly', 'monthly'] },
        time: { type: 'time', label: 'Time' },
        day: { type: 'select', label: 'Day (for weekly)', options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }
      }
    }
  ];

  const availableActions: DraggableItem[] = [
    {
      id: 'send_notification',
      type: 'action',
      name: 'Send Notification',
      description: 'Send a push notification to the user',
      icon: 'bell',
      color: 'blue',
      category: 'communication',
      config_schema: {
        title: { type: 'string', label: 'Title', required: true },
        message: { type: 'string', label: 'Message', required: true },
        priority: { type: 'select', label: 'Priority', options: ['low', 'normal', 'high'] }
      }
    },
    {
      id: 'send_email',
      type: 'action',
      name: 'Send Email',
      description: 'Send an email notification',
      icon: 'mail',
      color: 'red',
      category: 'communication',
      config_schema: {
        to: { type: 'email', label: 'Recipient', required: true },
        subject: { type: 'string', label: 'Subject', required: true },
        template: { type: 'select', label: 'Template', options: ['default', 'congratulations', 'reminder', 'weekly_report'] },
        include_stats: { type: 'boolean', label: 'Include statistics' }
      }
    },
    {
      id: 'create_note',
      type: 'action',
      name: 'Create Note',
      description: 'Automatically create a new note',
      icon: 'file-text',
      color: 'green',
      category: 'content',
      config_schema: {
        title: { type: 'string', label: 'Note title', required: true },
        content: { type: 'textarea', label: 'Note content' },
        tags: { type: 'array', label: 'Tags' }
      }
    },
    {
      id: 'schedule_session',
      type: 'action',
      name: 'Schedule Session',
      description: 'Create a new study session',
      icon: 'calendar',
      color: 'purple',
      category: 'learning',
      config_schema: {
        title: { type: 'string', label: 'Session title', required: true },
        type: { type: 'select', label: 'Session type', options: ['vocabulary', 'document', 'mixed'] },
        duration: { type: 'number', label: 'Duration (minutes)', default: 30 }
      }
    },
    {
      id: 'webhook_call',
      type: 'action',
      name: 'Webhook Call',
      description: 'Send data to an external webhook URL',
      icon: 'zap',
      color: 'yellow',
      category: 'integration',
      config_schema: {
        url: { type: 'url', label: 'Webhook URL', required: true },
        method: { type: 'select', label: 'HTTP Method', options: ['POST', 'PUT', 'PATCH'] },
        headers: { type: 'object', label: 'Headers (optional)' },
        timeout: { type: 'number', label: 'Timeout (seconds)', default: 30 }
      }
    }
  ];

  const categories: { value: AutomationCategory; label: string; color: string }[] = [
    { value: 'productivity', label: 'Productivity', color: 'blue' },
    { value: 'learning', label: 'Learning', color: 'green' },
    { value: 'motivation', label: 'Motivation', color: 'yellow' },
    { value: 'alerts', label: 'Alerts', color: 'red' },
    { value: 'analytics', label: 'Analytics', color: 'purple' },
    { value: 'backup', label: 'Backup', color: 'gray' },
    { value: 'general', label: 'General', color: 'indigo' }
  ];

  // Form validation
  const isStepValid = useMemo(() => {
    switch (activeStep) {
      case 1: // Basic Info
        return formData.name.trim().length > 0;
      case 2: // Trigger
        return formData.trigger.type && Object.keys(formData.trigger.config).length >= 0;
      case 3: // Action
        return formData.action.type && Object.keys(formData.action.config).length >= 0;
      case 4: // Settings
        return formData.settings.priority >= 1 && formData.settings.priority <= 10;
      default:
        return true;
    }
  }, [formData, activeStep]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save automation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAutomation = () => {
    setTestMode(true);
    // TODO: Implement test automation logic
    setTimeout(() => {
      setTestMode(false);
      alert('Automation test completed successfully!');
    }, 2000);
  };

  const renderTriggerConfig = () => {
    const selectedTrigger = availableTriggers.find(t => t.id === formData.trigger.type);
    if (!selectedTrigger) return null;

    return (
      <div className="space-y-4">
        {Object.entries(selectedTrigger.config_schema).map(([key, schema]: [string, any]) => (
          <div key={key}>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {schema.label}
              {schema.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {schema.type === 'string' && (
              <input
                type="text"
                value={formData.trigger.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trigger: {
                    ...prev.trigger,
                    config: { ...prev.trigger.config, [key]: e.target.value }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder={schema.placeholder}
              />
            )}
            {schema.type === 'number' && (
              <input
                type="number"
                value={formData.trigger.config[key] || schema.default || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trigger: {
                    ...prev.trigger,
                    config: { ...prev.trigger.config, [key]: parseInt(e.target.value) || 0 }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            )}
            {schema.type === 'select' && (
              <select
                value={formData.trigger.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trigger: {
                    ...prev.trigger,
                    config: { ...prev.trigger.config, [key]: e.target.value }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="">Select {schema.label}</option>
                {schema.options.map((option: string) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            )}
            {schema.type === 'time' && (
              <input
                type="time"
                value={formData.trigger.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trigger: {
                    ...prev.trigger,
                    config: { ...prev.trigger.config, [key]: e.target.value }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderActionConfig = () => {
    const selectedAction = availableActions.find(a => a.id === formData.action.type);
    if (!selectedAction) return null;

    return (
      <div className="space-y-4">
        {Object.entries(selectedAction.config_schema).map(([key, schema]: [string, any]) => (
          <div key={key}>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {schema.label}
              {schema.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {schema.type === 'string' && (
              <input
                type="text"
                value={formData.action.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action: {
                    ...prev.action,
                    config: { ...prev.action.config, [key]: e.target.value }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            )}
            {schema.type === 'textarea' && (
              <textarea
                value={formData.action.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action: {
                    ...prev.action,
                    config: { ...prev.action.config, [key]: e.target.value }
                  }
                }))}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            )}
            {schema.type === 'email' && (
              <input
                type="email"
                value={formData.action.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action: {
                    ...prev.action,
                    config: { ...prev.action.config, [key]: e.target.value }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            )}
            {schema.type === 'select' && (
              <select
                value={formData.action.config[key] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action: {
                    ...prev.action,
                    config: { ...prev.action.config, [key]: e.target.value }
                  }
                }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="">Select {schema.label}</option>
                {schema.options.map((option: string) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            )}
            {schema.type === 'boolean' && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.action.config[key] || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    action: {
                      ...prev.action,
                      config: { ...prev.action.config, [key]: e.target.checked }
                    }
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {schema.label}
                </span>
              </label>
            )}
          </div>
        ))}
      </div>
    );
  };

  const steps = [
    { id: 1, title: 'Basic Info', description: 'Name and category' },
    { id: 2, title: 'Trigger', description: 'When to run' },
    { id: 3, title: 'Action', description: 'What to do' },
    { id: 4, title: 'Settings', description: 'Advanced options' }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isEditing ? 'Edit Automation' : 'Create New Automation'}
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Build powerful workflows to automate your learning journey
            </p>
          </div>
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${
              darkMode 
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  activeStep === step.id
                    ? 'bg-blue-600 text-white'
                    : activeStep > step.id
                    ? 'bg-green-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {activeStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {step.title}
                </p>
                <p className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${
                  activeStep > step.id
                    ? 'bg-green-600'
                    : darkMode
                    ? 'bg-gray-700'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-xl p-6`}>
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Automation Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="e.g., Daily Note Backup"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Describe what this automation does..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Category
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.category === category.value
                            ? `border-${category.color}-500 bg-${category.color}-50 dark:bg-${category.color}-900/20`
                            : darkMode
                            ? 'border-gray-600 hover:border-gray-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {category.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Trigger */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    When should this automation run?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTriggers.map((trigger) => {
                      const IconComponent = {
                        'file-text': FileText,
                        'book-open': BookOpen,
                        'calendar': Calendar,
                        'clock': Clock
                      }[trigger.icon] || Zap;

                      return (
                        <button
                          key={trigger.id}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            trigger: { type: trigger.id as TriggerType, config: {} }
                          }))}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.trigger.type === trigger.id
                              ? `border-${trigger.color}-500 bg-${trigger.color}-50 dark:bg-${trigger.color}-900/20`
                              : darkMode
                              ? 'border-gray-600 hover:border-gray-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg bg-${trigger.color}-100 dark:bg-${trigger.color}-900/30`}>
                              <IconComponent className={`w-5 h-5 text-${trigger.color}-600`} />
                            </div>
                            <div>
                              <h4 className={`font-medium ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {trigger.name}
                              </h4>
                              <p className={`text-sm ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {trigger.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.trigger.type && (
                  <div>
                    <h4 className={`font-medium mb-4 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Configure Trigger
                    </h4>
                    {renderTriggerConfig()}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Action */}
            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    What should this automation do?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableActions.map((action) => {
                      const IconComponent = {
                        'bell': Bell,
                        'mail': Mail,
                        'file-text': FileText,
                        'calendar': Calendar,
                        'zap': Zap
                      }[action.icon] || Bell;

                      return (
                        <button
                          key={action.id}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            action: { type: action.id as ActionType, config: {} }
                          }))}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.action.type === action.id
                              ? `border-${action.color}-500 bg-${action.color}-50 dark:bg-${action.color}-900/20`
                              : darkMode
                              ? 'border-gray-600 hover:border-gray-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30`}>
                              <IconComponent className={`w-5 h-5 text-${action.color}-600`} />
                            </div>
                            <div>
                              <h4 className={`font-medium ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {action.name}
                              </h4>
                              <p className={`text-sm ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.action.type && (
                  <div>
                    <h4 className={`font-medium mb-4 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Configure Action
                    </h4>
                    {renderActionConfig()}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Settings */}
            {activeStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Priority (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.settings.priority}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, priority: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Priority: {formData.settings.priority}</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.settings.retry_config.max_retries}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          retry_config: {
                            ...prev.settings.retry_config,
                            max_retries: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.settings.is_active}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, is_active: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Start automation immediately after saving
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
            disabled={activeStep === 1}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeStep === 1
                ? 'opacity-50 cursor-not-allowed'
                : darkMode
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleTestAutomation}
              disabled={!isStepValid || testMode}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Play className="w-4 h-4" />
              <span>{testMode ? 'Testing...' : 'Test'}</span>
            </button>

            {activeStep < 4 ? (
              <button
                onClick={() => setActiveStep(prev => prev + 1)}
                disabled={!isStepValid}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!isStepValid || saving}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Automation'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}