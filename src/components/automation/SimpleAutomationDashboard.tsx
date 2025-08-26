import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  BookOpen,
  Mail,
  Save,
  Play,
  Pause,
  Settings,
  Star,
  Trophy,
  Bell,
  Calendar
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

// Types simplifiés style IFTTT
interface SimpleAutomation {
  id: string;
  title: string;
  description: string;
  category: 'revisions' | 'rappels' | 'résumés' | 'sauvegardes';
  trigger: string;
  action: string;
  isActive: boolean;
  icon: string;
  color: string;
}

// Modèles prédéfinis inspirés d'IFTTT
const AUTOMATION_TEMPLATES: SimpleAutomation[] = [
  // Révisions
  {
    id: 'daily-review',
    title: 'Révision quotidienne',
    description: 'Rappel tous les jours à 9h pour réviser vos notes',
    category: 'revisions',
    trigger: 'Tous les jours à 9h',
    action: 'Envoyer une notification de révision',
    isActive: false,
    icon: 'clock',
    color: 'blue'
  },
  {
    id: 'vocab-milestone',
    title: 'Milestone vocabulaire',
    description: 'Célébrer quand vous atteignez 50, 100 ou 200 mots',
    category: 'revisions',
    trigger: 'Atteindre 50/100/200 mots',
    action: 'Envoyer félicitations + badge',
    isActive: false,
    icon: 'trophy',
    color: 'yellow'
  },
  {
    id: 'forgotten-notes',
    title: 'Notes oubliées',
    description: 'Rappel pour les notes non consultées depuis 7 jours',
    category: 'revisions',
    trigger: 'Note non vue depuis 7 jours',
    action: 'Proposer de réviser la note',
    isActive: false,
    icon: 'book-open',
    color: 'orange'
  },

  // Rappels
  {
    id: 'study-reminder',
    title: 'Session d\'étude',
    description: 'Rappel quotidien pour votre session d\'étude',
    category: 'rappels',
    trigger: 'Tous les jours à 18h',
    action: 'Rappel "C\'est l\'heure d\'étudier !"',
    isActive: false,
    icon: 'bell',
    color: 'green'
  },
  {
    id: 'break-reminder',
    title: 'Pause bien méritée',
    description: 'Rappel de faire une pause après 2h d\'étude',
    category: 'rappels',
    trigger: 'Après 2h d\'étude continue',
    action: 'Suggestion de pause de 15min',
    isActive: false,
    icon: 'clock',
    color: 'purple'
  },

  // Résumés
  {
    id: 'weekly-summary',
    title: 'Résumé hebdomadaire',
    description: 'Email avec vos progrès et statistiques chaque vendredi',
    category: 'résumés',
    trigger: 'Tous les vendredis à 17h',
    action: 'Envoyer email de résumé',
    isActive: false,
    icon: 'mail',
    color: 'blue'
  },
  {
    id: 'monthly-report',
    title: 'Bilan mensuel',
    description: 'Rapport complet de vos apprentissages du mois',
    category: 'résumés',
    trigger: 'Le 1er de chaque mois',
    action: 'Créer rapport mensuel détaillé',
    isActive: false,
    icon: 'calendar',
    color: 'indigo'
  },

  // Sauvegardes
  {
    id: 'daily-backup',
    title: 'Sauvegarde quotidienne',
    description: 'Sauvegarde automatique de toutes vos notes à 2h du matin',
    category: 'sauvegardes',
    trigger: 'Tous les jours à 2h',
    action: 'Sauvegarder toutes les données',
    isActive: false,
    icon: 'save',
    color: 'gray'
  }
];

const CATEGORY_CONFIG = {
  revisions: {
    title: 'Révisions',
    icon: BookOpen,
    color: 'blue',
    description: 'Optimisez vos révisions avec des rappels intelligents'
  },
  rappels: {
    title: 'Rappels',
    icon: Bell,
    color: 'green',
    description: 'Ne ratez jamais vos sessions d\'étude'
  },
  résumés: {
    title: 'Résumés',
    icon: Mail,
    color: 'purple',
    description: 'Suivez vos progrès avec des rapports automatiques'
  },
  sauvegardes: {
    title: 'Sauvegardes',
    icon: Save,
    color: 'gray',
    description: 'Protégez vos données avec des sauvegardes régulières'
  }
};

export function SimpleAutomationDashboard() {
  const { state } = useApp();
  const { darkMode } = state;
  
  const [automations, setAutomations] = useState<SimpleAutomation[]>(AUTOMATION_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === id ? { ...auto, isActive: !auto.isActive } : auto
    ));
  };

  const filteredAutomations = selectedCategory === 'all' 
    ? automations 
    : automations.filter(auto => auto.category === selectedCategory);

  const activeCount = automations.filter(auto => auto.isActive).length;

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      'clock': Clock,
      'trophy': Trophy,
      'book-open': BookOpen,
      'bell': Bell,
      'mail': Mail,
      'calendar': Calendar,
      'save': Save,
      'star': Star
    };
    return icons[iconName] || Clock;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header simplifié */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            🤖 Automatisations Centrinote
          </motion.h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <strong>{activeCount}</strong> automatisation{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
          </p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Cliquez sur une carte pour l'activer instantanément
          </p>
        </div>

        {/* Filtres par catégorie - Style boutons pilules */}
        <div className="flex justify-center mb-8">
          <div className={`inline-flex p-1 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Toutes
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === key
                    ? `bg-${config.color}-500 text-white shadow-sm`
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {config.title}
              </button>
            ))}
          </div>
        </div>

        {/* Cartes d'automatisation - Style IFTTT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAutomations.map((automation, index) => {
            const IconComponent = getIconComponent(automation.icon);
            const isActive = automation.isActive;
            
            return (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative group cursor-pointer ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 ${
                  isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => toggleAutomation(automation.id)}
              >
                {/* Badge d'état */}
                <div className={`absolute top-4 right-4 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{isActive ? 'Actif' : 'Inactif'}</span>
                </div>

                {/* Icône principale */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-${automation.color}-500 to-${automation.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Contenu principal */}
                <div className="space-y-3">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {automation.title}
                  </h3>
                  
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {automation.description}
                  </p>

                  {/* Logique IFTTT "Quand -> Faire" */}
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} space-y-2`}>
                    <div className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wide`}>
                      Quand
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {automation.trigger}
                    </div>
                    
                    <div className="flex items-center justify-center py-1">
                      <div className={`h-px flex-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                      <span className={`px-2 text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ALORS
                      </span>
                      <div className={`h-px flex-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    </div>
                    
                    <div className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wide`}>
                      Faire
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {automation.action}
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className={`pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className={`text-center text-sm font-medium ${
                      isActive 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {isActive ? '✓ Automatisation activée' : 'Cliquer pour activer'}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Message d'encouragement */}
        {activeCount === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-12 text-center p-8 rounded-2xl ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'
            } border`}
          >
            <div className="text-4xl mb-4">🚀</div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Prêt à automatiser votre apprentissage ?
            </h3>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Activez vos première automatisations en cliquant sur les cartes ci-dessus.
              <br />
              Elles fonctionneront en arrière-plan pour vous aider à progresser !
            </p>
          </motion.div>
        )}

        {/* Footer informatif simple */}
        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-8 text-center p-4 rounded-lg ${
              darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <p className="text-sm">
              🤖 Vos automatisations sont maintenant actives et fonctionnent en arrière-plan.
              <br />
              Vous recevrez des notifications quand elles s'exécutent !
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}