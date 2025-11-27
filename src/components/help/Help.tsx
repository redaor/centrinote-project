import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  Users,
  Send
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

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
}

export function Help() {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    email: user?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Réponses rapides - Les 5 questions les plus fréquentes
  const quickAnswers: QuickAnswer[] = [
    {
      id: 'q1',
      question: 'Comment importer un document ?',
      answer: 'Cliquez sur "+ Nouvelle Note" puis sélectionnez "Importer".'
    },
    {
      id: 'q2',
      question: 'Comment utiliser l\'IA pour résumer ?',
      answer: 'Sélectionnez votre texte, puis cliquez sur l\'icône ✨ "Résumer avec l\'IA".'
    },
    {
      id: 'q3',
      question: 'Comment créer une réunion vidéo ?',
      answer: 'Allez dans l\'onglet "Réunions" et cliquez sur "Nouvelle réunion".'
    },
    {
      id: 'q4',
      question: 'Comment activer les automatisations ?',
      answer: 'Rendez-vous dans Paramètres > Automatisations et activez les règles souhaitées.'
    },
    {
      id: 'q5',
      question: 'Comment partager une note ?',
      answer: 'Ouvrez la note, cliquez sur les 3 points, puis "Partager".'
    }
  ];

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: t('faq_import_documents_q'),
      answer: t('faq_import_documents_a'),
      category: 'importation'
    },
    {
      id: '2',
      question: t('faq_ai_search_q'),
      answer: t('faq_ai_search_a'),
      category: 'ia'
    },
    {
      id: '3',
      question: t('faq_collaboration_q'),
      answer: t('faq_collaboration_a'),
      category: 'reunions'
    },
    {
      id: '4',
      question: t('faq_flashcards_q'),
      answer: t('faq_flashcards_a'),
      category: 'ia'
    },
    {
      id: '5',
      question: t('faq_subscription_q'),
      answer: t('faq_subscription_a'),
      category: 'automation'
    },
    {
      id: '6',
      question: t('faq_security_q'),
      answer: t('faq_security_a'),
      category: 'importation'
    }
  ];

  // Tags cliquables pour la recherche FAQ
  const categories = [
    { id: 'all', label: 'Tous', emoji: '📋' },
    { id: 'importation', label: 'Importation', emoji: '📥' },
    { id: 'ia', label: 'IA', emoji: '✨' },
    { id: 'reunions', label: 'Réunions', emoji: '📹' },
    { id: 'automation', label: 'Automatisation', emoji: '⚡' }
  ];

  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Appel à la fonction Supabase Edge Function
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

      // Reset après 3 secondes
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

  const isAdmin =
    user?.email === 'contact@centrinote.fr' ||
    user?.email === 'reda_sahraoui@outlook.fr' ||
    user?.role === 'admin';

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('help_support_title')}
          </h1>
        </div>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('help_support_subtitle')}
        </p>
      </div>

      {/* Ressources simplifiées - Liste verticale compacte */}
      <div className="max-w-2xl mx-auto">
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          📚 Ressources
        </h2>
        <div className="space-y-3">
          {/* Tutoriels vidéo */}
          <a
            href="#tutorials"
            className={`
              flex items-start space-x-3 p-4 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}
            `}
          >
            <span className="text-2xl">📹</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tutoriels vidéo
                </h3>
                <ExternalLink className="w-4 h-4 text-blue-500" />
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Apprenez à utiliser Centrinote en vidéo
              </p>
            </div>
          </a>

          {/* Guide utilisateur */}
          <a
            href="#guide"
            className={`
              flex items-start space-x-3 p-4 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}
            `}
          >
            <span className="text-2xl">📘</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Guide utilisateur
                </h3>
                <ExternalLink className="w-4 h-4 text-blue-500" />
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Documentation complète de toutes les fonctionnalités
              </p>
            </div>
          </a>

          {/* Forum communautaire */}
          <a
            href="#forum"
            className={`
              flex items-start space-x-3 p-4 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}
            `}
          >
            <span className="text-2xl">💬</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Forum communautaire
                </h3>
                <ExternalLink className="w-4 h-4 text-blue-500" />
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Échangez avec d'autres utilisateurs et partagez vos astuces
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Bouton Contacter le support */}
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setShowContactForm(!showContactForm)}
          className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
        >
          <Mail className="w-5 h-5" />
          <span>📩 Contacter le support</span>
        </button>

        {/* Formulaire de contact */}
        {showContactForm && (
          <div className={`
            mt-4 p-6 rounded-lg border
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}>
            {formSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Message envoyé !
                </h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Nous vous répondrons sous 24h
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className={`
                      w-full px-4 py-2 rounded-lg border
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
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sujet
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className={`
                      w-full px-4 py-2 rounded-lg border
                      ${darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                      }
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    `}
                    placeholder="Résumé de votre question"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className={`
                      w-full px-4 py-2 rounded-lg border resize-none
                      ${darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                      }
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    `}
                    placeholder="Décrivez votre question en détail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Envoyer</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Réponses rapides */}
      <div className="max-w-2xl mx-auto">
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          ⚡ Réponses rapides
        </h2>
        <div className="space-y-3">
          {quickAnswers.map((qa) => (
            <div
              key={qa.id}
              className={`
                p-4 rounded-lg border
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}
              `}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">❓</span>
                <div className="flex-1">
                  <p className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {qa.question}
                  </p>
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">✅</span>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {qa.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('frequently_asked_questions')}
        </h2>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              id="help-search-input"
              name="help-search"
              type="text"
              placeholder="Tapez votre question ici…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                w-full pl-10 pr-4 py-3 rounded-lg border transition-colors
                ${darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            />
          </div>
        </div>

        {/* Tags cliquables */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeCategory === category.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span className="mr-1">{category.emoji}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className={`
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                border rounded-lg overflow-hidden
              `}
            >
              <button
                id={`faq-${faq.id}`}
                name={`faq-toggle-${faq.id}`}
                onClick={() => toggleFAQ(faq.id)}
                className={`
                  w-full px-6 py-4 text-left flex items-center justify-between
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                `}
                aria-expanded={expandedFAQ === faq.id}
                aria-label={`FAQ: ${faq.question}`}
              >
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {faq.question}
                </span>
                {expandedFAQ === faq.id ? (
                  <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
              
              {expandedFAQ === faq.id && (
                <div className={`px-6 pb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <p className="leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <Search className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('no_results_found')}
            </h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('no_results_desc')}
            </p>
          </div>
        )}
      </div>

      {/* Mode Admin - Répondre aux questions (visible uniquement pour les admins) */}
      {isAdmin && (
        <div className="max-w-4xl mx-auto">
          <div className={`
            ${darkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}
            border rounded-lg p-6
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    👨‍💼 Mode Administrateur
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gérer et répondre aux questions fréquentes
                  </p>
                </div>
              </div>
              <button
                onClick={() => alert('Interface d\'administration FAQ à venir...')}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                Gérer la FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}