import React, { useState } from 'react';
import { 
  FileText, 
  BookOpen, 
  Users, 
  Clock, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function Dashboard() {
  const { state, dispatch } = useApp();
  const { documents, vocabulary, studySessions, darkMode } = state;

  // Statistiques simplifiées
  const stats = [
    {
      label: 'Documents',
      value: documents.length,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'documents' })
    },
    {
      label: 'Vocabulaire',
      value: vocabulary.length,
      icon: BookOpen,
      color: 'from-teal-500 to-teal-600',
      action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'vocabulary' })
    },
    {
      label: 'Sessions',
      value: studySessions.length,
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'planning' })
    }
  ];

  // Prochaine session à venir
  const nextSession = studySessions
    .filter(session => !session.completed && new Date(session.scheduledFor) >= new Date())
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];

  // Progrès de maîtrise du vocabulaire
  const vocabularyMastery = vocabulary.length > 0 
    ? Math.round(vocabulary.reduce((acc, v) => acc + v.mastery, 0) / vocabulary.length)
    : 0;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header simplifié */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Tableau de bord
        </h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Vue d'ensemble de votre apprentissage
        </p>
      </div>

      {/* Stats principales - 3 blocs maximum */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={stat.action}
              className={`
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                border rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group
              `}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stat.value}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenu principal - 2 colonnes */}
      <div className="grid grid-cols-1 gap-8">
        {/* Prochaine session */}
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-xl p-6
        `}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Prochaine session
            </h3>
            <Calendar className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          
          {nextSession ? (
            <div className="space-y-3">
              <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h4 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {nextSession.title}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(nextSession.scheduledFor).toLocaleDateString()} à{' '}
                  {new Date(nextSession.scheduledFor).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {nextSession.duration} minutes • {nextSession.type}
                </p>
              </div>
              <button 
                onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'planning' })}
                className="w-full py-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                Voir toutes les sessions
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Aucune session planifiée
              </p>
              <button 
                onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'planning' })}
                className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Planifier une session</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progrès d'apprentissage */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6
      `}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Progrès d'apprentissage
          </h3>
          <Target className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        
        <div className="space-y-4">
          {/* Maîtrise vocabulaire */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Maîtrise Vocabulaire
              </span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vocabularyMastery}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${vocabularyMastery}%` }}
              ></div>
            </div>
          </div>

          {/* Sessions complétées */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Sessions Complétées
              </span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {studySessions.filter(s => s.completed).length}/{studySessions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${studySessions.length > 0 
                    ? (studySessions.filter(s => s.completed).length / studySessions.length) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Bouton d'action */}
          <button 
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'vocabulary' })}
            className="w-full py-2 text-teal-500 hover:text-teal-600 text-sm font-medium"
          >
            Réviser le vocabulaire
          </button>
        </div>
      </div>

      {/* Actions rapides */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6
      `}>
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Actions rapides
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              label: 'Nouveau document', 
              icon: FileText, 
              color: 'text-blue-500',
              action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'documents' })
            },
            { 
              label: 'Ajouter un mot', 
              icon: BookOpen, 
              color: 'text-teal-500',
              action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'vocabulary' })
            },
            { 
              label: 'Collaborer', 
              icon: Users, 
              color: 'text-purple-500',
              action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'collaboration' })
            },
            { 
              label: 'Planifier', 
              icon: Calendar, 
              color: 'text-orange-500',
              action: () => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'planning' })
            }
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className={`
                  p-4 rounded-lg border transition-all duration-200 text-center group
                  ${darkMode 
                    ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${action.color}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}