import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Play,
  Pause,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  Plus,
  Filter,
  Search,
  MoreVertical,
  Settings,
  Eye
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { 
  Automation, 
  AutomationStats, 
  ExecutionLogEntry, 
  DashboardCard 
} from '../../types/automation';

interface AutomationDashboardProps {
  onCreateAutomation: () => void;
  onEditAutomation: (automation: Automation) => void;
  onViewExecution: (executionId: string) => void;
}

export function AutomationDashboard({ 
  onCreateAutomation, 
  onEditAutomation, 
  onViewExecution 
}: AutomationDashboardProps) {
  const { state } = useApp();
  const { darkMode } = state;
  
  // State management
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<ExecutionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for development - replace with real API calls
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock automations
      const mockAutomations: Automation[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Daily Note Backup',
          description: 'Automatically backup notes every day at 2 AM',
          category: 'backup',
          trigger_type: 'time_based',
          trigger_config: { schedule: 'daily', time: '02:00' },
          action_type: 'backup_data',
          action_config: { target: 'notes', format: 'json' },
          conditions: [],
          schedule_config: { type: 'recurring', cron_expression: '0 2 * * *' },
          retry_config: { max_retries: 3, retry_delay: 300 },
          is_active: true,
          priority: 8,
          execution_count: 45,
          success_count: 43,
          failure_count: 2,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
          last_executed_at: '2024-02-03T02:00:00Z',
          next_execution_at: '2024-02-04T02:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Vocabulary Review Reminder',
          description: 'Send notification when 10 new vocabulary words are added',
          category: 'learning',
          trigger_type: 'vocabulary_added',
          trigger_config: { threshold: 10 },
          action_type: 'send_notification',
          action_config: { title: 'Time to Review!', message: 'You have new vocabulary to review' },
          conditions: [],
          schedule_config: {},
          retry_config: { max_retries: 2, retry_delay: 60 },
          is_active: true,
          priority: 6,
          execution_count: 12,
          success_count: 11,
          failure_count: 1,
          created_at: '2024-01-20T00:00:00Z',
          updated_at: '2024-01-25T00:00:00Z',
          last_executed_at: '2024-02-02T14:30:00Z'
        },
        {
          id: '3',
          user_id: 'user1',
          name: 'Weekly Progress Email',
          description: 'Send weekly learning progress summary every Friday',
          category: 'analytics',
          trigger_type: 'time_based',
          trigger_config: { schedule: 'weekly', day: 'friday', time: '17:00' },
          action_type: 'send_email',
          action_config: { template: 'weekly_report', recipients: ['user@example.com'] },
          conditions: [],
          schedule_config: { type: 'recurring', cron_expression: '0 17 * * 5' },
          retry_config: { max_retries: 3, retry_delay: 600 },
          is_active: false,
          priority: 5,
          execution_count: 8,
          success_count: 7,
          failure_count: 1,
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-30T00:00:00Z',
          last_executed_at: '2024-01-26T17:00:00Z'
        }
      ];

      // Mock stats
      const mockStats: AutomationStats = {
        total_automations: 3,
        active_automations: 2,
        total_executions: 65,
        success_rate: 93.8,
        avg_execution_time: 1250,
        executions_today: 5,
        executions_this_week: 18,
        most_used_trigger: 'time_based',
        most_used_action: 'send_notification'
      };

      // Mock recent executions
      const mockExecutions: ExecutionLogEntry[] = [
        {
          id: 'exec1',
          automation_name: 'Daily Note Backup',
          status: 'success',
          started_at: '2024-02-03T02:00:15Z',
          execution_time: 1340
        },
        {
          id: 'exec2',
          automation_name: 'Vocabulary Review Reminder',
          status: 'success',
          started_at: '2024-02-02T14:30:22Z',
          execution_time: 680
        },
        {
          id: 'exec3',
          automation_name: 'Daily Note Backup',
          status: 'failed',
          started_at: '2024-02-02T02:00:15Z',
          execution_time: 2100,
          error_message: 'Connection timeout to backup service'
        },
        {
          id: 'exec4',
          automation_name: 'Vocabulary Review Reminder',
          status: 'success',
          started_at: '2024-02-01T16:45:10Z',
          execution_time: 420
        }
      ];

      setAutomations(mockAutomations);
      setStats(mockStats);
      setRecentExecutions(mockExecutions);
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  // Filter automations
  const filteredAutomations = useMemo(() => {
    let filtered = automations;
    
    if (filter !== 'all') {
      filtered = filtered.filter(auto => 
        filter === 'active' ? auto.is_active : !auto.is_active
      );
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(auto =>
        auto.name.toLowerCase().includes(term) ||
        auto.description?.toLowerCase().includes(term) ||
        auto.category.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [automations, filter, searchTerm]);

  // Dashboard cards data
  const dashboardCards: DashboardCard[] = stats ? [
    {
      title: 'Total Automations',
      value: stats.total_automations,
      icon: 'zap',
      color: 'blue'
    },
    {
      title: 'Active Now',
      value: stats.active_automations,
      icon: 'play',
      color: 'green'
    },
    {
      title: 'Success Rate',
      value: `${stats.success_rate}%`,
      icon: 'trending-up',
      color: 'emerald'
    },
    {
      title: 'Avg. Time',
      value: `${stats.avg_execution_time}ms`,
      icon: 'clock',
      color: 'purple'
    }
  ] : [];

  const toggleAutomation = async (automationId: string, isActive: boolean) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === automationId ? { ...auto, is_active: isActive } : auto
    ));
    
    // TODO: Make API call to update automation status
    console.log('Toggle automation:', automationId, isActive);
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
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Automation Dashboard
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage and monitor your automated workflows
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateAutomation}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation</span>
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => {
          const IconComponent = {
            'zap': Zap,
            'play': Play,
            'trending-up': TrendingUp,
            'clock': Clock
          }[card.icon] || Zap;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-xl p-6 hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r from-${card.color}-500 to-${card.color}-600`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <p className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {card.value}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {card.title}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automations List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search automations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className={`px-3 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Automations */}
          <div className="space-y-3">
            {filteredAutomations.map((automation, index) => (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } border rounded-xl p-4 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      automation.is_active 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {automation.name}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {automation.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {automation.category}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {automation.execution_count} executions
                        </span>
                        <span className={`text-xs ${
                          automation.success_count / automation.execution_count > 0.9 
                            ? 'text-green-500' 
                            : 'text-yellow-500'
                        }`}>
                          {automation.execution_count > 0 
                            ? `${Math.round((automation.success_count / automation.execution_count) * 100)}% success`
                            : 'No executions'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleAutomation(automation.id, !automation.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        automation.is_active
                          ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      title={automation.is_active ? 'Pause automation' : 'Start automation'}
                    >
                      {automation.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onEditAutomation(automation)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode 
                          ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                      title="Edit automation"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Executions */}
        <div className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Executions
            </h3>
            <Activity className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <div className="space-y-3">
            {recentExecutions.map((execution) => (
              <div
                key={execution.id}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                  darkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onViewExecution(execution.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {execution.automation_name}
                  </span>
                  {execution.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(execution.started_at).toLocaleString()}
                  </span>
                  {execution.execution_time && (
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {execution.execution_time}ms
                    </span>
                  )}
                </div>
                {execution.error_message && (
                  <p className="text-xs text-red-500 mt-1 truncate">
                    {execution.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}