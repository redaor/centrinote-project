import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Search, Zap, Shield, CreditCard, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FAQ() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const handleBack = () => {
    navigate(-1); // Retour à la page précédente
  };

  const faqItems = [
    {
      id: '1',
      question: 'Comment intégrer Centrinote avec Zoom ?',
      answer: 'L\'intégration Zoom est disponible dans les plans Pro et Entreprise. Rendez-vous dans les paramètres de votre compte pour connecter votre compte Zoom. Une fois connecté, vous pourrez créer des réunions directement depuis Centrinote.',
      category: 'integration'
    },
    {
      id: '2',
      question: 'Puis-je importer mes notes existantes ?',
      answer: 'Oui, Centrinote supporte l\'import de fichiers PDF, Word, Markdown et de nombreux autres formats. Utilisez l\'outil d\'import dans votre tableau de bord. Vous pouvez également copier-coller vos notes existantes.',
      category: 'features'
    },
    {
      id: '3',
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Absolument. Nous utilisons un chiffrement de niveau bancaire et respectons les standards GDPR. Vos données ne sont jamais partagées avec des tiers. Tous nos serveurs sont situés en Europe et respectent la réglementation française.',
      category: 'security'
    },
    {
      id: '4',
      question: 'Puis-je annuler mon abonnement à tout moment ?',
      answer: 'Oui, vous pouvez annuler votre abonnement à tout moment depuis votre compte. Vous garderez l\'accès jusqu\'à la fin de votre période de facturation. Aucun frais d\'annulation n\'est appliqué.',
      category: 'billing'
    },
    {
      id: '5',
      question: 'Comment fonctionne l\'IA de Centrinote ?',
      answer: 'Notre IA utilise GPT-4o pour vous aider à organiser vos notes, générer des résumés, créer des flashcards automatiquement et répondre à vos questions sur votre contenu. Elle est disponible dans les plans Pro et Entreprise.',
      category: 'features'
    },
    {
      id: '6',
      question: 'Puis-je collaborer avec mon équipe ?',
      answer: 'Oui ! La collaboration en temps réel est disponible dans tous les plans. Vous pouvez partager des documents, créer des sessions d\'étude en groupe et utiliser le chat intégré. Les plans Pro et Entreprise offrent des fonctionnalités de collaboration avancées.',
      category: 'features'
    },
    {
      id: '7',
      question: 'Quelle est la différence entre les plans Pro et Entreprise ?',
      answer: 'Le plan Pro est parfait pour les utilisateurs individuels avec des besoins avancés. Le plan Entreprise ajoute la gestion d\'équipes illimitées, des analytics avancés, plus de stockage et un support dédié 24/7.',
      category: 'billing'
    },
    {
      id: '8',
      question: 'Puis-je utiliser Centrinote hors ligne ?',
      answer: 'Centrinote fonctionne principalement en ligne pour assurer la synchronisation. Cependant, vos notes récemment consultées sont mises en cache et accessibles temporairement hors ligne.',
      category: 'features'
    }
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'integration':
        return Zap;
      case 'security':
        return Shield;
      case 'billing':
        return CreditCard;
      default:
        return HelpCircle;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bouton de retour */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Questions fréquentes
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Trouvez rapidement les réponses à vos questions
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les FAQ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq) => {
            const CategoryIcon = getCategoryIcon(faq.category);
            return (
              <div
                key={faq.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <CategoryIcon className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">
                      {faq.question}
                    </span>
                  </div>
                  {expandedFAQ === faq.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {expandedFAQ === faq.id && (
                  <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="pt-4">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
              Aucun résultat trouvé
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Essayez de modifier votre recherche ou contactez notre support.
            </p>
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Vous ne trouvez pas votre réponse ?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Notre équipe de support est là pour vous aider
          </p>
          <a
            href="mailto:contact@centrinote.fr"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Mail className="w-5 h-5" />
            <span>Contacter le support</span>
          </a>
        </div>
      </div>
    </div>
  );
}