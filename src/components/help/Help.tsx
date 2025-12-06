/**
 * Page Aide & Support - Version moderne et élégante
 * Intégration intelligente du chatbot avec mini-jeu pour débloquer le support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  MessageCircle,
  Mail,
  Send,
  Bot,
  Download,
  Sparkles,
  Video,
  Zap,
  Link2,
  ExternalLink,
  ChevronRight,
  X,
  Minimize2,
  Maximize2,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { ChatbotWidget } from '../chatbot/ChatbotWidget';
import { SupportMiniGame } from './SupportMiniGame';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface QuickAnswer {
  id: string;
  question: string;
  answer: string;
  category: 'importation' | 'ia' | 'reunions' | 'automation' | 'partage';
}

interface Category {
  id: string;
  label: string;
  emoji: string;
  count: number;
  color: string;
}

export function Help() {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // États de recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // États du chatbot
  const [chatState, setChatState] = useState<'minimized' | 'open' | 'game' | 'failed'>('minimized');
  const [chatbotFailureCount, setChatbotFailureCount] = useState(0);
  const [showContactButton, setShowContactButton] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  
  // États du formulaire de contact
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    email: user?.email || '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Statistiques de support (simulées)
  const [stats] = useState({
    questionsResolved: 127,
    averageTime: '2min 34s',
    satisfaction: 94
  });

  // Réponses rapides transformées en cards
  const quickAnswers: QuickAnswer[] = [
    {
      id: 'q1',
      question: 'Importer des documents',
      answer: 'Cliquez sur "+ Nouvelle Note" puis sélectionnez "Importer". Formats supportés : PDF, Word, Images.',
      category: 'importation'
    },
    {
      id: 'q2',
      question: 'IA & Résumés',
      answer: 'Sélectionnez votre texte, puis cliquez sur l\'icône ✨ "Résumer avec l\'IA". Vous pouvez aussi traduire et améliorer vos textes.',
      category: 'ia'
    },
    {
      id: 'q3',
      question: 'Réunions vidéo',
      answer: 'Allez dans l\'onglet "Réunions" et cliquez sur "Nouvelle réunion". Invitez vos collaborateurs et enregistrez vos sessions.',
      category: 'reunions'
    },
    {
      id: 'q4',
      question: 'Automatisations',
      answer: 'Rendez-vous dans Paramètres > Automatisations et activez les règles souhaitées. Créez vos propres workflows personnalisés.',
      category: 'automation'
    },
    {
      id: 'q5',
      question: 'Partage de notes',
      answer: 'Ouvrez la note, cliquez sur les 3 points, puis "Partager". Générez un lien public ou invitez des collaborateurs spécifiques.',
      category: 'partage'
    }
  ];

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: t('faq_import_documents_q') || 'Comment importer des documents ?',
      answer: t('faq_import_documents_a') || 'Vous pouvez importer des documents en cliquant sur le bouton "+ Nouvelle Note" puis en sélectionnant "Importer".',
      category: 'importation'
    },
    {
      id: '2',
      question: t('faq_ai_search_q') || 'Comment utiliser la recherche IA ?',
      answer: t('faq_ai_search_a') || 'La recherche IA vous permet de trouver des informations dans vos notes en utilisant le langage naturel.',
      category: 'ia'
    },
    {
      id: '3',
      question: t('faq_collaboration_q') || 'Comment collaborer avec d\'autres utilisateurs ?',
      answer: t('faq_collaboration_a') || 'Vous pouvez partager vos notes et collaborer en temps réel avec d\'autres utilisateurs.',
      category: 'reunions'
    },
    {
      id: '4',
      question: t('faq_flashcards_q') || 'Comment utiliser les flashcards ?',
      answer: t('faq_flashcards_a') || 'Les flashcards vous permettent de réviser efficacement votre vocabulaire.',
      category: 'ia'
    },
    {
      id: '5',
      question: t('faq_subscription_q') || 'Comment gérer mon abonnement ?',
      answer: t('faq_subscription_a') || 'Vous pouvez gérer votre abonnement dans les paramètres de votre compte.',
      category: 'automation'
    },
    {
      id: '6',
      question: t('faq_security_q') || 'Mes données sont-elles sécurisées ?',
      answer: t('faq_security_a') || 'Oui, toutes vos données sont chiffrées et sécurisées selon les standards les plus stricts.',
      category: 'importation'
    }
  ];

  // Catégories avec compteurs
  const categories: Category[] = [
    { id: 'all', label: 'Tous', emoji: '📋', count: faqItems.length, color: 'from-gray-500 to-gray-600' },
    { id: 'importation', label: 'Importation', emoji: '📥', count: faqItems.filter(f => f.category === 'importation').length, color: 'from-blue-500 to-blue-600' },
    { id: 'ia', label: 'IA', emoji: '✨', count: faqItems.filter(f => f.category === 'ia').length, color: 'from-purple-500 to-purple-600' },
    { id: 'reunions', label: 'Réunions', emoji: '📹', count: faqItems.filter(f => f.category === 'reunions').length, color: 'from-red-500 to-red-600' },
    { id: 'automation', label: 'Automatisation', emoji: '⚡', count: faqItems.filter(f => f.category === 'automation').length, color: 'from-yellow-500 to-yellow-600' }
  ];

  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Gérer les échecs du chatbot - déclencher le mini-jeu après 3 échecs
  useEffect(() => {
    if (chatbotFailureCount >= 3 && chatState !== 'game') {
      setChatState('game');
    }
  }, [chatbotFailureCount, chatState]);

  // Écouter les messages du chatbot pour détecter les échecs
  useEffect(() => {
    const handleChatbotFailure = () => {
      setChatbotFailureCount(prev => prev + 1);
    };

    // Écouter les événements personnalisés du chatbot
    window.addEventListener('chatbot-failure', handleChatbotFailure);
    
    return () => {
      window.removeEventListener('chatbot-failure', handleChatbotFailure);
    };
  }, []);

  const handleGameComplete = () => {
    setGameCompleted(true);
    setShowContactButton(true);
    setChatState('open');
  };

  const handleGameSkip = () => {
    setShowContactButton(true);
    setChatState('open');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-support`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: user?.email?.split('@')[0] || 'Utilisateur',
            email: contactForm.email,
            subject: contactForm.subject,
            message: contactForm.message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du message');
      }

      setFormSubmitted(true);

      setTimeout(() => {
        setFormSubmitted(false);
        setShowContactForm(false);
        setContactForm({ subject: '', message: '', email: user?.email || '' });
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Erreur lors de l\'envoi du message. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'importation': return <Download className="w-5 h-5" />;
      case 'ia': return <Sparkles className="w-5 h-5" />;
      case 'reunions': return <Video className="w-5 h-5" />;
      case 'automation': return <Zap className="w-5 h-5" />;
      case 'partage': return <Link2 className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'importation': return 'from-blue-500 to-blue-600';
      case 'ia': return 'from-purple-500 to-purple-600';
      case 'reunions': return 'from-red-500 to-red-600';
      case 'automation': return 'from-yellow-500 to-yellow-600';
      case 'partage': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleViewGuide = (category: string) => {
    // Mapper les catégories des quickAnswers vers les catégories des FAQs
    const categoryMap: Record<string, string> = {
      'importation': 'importation',
      'ia': 'ia',
      'reunions': 'reunions',
      'automation': 'automation',
      'partage': 'importation' // Partage n'a pas de catégorie FAQ, on utilise importation
    };

    const faqCategory = categoryMap[category] || 'all';
    
    // Activer la catégorie correspondante
    setActiveCategory(faqCategory);
    
    // Scroll vers la section FAQ après un court délai
    setTimeout(() => {
      const faqSection = document.getElementById('faq-section');
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className={`
      min-h-screen pb-20
      ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20'}
    `}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header Moderne */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8 md:mb-12"
        >
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl sm:rounded-2xl shadow-lg">
              <HelpCircle className="w-5 h-5 sm:w-6 h-6 md:w-8 h-8 text-white" />
            </div>
            <h1 className={`
              text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold
              ${darkMode ? 'text-white' : 'text-gray-900'}
            `}>
              Aide & Support
            </h1>
          </div>

          {/* Barre de recherche améliorée */}
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6">
            <div className="relative">
              <Search className={`
                absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 h-5
                ${darkMode ? 'text-gray-400' : 'text-gray-500'}
              `} />
              <input
                type="text"
                placeholder="🔍 Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`
                  w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl border-2 transition-all text-sm sm:text-base
                  ${darkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 shadow-md'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>
          </div>

          {/* Message d'accueil IA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`
              max-w-2xl mx-auto p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border
              ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200 backdrop-blur-sm'}
              shadow-lg
            `}
          >
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <Bot className="w-5 h-5 sm:w-6 h-6 text-blue-500 flex-shrink-0" />
              <p className={`
                text-sm sm:text-base md:text-lg font-medium text-center
                ${darkMode ? 'text-gray-200' : 'text-gray-800'}
              `}>
                "Bonjour ! Je suis votre assistant IA, prêt à vous aider 24/7"
              </p>
            </div>
            <button
              onClick={() => {
                setChatState('open');
                // Déclencher l'ouverture du chatbot via événement personnalisé
                window.dispatchEvent(new CustomEvent('open-chatbot'));
              }}
              className={`
                w-full mt-3 sm:mt-4 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base
                bg-gradient-to-r from-blue-500 to-purple-500 text-white
                hover:shadow-lg active:scale-95
                flex items-center justify-center space-x-2
              `}
            >
              <MessageCircle className="w-4 h-4 sm:w-5 h-5" />
              <span className="hidden sm:inline">💬 Démarrer une conversation</span>
              <span className="sm:hidden">💬 Démarrer</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Quick Access Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-6xl mx-auto mb-6 sm:mb-8 md:mb-12"
        >
          <div className={`
            p-3 sm:p-4 rounded-lg sm:rounded-xl border
            ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200 backdrop-blur-sm'}
            shadow-md
          `}>
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <Zap className={`w-4 h-4 sm:w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
              <span className={`
                font-semibold text-xs sm:text-sm
                ${darkMode ? 'text-gray-300' : 'text-gray-700'}
              `}>
                ⚡ Accès rapide :
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {categories.slice(1).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setTimeout(() => {
                      document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className={`
                    px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all
                    ${darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    active:scale-95
                  `}
                >
                  <span className="mr-1">{cat.emoji}</span>
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Cards Modernes (Remplacement des accordéons) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-6xl mx-auto mb-6 sm:mb-8 md:mb-12"
        >
          <h2 className={`
            text-xl sm:text-2xl font-bold mb-4 sm:mb-6
            ${darkMode ? 'text-white' : 'text-gray-900'}
          `}>
            📚 Réponses rapides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {quickAnswers.map((qa, index) => (
              <motion.div
                key={qa.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`
                  p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border-2 transition-all cursor-pointer
                  ${darkMode
                    ? 'bg-gray-800 border-gray-700 hover:border-blue-500'
                    : 'bg-white border-gray-200 hover:border-blue-500 shadow-md hover:shadow-lg'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${getCategoryColor(qa.category)}
                  flex items-center justify-center mb-3 sm:mb-4
                `}>
                  {getCategoryIcon(qa.category)}
                </div>
                <h3 className={`
                  text-base sm:text-lg font-bold mb-2
                  ${darkMode ? 'text-white' : 'text-gray-900'}
                `}>
                  {qa.question}
                </h3>
                <p className={`
                  text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed
                  ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                `}>
                  {qa.answer}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewGuide(qa.category);
                  }}
                  className={`
                    text-xs sm:text-sm font-medium flex items-center space-x-1 transition-all
                    ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
                    hover:underline group active:scale-95
                  `}
                >
                  <span>Voir guide</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Statistiques de Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-6xl mx-auto mb-6 sm:mb-8 md:mb-12"
        >
          <div className={`
            p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border
            ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200 backdrop-blur-sm'}
            shadow-md
          `}>
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <TrendingUp className={`w-4 h-4 sm:w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <h3 className={`
                font-bold text-base sm:text-lg
                ${darkMode ? 'text-white' : 'text-gray-900'}
              `}>
                📊 Aujourd'hui :
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle className={`w-5 h-5 sm:w-6 h-6 flex-shrink-0 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                <div>
                  <p className={`
                    font-semibold text-sm sm:text-base
                    ${darkMode ? 'text-white' : 'text-gray-900'}
                  `}>
                    {stats.questionsResolved} questions résolues
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Clock className={`w-5 h-5 sm:w-6 h-6 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <div>
                  <p className={`
                    font-semibold text-sm sm:text-base
                    ${darkMode ? 'text-white' : 'text-gray-900'}
                  `}>
                    Temps moyen : {stats.averageTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="text-xl sm:text-2xl flex-shrink-0">😊</span>
                <div>
                  <p className={`
                    font-semibold text-sm sm:text-base
                    ${darkMode ? 'text-white' : 'text-gray-900'}
                  `}>
                    Satisfaction : {stats.satisfaction}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ressources - Guide utilisateur et Forum */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="max-w-6xl mx-auto mb-6 sm:mb-8 md:mb-12"
        >
          <h2 className={`
            text-xl sm:text-2xl font-bold mb-4 sm:mb-6
            ${darkMode ? 'text-white' : 'text-gray-900'}
          `}>
            📚 Ressources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Guide utilisateur */}
            <motion.button
              onClick={() => navigate('/guide')}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`
                p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border-2 transition-all text-left active:scale-95
                ${darkMode
                  ? 'bg-gray-800 border-gray-700 hover:border-blue-500'
                  : 'bg-white border-gray-200 hover:border-blue-500 shadow-md hover:shadow-lg'
                }
              `}
            >
              <div className="flex items-start space-x-3 sm:space-x-4">
                <span className="text-3xl sm:text-4xl flex-shrink-0">📘</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className={`
                      font-bold text-base sm:text-lg
                      ${darkMode ? 'text-white' : 'text-gray-900'}
                    `}>
                      Guide utilisateur
                    </h3>
                    <ExternalLink className={`w-3 h-3 sm:w-4 h-4 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  </div>
                  <p className={`
                    text-xs sm:text-sm leading-relaxed
                    ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                  `}>
                    {t('guide_user_description') || 'Découvrez toutes les fonctionnalités de Centrinote avec notre guide complet'}
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Forum communautaire */}
            <motion.button
              onClick={() => navigate('/forum')}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`
                p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border-2 transition-all text-left active:scale-95
                ${darkMode
                  ? 'bg-gray-800 border-gray-700 hover:border-purple-500'
                  : 'bg-white border-gray-200 hover:border-purple-500 shadow-md hover:shadow-lg'
                }
              `}
            >
              <div className="flex items-start space-x-3 sm:space-x-4">
                <span className="text-3xl sm:text-4xl flex-shrink-0">💬</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className={`
                      font-bold text-base sm:text-lg
                      ${darkMode ? 'text-white' : 'text-gray-900'}
                    `}>
                      Forum communautaire
                    </h3>
                    <ExternalLink className={`w-3 h-3 sm:w-4 h-4 flex-shrink-0 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                  </div>
                  <p className={`
                    text-xs sm:text-sm leading-relaxed
                    ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                  `}>
                    {t('forum_community_description') || 'Posez vos questions, partagez vos astuces et aidez les autres utilisateurs'}
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Catégories FAQ */}
        <motion.div
          id="faq-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-6xl mx-auto mb-6 sm:mb-8 md:mb-12"
        >
          <h2 className={`
            text-xl sm:text-2xl font-bold mb-4 sm:mb-6
            ${darkMode ? 'text-white' : 'text-gray-900'}
          `}>
            📋 Parcourir par catégorie :
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`
                  p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95
                  ${activeCategory === category.id
                    ? darkMode
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-blue-500 text-white'
                      : 'bg-gradient-to-br from-blue-500 to-purple-500 border-blue-400 text-white'
                    : darkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{category.emoji}</div>
                <div className="font-semibold text-xs sm:text-sm">{category.label}</div>
                <div className="text-xs mt-1 opacity-75">{category.count} guides</div>
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="space-y-3 sm:space-y-4">
            {filteredFAQs.map((faq) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`
                  p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border
                  ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  shadow-md hover:shadow-lg transition-all
                `}
              >
                <h3 className={`
                  font-bold text-base sm:text-lg mb-2
                  ${darkMode ? 'text-white' : 'text-gray-900'}
                `}>
                  {faq.question}
                </h3>
                <p className={`
                  text-xs sm:text-sm leading-relaxed
                  ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                `}>
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Search className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`
                text-base sm:text-lg font-medium mb-2
                ${darkMode ? 'text-white' : 'text-gray-900'}
              `}>
                Aucun résultat trouvé
              </h3>
              <p className={`
                text-sm sm:text-base
                ${darkMode ? 'text-gray-400' : 'text-gray-600'}
              `}>
                Essayez avec d'autres mots-clés
              </p>
            </div>
          )}
        </motion.div>

        {/* Bouton Contact Support Conditionnel */}
        <AnimatePresence>
          {showContactButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-12"
            >
              <div className={`
                p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border
                ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200 backdrop-blur-sm'}
                shadow-lg text-center
              `}>
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎮</div>
                <h3 className={`
                  text-lg sm:text-xl font-bold mb-2
                  ${darkMode ? 'text-white' : 'text-gray-900'}
                `}>
                  Challenge complété !
                </h3>
                <p className={`
                  text-xs sm:text-sm mb-3 sm:mb-4
                  ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                `}>
                  Débloquez le support avancé
                </p>
                <button
                  onClick={() => setShowContactForm(true)}
                  className={`
                    px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base
                    bg-gradient-to-r from-green-500 to-teal-500 text-white
                    hover:shadow-lg active:scale-95
                    flex items-center justify-center space-x-2 mx-auto
                  `}
                >
                  <span>🔓</span>
                  <span className="hidden sm:inline">Débloquer Support Humain</span>
                  <span className="sm:hidden">Débloquer Support</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire de contact */}
        <AnimatePresence>
          {showContactForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-12 px-3 sm:px-0"
            >
              <div className={`
                p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                shadow-lg
              `}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className={`
                    text-lg sm:text-xl font-bold
                    ${darkMode ? 'text-white' : 'text-gray-900'}
                  `}>
                    📧 Contacter le support
                  </h3>
                  <button
                    onClick={() => setShowContactForm(false)}
                    className={`
                      p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0
                      ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                    `}
                  >
                    <X className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  </button>
                </div>

                {formSubmitted ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Send className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h3 className={`
                      text-lg sm:text-xl font-bold mb-2
                      ${darkMode ? 'text-white' : 'text-gray-900'}
                    `}>
                      Message envoyé !
                    </h3>
                    <p className={`
                      text-sm sm:text-base
                      ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                    `}>
                      Notre équipe vous répondra sous 24h
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className={`
                        block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2
                        ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                      `}>
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className={`
                          w-full px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base
                          ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          }
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        `}
                        placeholder="votre@email.com"
                      />
                    </div>

                    <div>
                      <label className={`
                        block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2
                        ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                      `}>
                        Sujet
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className={`
                          w-full px-3 sm:px-4 py-2 rounded-lg border text-sm sm:text-base
                          ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          }
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        `}
                        placeholder="Résumé de votre demande"
                      />
                    </div>

                    <div>
                      <label className={`
                        block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2
                        ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                      `}>
                        Message
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className={`
                          w-full px-3 sm:px-4 py-2 rounded-lg border resize-none text-sm sm:text-base
                          ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          }
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        `}
                        placeholder="Décrivez votre question ou problème..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        w-full flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base
                        bg-gradient-to-r from-blue-500 to-purple-500 text-white
                        hover:shadow-lg transition-all disabled:opacity-50 active:scale-95
                      `}
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Envoyer</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chatbot Widget avec gestion d'état */}
      {chatState === 'game' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed bottom-4 right-4 z-50 w-full max-w-sm px-4 sm:px-0"
        >
          <SupportMiniGame
            onComplete={handleGameComplete}
            onSkip={handleGameSkip}
            darkMode={darkMode}
          />
        </motion.div>
      )}

      {chatState !== 'game' && (
        <ChatbotWidget
          position="bottom-right"
          initialMinimized={chatState === 'minimized'}
        />
      )}

      {/* Styles pour animations globales */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
