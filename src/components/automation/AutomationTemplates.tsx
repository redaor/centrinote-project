import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  BookOpen,
  Trophy,
  AlertTriangle,
  BarChart3,
  Zap,
  Search,
  Filter,
  Star,
  Clock,
  Bell,
  Mail,
  FileText,
  Calendar,
  Crown,
  Plus
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { automationService } from '../../services/automationService';
import type { AutomationTemplate, TemplateFilter } from '../../types/automation';

interface AutomationTemplatesProps {
  onSelectTemplate: (template: AutomationTemplate) => void;
  onCreateCustom: () => void;
}

export function AutomationTemplates({ onSelectTemplate, onCreateCustom }: AutomationTemplatesProps) {
  const { state } = useApp();
  const { darkMode } = state;

  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TemplateFilter>({
    category: undefined,
    is_premium: undefined,
    search: ''
  });

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const templatesData = await automationService.getTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (filter.category) {
      filtered = filtered.filter(template => template.category === filter.category);
    }

    if (filter.is_premium !== undefined) {
      filtered = filtered.filter(template => template.is_premium === filter.is_premium);
    }

    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [templates, filter]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped = filteredTemplates.reduce((acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, AutomationTemplate[]>);

    return grouped;
  }, [filteredTemplates]);

  const categories = [
    { value: 'productivity', label: 'Productivity', icon: Archive, color: 'blue' },
    { value: 'learning', label: 'Learning', icon: BookOpen, color: 'green' },
    { value: 'motivation', label: 'Motivation', icon: Trophy, color: 'yellow' },
    { value: 'alerts', label: 'Alerts', icon: AlertTriangle, color: 'red' },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, color: 'purple' },
    { value: 'general', label: 'General', icon: Zap, color: 'indigo' }
  ];

  const getTemplateIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      'archive': Archive,
      'book-open': BookOpen,
      'trophy': Trophy,
      'alert-triangle': AlertTriangle,
      'bar-chart-3': BarChart3,
      'zap': Zap,
      'clock': Clock,
      'bell': Bell,
      'mail': Mail,
      'file-text': FileText,
      'calendar': Calendar
    };
    return icons[iconName] || Zap;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
          darkMode ? 'border-blue-400' : 'border-blue-600'
        }`}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Automation Templates
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Start with proven automation workflows
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateCustom}
          className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search templates..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        
        <select
          value={filter.category || ''}
          onChange={(e) => setFilter(prev => ({ 
            ...prev, 
            category: e.target.value || undefined 
          }))}
          className={`px-3 py-2 border rounded-lg ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>

        <select
          value={filter.is_premium === undefined ? '' : filter.is_premium ? 'premium' : 'free'}
          onChange={(e) => setFilter(prev => ({ 
            ...prev, 
            is_premium: e.target.value === '' ? undefined : e.target.value === 'premium'
          }))}
          className={`px-3 py-2 border rounded-lg ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          <option value="">All Types</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Templates by Category */}
      <div className="space-y-8">
        {Object.entries(templatesByCategory).map(([categoryKey, categoryTemplates]) => {
          const categoryInfo = categories.find(c => c.value === categoryKey);
          const CategoryIcon = categoryInfo?.icon || Zap;

          return (
            <div key={categoryKey}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg bg-${categoryInfo?.color}-100 dark:bg-${categoryInfo?.color}-900/30`}>
                  <CategoryIcon className={`w-5 h-5 text-${categoryInfo?.color}-600`} />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {categoryInfo?.label || categoryKey}
                </h3>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {categoryTemplates.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template, index) => {
                  const TemplateIcon = getTemplateIcon(template.icon);
                  
                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => onSelectTemplate(template)}
                      className={`${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      } border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-3 rounded-lg bg-${template.color}-100 dark:bg-${template.color}-900/30 group-hover:scale-110 transition-transform`}>
                          <TemplateIcon className={`w-6 h-6 text-${template.color}-600`} />
                        </div>
                        {template.is_premium && (
                          <div className="flex items-center space-x-1 text-yellow-500">
                            <Crown className="w-4 h-4" />
                            <span className="text-xs font-medium">PRO</span>
                          </div>
                        )}
                      </div>

                      <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {template.name}
                      </h4>
                      
                      <p className={`text-sm mb-4 line-clamp-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {template.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.trigger_schema.type.replace('_', ' ')}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.action_schema.type.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <motion.div
                          whileHover={{ x: 5 }}
                          className={`text-sm font-medium ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        >
                          Use Template →
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <Search className={`w-8 h-8 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No templates found
          </h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={() => setFilter({ category: undefined, is_premium: undefined, search: '' })}
            className={`text-sm font-medium ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Popular Templates Quick Access */}
      {filter.search === '' && filter.category === undefined && (
        <div className="mt-12">
          <div className="flex items-center space-x-2 mb-4">
            <Star className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Popular Templates
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates
              .filter(t => ['productivity', 'learning'].includes(t.category))
              .slice(0, 4)
              .map((template) => {
                const TemplateIcon = getTemplateIcon(template.icon);
                
                return (
                  <motion.button
                    key={`popular-${template.id}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectTemplate(template)}
                    className={`${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } border rounded-lg p-4 text-left hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${template.color}-100 dark:bg-${template.color}-900/30`}>
                        <TemplateIcon className={`w-5 h-5 text-${template.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {template.name}
                        </h4>
                        <p className={`text-xs truncate ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {template.category}
                        </p>
                      </div>
                      {template.is_premium && (
                        <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}