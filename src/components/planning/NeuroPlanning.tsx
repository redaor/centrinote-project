import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  Calendar,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Zap,
  Brain,
  TrendingUp,
  Bell,
  Timer,
  Flag,
  Star,
  BarChart3,
  Sparkles,
  GripVertical,
  Edit2,
  Trash2,
  RefreshCw,
  BookOpen,
  Users,
  Coffee,
  User
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNeuroFeedback } from '../../hooks/useNeuroFeedback';
import { useAdaptiveView } from '../../hooks/useAdaptiveView';

interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: 'study' | 'meeting' | 'review' | 'break' | 'personal';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  reminder?: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly';
  color: string;
}

interface TimeSlot {
  hour: number;
  tasks: Task[];
  cognitiveLoad: number;
  optimal: boolean;
}

const categoryColors = {
  study: 'from-blue-500 to-indigo-500',
  meeting: 'from-purple-500 to-pink-500',
  review: 'from-green-500 to-emerald-500',
  break: 'from-yellow-500 to-amber-500',
  personal: 'from-gray-500 to-slate-500'
};

const categoryIcons = {
  study: BookOpen,
  meeting: Users,
  review: RefreshCw,
  break: Coffee,
  personal: User
};

// Icons déjà importés plus haut

export function NeuroPlanning() {
  const { state, dispatch } = useApp();
  const { darkMode, user } = state;
  const { triggerReward, focusAttention, updateCognitiveLoad } = useNeuroFeedback();
  const { userBehavior, calculatePriority, trackInteraction } = useAdaptiveView(user?.id);
  
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'timeline'>('timeline');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate sample tasks for demo
  useEffect(() => {
    const sampleTasks: Task[] = [
      {
        id: '1',
        title: 'Révision vocabulaire',
        description: 'Revoir les 10 mots oubliés',
        startTime: new Date(selectedDate.setHours(9, 0)),
        endTime: new Date(selectedDate.setHours(10, 0)),
        category: 'review',
        priority: 'high',
        completed: false,
        reminder: true,
        color: categoryColors.review
      },
      {
        id: '2',
        title: 'Réunion équipe',
        description: 'Point hebdomadaire',
        startTime: new Date(selectedDate.setHours(11, 0)),
        endTime: new Date(selectedDate.setHours(12, 0)),
        category: 'meeting',
        priority: 'high',
        completed: false,
        color: categoryColors.meeting
      },
      {
        id: '3',
        title: 'Session étude',
        description: 'Chapitre 5 - Machine Learning',
        startTime: new Date(selectedDate.setHours(14, 0)),
        endTime: new Date(selectedDate.setHours(16, 0)),
        category: 'study',
        priority: 'medium',
        completed: false,
        color: categoryColors.study
      }
    ];
    setTasks(sampleTasks);
    updateCognitiveLoad(sampleTasks.filter(t => !t.completed).length);
  }, [selectedDate]);

  // Calculate optimal time slots based on user behavior
  const getOptimalTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const { activityPatterns } = userBehavior;
    
    for (let hour = 6; hour < 23; hour++) {
      const tasksInSlot = tasks.filter(t => {
        const taskHour = new Date(t.startTime).getHours();
        return taskHour === hour;
      });
      
      let optimal = false;
      if (hour >= 9 && hour <= 11 && activityPatterns.morning > 5) optimal = true;
      if (hour >= 14 && hour <= 16 && activityPatterns.afternoon > 5) optimal = true;
      if (hour >= 19 && hour <= 21 && activityPatterns.evening > 5) optimal = true;
      
      slots.push({
        hour,
        tasks: tasksInSlot,
        cognitiveLoad: tasksInSlot.reduce((acc, t) => acc + (t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1), 0),
        optimal
      });
    }
    
    return slots;
  };

  // Handle drag and drop
  const handleDragEnd = (taskId: string, newHour: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const duration = task.endTime.getTime() - task.startTime.getTime();
    const newStart = new Date(selectedDate);
    newStart.setHours(newHour, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, startTime: newStart, endTime: newEnd }
        : t
    ));
    
    triggerReward('Tâche déplacée! 📅', { type: 'success', haptic: true, sound: true });
    trackInteraction('planning-drag');
  };

  // Toggle task completion with reward
  const toggleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, completed: !t.completed }
        : t
    ));
    
    if (!task.completed) {
      triggerReward(`"${task.title}" terminée! 🎉`, { type: 'reward', haptic: true, sound: true });
      
      // Check for achievements
      const completedToday = tasks.filter(t => t.completed).length + 1;
      if (completedToday === 5) {
        triggerReward('🏆 5 tâches complétées aujourd\'hui!', { type: 'reward', haptic: true, sound: true });
      }
    }
  };

  // Add new task
  const addTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString()
    };
    
    setTasks(prev => [...prev, task]);
    setIsAddingTask(false);
    triggerReward('Nouvelle tâche ajoutée! 📌', { type: 'success', sound: true });
    focusAttention(`task-${task.id}`);
    updateCognitiveLoad(tasks.filter(t => !t.completed).length + 1);
  };

  // AI-powered task suggestions
  const getAISuggestions = () => {
    const suggestions = [];
    const currentHour = new Date().getHours();
    
    // Check for overload
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && !t.completed);
    if (highPriorityTasks.length > 3) {
      suggestions.push('⚠️ Trop de tâches prioritaires! Considérez reporter certaines.');
    }
    
    // Suggest breaks
    const hasBreak = tasks.some(t => t.category === 'break');
    if (!hasBreak && tasks.length > 4) {
      suggestions.push('☕ Ajoutez une pause pour maintenir votre productivité!');
    }
    
    // Optimal time suggestions
    if (currentHour >= 9 && currentHour <= 11) {
      suggestions.push('🧠 Moment optimal pour les tâches complexes!');
    }
    
    return suggestions;
  };

  const timeSlots = getOptimalTimeSlots();
  const suggestions = getAISuggestions();
  const completionRate = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) || 0;

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 to-purple-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📅 Planning Neuroadaptatif
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Optimisez votre journée avec l'IA cognitive
              </p>
            </div>
            
            {/* Productivity Score */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white"
            >
              <TrendingUp className="w-5 h-5" />
              <div>
                <p className="text-xs opacity-90">Productivité</p>
                <p className="text-xl font-bold">{completionRate}%</p>
              </div>
            </motion.div>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/20"
            >
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                    Suggestions intelligentes
                  </p>
                  {suggestions.map((suggestion, idx) => (
                    <p key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} ${idx > 0 ? 'mt-1' : ''}`}>
                      {suggestion}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* View Mode Selector */}
          <div className="flex gap-2 mb-6">
            {(['timeline', 'day', 'week'] as const).map((mode) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {mode === 'timeline' ? '🕐 Timeline' : mode === 'day' ? '📅 Jour' : '📊 Semaine'}
              </motion.button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddingTask(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Nouvelle tâche
            </motion.button>
          </div>
        </motion.div>

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <motion.div
            ref={timelineRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl p-6`}
          >
            {/* Time Slots */}
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <motion.div
                  key={slot.hour}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (slot.hour - 6) * 0.02 }}
                  className={`flex gap-4 p-3 rounded-lg ${
                    slot.optimal
                      ? darkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'
                      : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTask) {
                      handleDragEnd(draggedTask, slot.hour);
                      setDraggedTask(null);
                    }
                  }}
                >
                  {/* Time Label */}
                  <div className="w-20 flex-shrink-0">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {slot.hour}:00
                    </p>
                    {slot.optimal && (
                      <p className="text-xs text-blue-500 mt-1">Optimal</p>
                    )}
                  </div>
                  
                  {/* Tasks in Slot */}
                  <div className="flex-1 flex gap-2">
                    {slot.tasks.length > 0 ? (
                      slot.tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          id={`task-${task.id}`}
                          draggable
                          onDragStart={() => setDraggedTask(task.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative flex-1 p-3 rounded-lg cursor-move
                            bg-gradient-to-r ${task.color} text-white
                            ${task.completed ? 'opacity-60' : ''}
                          `}
                        >
                          {/* Priority Indicator */}
                          {task.priority === 'high' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          )}
                          
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <GripVertical className="w-4 h-4 opacity-50" />
                                <h4 className={`font-medium ${task.completed ? 'line-through' : ''}`}>
                                  {task.title}
                                </h4>
                              </div>
                              {task.description && (
                                <p className="text-xs opacity-90">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs">
                                  {new Date(task.endTime).getHours() - new Date(task.startTime).getHours()}h
                                </span>
                                {task.reminder && <Bell className="w-3 h-3" />}
                              </div>
                            </div>
                            
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleTaskCompletion(task.id)}
                              className="p-1"
                            >
                              {task.completed ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <div className="w-5 h-5 border-2 border-white rounded-full" />
                              )}
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className={`flex-1 p-3 rounded-lg border-2 border-dashed ${
                        darkMode ? 'border-gray-600' : 'border-gray-300'
                      }`}>
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Glissez une tâche ici
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Cognitive Load Indicator */}
                  {slot.cognitiveLoad > 0 && (
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(slot.cognitiveLoad, 5))].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            slot.cognitiveLoad > 3 ? 'bg-red-500' :
                            slot.cognitiveLoad > 1 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-7 gap-3"
          >
            {[...Array(7)].map((_, dayIndex) => {
              const date = new Date(selectedDate);
              date.setDate(selectedDate.getDate() - selectedDate.getDay() + dayIndex);
              const dayTasks = tasks.filter(t => 
                new Date(t.startTime).toDateString() === date.toDateString()
              );
              
              return (
                <motion.div
                  key={dayIndex}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  } shadow-lg`}
                >
                  <h3 className={`text-sm font-semibold mb-3 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                  </h3>
                  <div className="space-y-2">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={`p-2 rounded text-xs text-white bg-gradient-to-r ${task.color}`}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-xs text-gray-500">+{dayTasks.length - 3} autres</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Floating Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-6 left-6 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6" />
            <div>
              <p className="text-xs opacity-90">Aujourd'hui</p>
              <p className="text-lg font-bold">
                {tasks.filter(t => t.completed).length}/{tasks.length} tâches
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}