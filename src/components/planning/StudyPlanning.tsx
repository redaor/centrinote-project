import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Target,
  TrendingUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  X,
  Save
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { StudySession } from '../../types';

export function StudyPlanning() {
  const { state, dispatch } = useApp();
  const { studySessions, darkMode, vocabulary, documents } = state;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'analytics'>('calendar');
  
  // États pour le modal de création de session
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // État pour le formulaire de nouvelle session
  const [newSessionForm, setNewSessionForm] = useState({
    title: '',
    type: 'vocabulary' as 'vocabulary' | 'document' | 'mixed',
    description: '',
    scheduledFor: new Date().toISOString().slice(0, 16), // Format datetime-local
    duration: 30,
    documentIds: [] as string[],
    vocabularyIds: [] as string[]
  });

  const today = new Date();
  const upcomingSessions = studySessions.filter(session => 
    new Date(session.scheduledFor) >= today && !session.completed
  );
  const completedSessions = studySessions.filter(session => session.completed);
  const overdueSessions = studySessions.filter(session => 
    new Date(session.scheduledFor) < today && !session.completed
  );

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const resetNewSessionForm = () => {
    setNewSessionForm({
      title: '',
      type: 'vocabulary',
      description: '',
      scheduledFor: new Date().toISOString().slice(0, 16),
      duration: 30,
      documentIds: [],
      vocabularyIds: []
    });
  };

  const handleOpenNewSessionModal = () => {
    resetNewSessionForm();
    setShowNewSessionModal(true);
  };

  const handleCreateSession = () => {
    if (!newSessionForm.title.trim()) {
      showMessage("Le titre de la session est obligatoire !");
      return;
    }

    const scheduledDate = new Date(newSessionForm.scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      showMessage("Date et heure invalides !");
      return;
    }

    // Déterminer les items selon le type de session
    let items: string[] = [];
    if (newSessionForm.type === 'vocabulary') {
      items = newSessionForm.vocabularyIds;
    } else if (newSessionForm.type === 'document') {
      items = newSessionForm.documentIds;
    } else {
      items = [...newSessionForm.vocabularyIds, ...newSessionForm.documentIds];
    }

    const newSession: StudySession = {
      id: Date.now().toString(),
      title: newSessionForm.title.trim(),
      type: newSessionForm.type,
      scheduledFor: scheduledDate,
      duration: newSessionForm.duration,
      completed: false,
      progress: 0,
      items: items
    };

    dispatch({ type: 'ADD_STUDY_SESSION', payload: newSession });
    setShowNewSessionModal(false);
    resetNewSessionForm();
    showMessage("Session créée avec succès !");
  };

  const handleCompleteSession = (sessionId: string) => {
    const session = studySessions.find(s => s.id === sessionId);
    if (session) {
      const updatedSession = { ...session, completed: true, progress: 100 };
      dispatch({ type: 'UPDATE_STUDY_SESSION', payload: updatedSession });
      showMessage("Session marquée comme terminée !");
    }
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'vocabulary':
        return BookOpen;
      case 'document':
        return Target;
      case 'mixed':
        return Brain;
      default:
        return Clock;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'vocabulary':
        return 'from-teal-500 to-teal-600';
      case 'document':
        return 'from-blue-500 to-blue-600';
      case 'mixed':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const SessionCard = ({ session }: { session: StudySession }) => {
    const Icon = getSessionIcon(session.type);
    const isOverdue = new Date(session.scheduledFor) < today && !session.completed;
    
    return (
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-lg p-4 hover:shadow-md transition-all duration-200
        ${isOverdue ? 'border-red-500 border-opacity-50' : ''}
      `}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${getSessionColor(session.type)}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {session.title}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {session.type} • {session.duration} minutes
              </p>
            </div>
          </div>
          {isOverdue && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Progress
            </span>
            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
              {session.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getSessionColor(session.type)}`}
              style={{ width: `${session.progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              {new Date(session.scheduledFor).toLocaleDateString()} at{' '}
              {new Date(session.scheduledFor).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {!session.completed && (
              <button
                onClick={() => handleCompleteSession(session.id)}
                className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                title="Marquer comme terminé"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            {session.completed && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const CalendarView = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const getSessionsForDay = (day: number) => {
      const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
      return studySessions.filter(session => 
        session.scheduledFor.toISOString().split('T')[0] === dateStr
      );
    };

    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`p-2 text-center font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="p-2 h-24"></div>;
            }
            
            const sessions = getSessionsForDay(day);
            const isToday = day === today.getDate() && 
                           currentMonth === today.getMonth() && 
                           currentYear === today.getFullYear();
            
            return (
              <div 
                key={day}
                className={`
                  p-2 h-24 border rounded-lg cursor-pointer transition-colors
                  ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}
                  ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''}
                `}
              >
                <div className={`font-medium text-sm mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {sessions.slice(0, 2).map(session => (
                    <div 
                      key={session.id}
                      className={`
                        text-xs p-1 rounded truncate
                        ${session.completed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }
                      `}
                    >
                      {session.title}
                    </div>
                  ))}
                  {sessions.length > 2 && (
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      +{sessions.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AnalyticsView = () => {
    const totalSessions = studySessions.length;
    const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;
    const avgSessionDuration = studySessions.reduce((acc, session) => acc + session.duration, 0) / totalSessions || 0;
    
    const weeklyProgress = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const sessionsOnDate = studySessions.filter(session => 
        session.scheduledFor.toDateString() === date.toDateString() && session.completed
      );
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        sessions: sessionsOnDate.length,
        duration: sessionsOnDate.reduce((acc, session) => acc + session.duration, 0)
      };
    }).reverse();

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Sessions</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {totalSessions}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completion Rate</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round(completionRate)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Duration</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round(avgSessionDuration)}m
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Study Streak</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>7</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Weekly Progress
          </h3>
          <div className="flex items-end space-x-2 h-32">
            {weeklyProgress.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative" style={{ minHeight: '80px' }}>
                  {day.sessions > 0 && (
                    <div 
                      className="bg-gradient-to-t from-blue-500 to-teal-500 rounded-t w-full absolute bottom-0"
                      style={{ height: `${(day.sessions / Math.max(...weeklyProgress.map(d => d.sessions), 1)) * 80}px` }}
                    ></div>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {day.sessions}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {day.day}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
          ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'}
          border ${darkMode ? 'border-green-700' : 'border-green-200'}
        `}>
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Study Planning
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Organize and track your learning sessions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`
              px-3 py-2 rounded-lg border transition-colors
              ${darkMode 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
            `}
          />
          <button
            onClick={handleOpenNewSessionModal}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upcoming</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {upcomingSessions.length}
              </p>
            </div>
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {completedSessions.length}
              </p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
        </div>
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Overdue</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {overdueSessions.length}
              </p>
            </div>
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode('calendar')}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2
            ${viewMode === 'calendar'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2
            ${viewMode === 'list'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          <Target className="w-4 h-4" />
          <span>List</span>
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2
            ${viewMode === 'analytics'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </div>

      {/* Content */}
      {viewMode === 'calendar' && <CalendarView />}
      
      {viewMode === 'list' && (
        <div className="space-y-4">
          {studySessions.length > 0 ? (
            studySessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No study sessions yet
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create your first study session to get started.
              </p>
            </div>
          )}
        </div>
      )}
      
      {viewMode === 'analytics' && <AnalyticsView />}

      {/* Modal Nouvelle Session */}
      {showNewSessionModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowNewSessionModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-96 max-h-[90vh] overflow-y-auto
          `}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Créer une Nouvelle Session
              </h2>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Titre de la session *
                </label>
                <input
                  type="text"
                  value={newSessionForm.title}
                  onChange={(e) => setNewSessionForm({...newSessionForm, title: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Ex: Révision Machine Learning"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Type de session
                </label>
                <select
                  value={newSessionForm.type}
                  onChange={(e) => setNewSessionForm({...newSessionForm, type: e.target.value as 'vocabulary' | 'document' | 'mixed'})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                >
                  <option value="vocabulary">Session de vocabulaire</option>
                  <option value="document">Révision de document</option>
                  <option value="mixed">Session mixte</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={newSessionForm.description}
                  onChange={(e) => setNewSessionForm({...newSessionForm, description: e.target.value})}
                  rows={3}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors resize-none
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Décrivez l'objectif de cette session..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date et heure
                </label>
                <input
                  type="datetime-local"
                  value={newSessionForm.scheduledFor}
                  onChange={(e) => setNewSessionForm({...newSessionForm, scheduledFor: e.target.value})}
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

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={newSessionForm.duration}
                  onChange={(e) => setNewSessionForm({...newSessionForm, duration: parseInt(e.target.value)})}
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

              {(newSessionForm.type === 'document' || newSessionForm.type === 'mixed') && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Documents à réviser
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {documents.map(doc => (
                      <label key={doc.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newSessionForm.documentIds.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSessionForm({
                                ...newSessionForm,
                                documentIds: [...newSessionForm.documentIds, doc.id]
                              });
                            } else {
                              setNewSessionForm({
                                ...newSessionForm,
                                documentIds: newSessionForm.documentIds.filter(id => id !== doc.id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {doc.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(newSessionForm.type === 'vocabulary' || newSessionForm.type === 'mixed') && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mots de vocabulaire à réviser
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {vocabulary.map(word => (
                      <label key={word.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newSessionForm.vocabularyIds.includes(word.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSessionForm({
                                ...newSessionForm,
                                vocabularyIds: [...newSessionForm.vocabularyIds, word.id]
                              });
                            } else {
                              setNewSessionForm({
                                ...newSessionForm,
                                vocabularyIds: newSessionForm.vocabularyIds.filter(id => id !== word.id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {word.word}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSession}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>Créer la Session</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}