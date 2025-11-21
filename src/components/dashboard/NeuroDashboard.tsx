import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Zap,
  ChevronRight,
  Sparkles,
  Activity,
  Users,
  BookOpen,
  FileText,
  Bell,
  ArrowUp,
  Star
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNeuroFeedback } from '../../hooks/useNeuroFeedback';
import { useAdaptiveView } from '../../hooks/useAdaptiveView';
import { useNavigate } from 'react-router-dom';

interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  pulse: boolean;
  action: () => void;
  trend?: number;
  priority?: 'high' | 'medium' | 'low';
}

export function NeuroDashboard() {
  const { state, dispatch } = useApp();
  const { documents, vocabulary, studySessions, darkMode, user } = state;
  const navigate = useNavigate();
  const { triggerReward, focusAttention, pulseEffect, cognitiveLoad } = useNeuroFeedback();
  const { userBehavior, adaptiveContent, trackInteraction, getAdaptiveLayout } = useAdaptiveView(user?.id);
  
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const adaptiveLayout = getAdaptiveLayout();

  // Calculate dynamic metrics
  const forgottenWords = vocabulary.filter(v => v.difficulty === 'hard').length;
  const upcomingMeetings = 2; // Placeholder - should come from meetings data
  const pendingReviews = documents.filter(d => d.tags?.includes('review')).length;
  const weeklyProgress = 82; // Placeholder - calculate from actual data
  
  // Neurologically optimized cards with attention hierarchy
  const dashboardCards: DashboardCard[] = [
    {
      id: 'reviews',
      title: 'À réviser',
      value: pendingReviews,
      subtitle: pendingReviews > 0 ? 'notes en attente' : 'Tout est à jour! 🎉',
      icon: FileText,
      color: pendingReviews > 0 ? 'from-orange-500 to-amber-500' : 'from-green-500 to-emerald-500',
      pulse: pendingReviews > 3,
      priority: pendingReviews > 3 ? 'high' : 'medium',
      action: () => {
        trackInteraction('notes');
        navigate('/notes');
        triggerReward('Allons réviser! 📚', { type: 'info', haptic: true });
      },
      trend: 2
    },
    {
      id: 'meetings',
      title: 'Réunions',
      value: upcomingMeetings,
      subtitle: 'à venir cette semaine',
      icon: Users,
      color: 'from-blue-500 to-indigo-500',
      pulse: upcomingMeetings > 0,
      priority: upcomingMeetings > 0 ? 'high' : 'low',
      action: () => {
        trackInteraction('meetings');
        navigate('/meetings');
        triggerReward('Préparez vos réunions! 🎥', { type: 'info' });
      }
    },
    {
      id: 'vocabulary',
      title: 'Mots oubliés',
      value: forgottenWords,
      subtitle: forgottenWords > 0 ? 'à revoir d\'urgence' : 'Excellente mémoire! 🧠',
      icon: Brain,
      color: forgottenWords > 5 ? 'from-red-500 to-pink-500' : 'from-purple-500 to-violet-500',
      pulse: forgottenWords > 5,
      priority: forgottenWords > 5 ? 'high' : 'medium',
      action: () => {
        trackInteraction('vocabulary');
        navigate('/vocabulary');
        if (forgottenWords > 0) {
          focusAttention('vocabulary-forgotten');
          triggerReward(`${forgottenWords} mots à reconquérir! 💪`, { type: 'warning', sound: true });
        }
      },
      trend: -3
    },
    {
      id: 'progress',
      title: 'Progression',
      value: `${weeklyProgress}%`,
      subtitle: 'des objectifs hebdomadaires',
      icon: TrendingUp,
      color: 'from-teal-500 to-cyan-500',
      pulse: false,
      priority: 'low',
      action: () => {
        triggerReward('Continuez comme ça! 🚀', { type: 'reward', haptic: true, sound: true });
      },
      trend: 12
    }
  ];

  // Sort cards by priority and user behavior
  const sortedCards = [...dashboardCards].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority || 'low'];
    const bPriority = priorityOrder[b.priority || 'low'];
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Secondary sort by user interaction frequency
    const aInteractions = userBehavior.interactionCount[a.id] || 0;
    const bInteractions = userBehavior.interactionCount[b.id] || 0;
    return bInteractions - aInteractions;
  });

  // Loading animation
  useEffect(() => {
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  // Welcome message based on time and behavior
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const name = user?.name?.split(' ')[0] || 'Explorateur';
    
    if (hour < 12) return `Bonjour ${name}! ☀️ Prêt pour une journée productive?`;
    if (hour < 17) return `Bon après-midi ${name}! 🌤️ Gardez le rythme!`;
    if (hour < 21) return `Bonsoir ${name}! 🌅 Finissons en beauté!`;
    return `Bonne soirée ${name}! 🌙 Un peu de révision nocturne?`;
  };

  // Quick actions based on adaptive behavior
  const quickActions = [
    {
      label: 'Nouvelle note',
      icon: <FileText className="w-4 h-4" />,
      action: () => navigate('/notes?action=new'),
      color: 'bg-blue-500'
    },
    {
      label: 'Planifier',
      icon: <Calendar className="w-4 h-4" />,
      action: () => navigate('/planning'),
      color: 'bg-purple-500'
    },
    {
      label: 'Quiz rapide',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        triggerReward('Quiz lancé! 🎯', { type: 'reward' });
        navigate('/vocabulary?mode=quiz');
      },
      color: 'bg-teal-500'
    }
  ];

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-blue-50/20'}`}>
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen"
          >
            <div className="relative">
              <Brain className="w-16 h-16 text-blue-500 animate-pulse" />
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse pointer-events-none" aria-hidden="true" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            {/* Adaptive Header with Neuro Feedback */}
            <div className="mb-8">
              <motion.h1 
                className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}
                initial={{ x: -50 }}
                animate={{ x: 0 }}
              >
                {getWelcomeMessage()}
              </motion.h1>
              
              {/* Cognitive Load Indicator */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Activity className={`w-5 h-5 ${
                    cognitiveLoad === 'high' ? 'text-red-500' : 
                    cognitiveLoad === 'medium' ? 'text-yellow-500' : 'text-green-500'
                  }`} />
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Charge cognitive: {cognitiveLoad === 'high' ? 'Élevée' : cognitiveLoad === 'medium' ? 'Modérée' : 'Faible'}
                  </span>
                </div>
                
                {/* Streak Indicator */}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    7 jours consécutifs! 🔥
                  </span>
                </div>
              </div>

              {/* Adaptive Suggestions */}
              {adaptiveContent.suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/20"
                >
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      {adaptiveContent.suggestions.map((suggestion, idx) => (
                        <p key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} ${idx > 0 ? 'mt-1' : ''}`}>
                          {suggestion}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 mb-8"
            >
              {quickActions.map((action, idx) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  onClick={action.action}
                  className={`${action.color} text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all`}
                >
                  {action.icon}
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Interactive Dashboard Cards with Neuro Animations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={card.action}
                  onMouseEnter={() => setSelectedCard(card.id)}
                  onMouseLeave={() => setSelectedCard(null)}
                  className={`relative cursor-pointer group`}
                >
                  {/* Pulse Effect for High Priority */}
                  {card.pulse && (
                    <div
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-20 animate-pulse pointer-events-none"
                      style={{ backgroundImage: `linear-gradient(to right, ${card.color})` }}
                      aria-hidden="true"
                    />
                  )}
                  
                  <div className={`
                    relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300
                    ${darkMode 
                      ? 'bg-gray-800/90 border-gray-700 hover:border-gray-600' 
                      : 'bg-white/90 border-gray-200 hover:border-gray-300'
                    }
                    ${selectedCard === card.id ? 'ring-2 ring-blue-500 shadow-xl' : 'shadow-lg'}
                  `}>
                    {/* Priority Badge */}
                    {card.priority === 'high' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold"
                      >
                        Urgent
                      </motion.div>
                    )}
                    
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`
                        p-3 rounded-xl bg-gradient-to-br ${card.color}
                        ${selectedCard === card.id ? 'animate-pulse' : ''}
                      `}>
                        <card.icon className="w-6 h-6 text-white" />
                      </div>
                      
                      {card.trend && (
                        <div className={`flex items-center gap-1 text-sm ${
                          card.trend > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {card.trend > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}
                          <span className="font-medium">{Math.abs(card.trend)}%</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Card Content */}
                    <div>
                      <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {card.title}
                      </h3>
                      <p className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {card.value}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {card.subtitle}
                      </p>
                    </div>
                    
                    {/* Hover Action */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: selectedCard === card.id ? 1 : 0 }}
                      className="absolute bottom-3 right-3"
                    >
                      <ChevronRight className="w-5 h-5 text-blue-500" />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Achievement Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    🏆 Prochain objectif
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Plus que 3 révisions pour débloquer "Expert du jour"!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <Star className="w-5 h-5 text-gray-300" />
                  <Star className="w-5 h-5 text-gray-300" />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}