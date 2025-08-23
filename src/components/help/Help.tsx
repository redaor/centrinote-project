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
  Users
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function Help() {
  const { state } = useApp();
  const { darkMode } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I import documents into Centrinote?',
      answer: 'You can import documents by clicking the "Add Document" button in the Documents section. Supported formats include PDF, Word, images, and audio files. You can also drag and drop files directly into the interface.',
      category: 'documents'
    },
    {
      id: '2',
      question: 'How does the AI search feature work?',
      answer: 'The AI search uses advanced natural language processing to understand your queries and search across all your content. It can find relevant documents, vocabulary entries, and provide intelligent suggestions based on context.',
      category: 'search'
    },
    {
      id: '3',
      question: 'Can I collaborate with others in real-time?',
      answer: 'Yes! Centrinote supports real-time collaboration. You can share documents, create study sessions with others, and use the built-in chat and video features to work together seamlessly.',
      category: 'collaboration'
    },
    {
      id: '4',
      question: 'How do I create and manage vocabulary flashcards?',
      answer: 'Go to the Vocabulary section and click "Add Word" to create new entries. You can organize words by category, set difficulty levels, and use the flashcard mode for studying. The system tracks your progress automatically.',
      category: 'vocabulary'
    },
    {
      id: '5',
      question: 'What subscription plans are available?',
      answer: 'We offer three plans: Free (basic features), Basic (€5-10/month with advanced features), and Premium (€10+/month with full AI capabilities and unlimited storage). Early adopters get 50% off for life!',
      category: 'billing'
    },
    {
      id: '6',
      question: 'Is my data secure and private?',
      answer: 'Absolutely. We use enterprise-grade encryption, comply with GDPR regulations, and never share your personal data. You have full control over your information and can export or delete it at any time.',
      category: 'security'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'documents', label: 'Documents' },
    { id: 'vocabulary', label: 'Vocabulary' },
    { id: 'search', label: 'AI Search' },
    { id: 'collaboration', label: 'Collaboration' },
    { id: 'billing', label: 'Billing' },
    { id: 'security', label: 'Security' }
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

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Help & Support
          </h1>
        </div>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Find answers to your questions and get the help you need
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer
        `}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Video Tutorials
            </h3>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Watch step-by-step guides to master Centrinote features
          </p>
          <div className="mt-3 flex items-center text-blue-500 text-sm font-medium">
            <span>Watch Now</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </div>
        </div>

        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer
        `}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <Book className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              User Guide
            </h3>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Comprehensive documentation for all features
          </p>
          <div className="mt-3 flex items-center text-teal-500 text-sm font-medium">
            <span>Read Guide</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </div>
        </div>

        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer
        `}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Community Forum
            </h3>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connect with other users and share tips
          </p>
          <div className="mt-3 flex items-center text-purple-500 text-sm font-medium">
            <span>Join Community</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Frequently Asked Questions
        </h2>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                w-full pl-10 pr-4 py-2 rounded-lg border transition-colors
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            />
          </div>
          
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className={`
              px-3 py-2 rounded-lg border transition-colors
              ${darkMode 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
            `}
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
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
                onClick={() => toggleFAQ(faq.id)}
                className={`
                  w-full px-6 py-4 text-left flex items-center justify-between
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                `}
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
              No results found
            </h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Try adjusting your search terms or browse all categories.
            </p>
          </div>
        )}
      </div>

      {/* Contact Support */}
      <div className="max-w-4xl mx-auto">
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-lg p-8 text-center
        `}>
          <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Still need help?
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Our support team is here to help you get the most out of Centrinote
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200">
              <MessageCircle className="w-5 h-5" />
              <span>Live Chat</span>
            </button>
            
            <button className={`
              flex items-center justify-center space-x-2 px-6 py-3 rounded-lg border transition-colors
              ${darkMode 
                ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}>
              <Mail className="w-5 h-5" />
              <span>Email Support</span>
            </button>
            
            <button className={`
              flex items-center justify-center space-x-2 px-6 py-3 rounded-lg border transition-colors
              ${darkMode 
                ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}>
              <Phone className="w-5 h-5" />
              <span>Schedule Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}