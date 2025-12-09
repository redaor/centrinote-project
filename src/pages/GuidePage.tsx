import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, FileText, Upload, Search, Bookmark, Users, Clock, Zap, CreditCard, Download, Play, ExternalLink } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  intro: string;
  steps: string[];
  tip: string;
  image?: string;
}

export function GuidePage() {
  const { state } = useApp();
  const { darkMode } = state;
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const guideSections: GuideSection[] = [
    {
      id: 'create-note',
      icon: <FileText className="w-6 h-6" />,
      title: 'Créer sa première note',
      intro: 'Lance ton espace de travail et commence à écrire.',
      steps: [
        'Clique sur « Notes » dans le menu de gauche',
        'Clique sur « + Nouvelle note »',
        'Écris ton titre et ton contenu',
        'Ta note est sauvegardée automatiquement ✨'
      ],
      tip: 'Utilise le markdown (# pour un titre, ** pour du gras) pour mettre en forme tes notes sans lever les doigts du clavier.'
    },
    {
      id: 'import',
      icon: <Upload className="w-6 h-6" />,
      title: 'Importer un PDF ou depuis Google Drive',
      intro: 'Ramène tous tes cours existants dans Centrinote.',
      steps: [
        'Clique sur « Notes » → « Importer »',
        'Choisis « PDF » ou « Google Drive »',
        'Sélectionne ton fichier → c\'est importé !'
      ],
      tip: 'Les PDF sont automatiquement transformés en texte modifiable, pratique pour surligner et annoter.'
    },
    {
      id: 'noteo',
      icon: <Search className="w-6 h-6" />,
      title: 'Utiliser Noteo (Assistant IA avec chat segmenté)',
      intro: 'Discute avec Noteo, ton assistant IA intelligent qui répond de manière progressive et claire.',
      steps: [
        'Clique sur « 🔍 Recherche » dans le menu',
        'Tape ta question en langage naturel (ex: "c\'était quoi la formule des intégrales ?")',
        'Noteo répond avec des messages segmentés et horodatés pour une meilleure compréhension',
        'Les réponses longues sont automatiquement divisées en plusieurs messages progressifs'
      ],
      tip: 'Noteo analyse automatiquement ton problème et adapte ses réponses. Les messages sont horodatés (ex: 07h58) et utilisent des emojis pour une meilleure lisibilité.'
    },
    {
      id: 'ai-search',
      icon: <Search className="w-6 h-6" />,
      title: 'Utiliser l\'AI Search (recherche intelligente)',
      intro: 'Retrouve n\'importe quelle info même si tu ne te souviens plus des mots exacts.',
      steps: [
        'Clique sur « 🔍 Recherche » dans le menu',
        'Tape ta question en langage naturel (ex: "c\'était quoi la formule des intégrales ?")',
        'Noteo trouve les notes pertinentes même si les mots sont différents'
      ],
      tip: 'Pas besoin de mots-clés précis ! Pose ta question comme à un ami, Noteo comprend le sens.'
    },
    {
      id: 'vocabulary',
      icon: <Bookmark className="w-6 h-6" />,
      title: 'Créer des cartes de vocabulaire',
      intro: 'Transforme n\'importe quel mot en carte mémo pour l\'apprendre.',
      steps: [
        'Clique sur « Vocabulaire » dans le menu',
        'Clique sur « + Ajouter un mot »',
        'Remplis le mot, la définition, un exemple',
        'Profite : ta carte est prête à réviser !'
      ],
      tip: 'Ajoute des images ou émojis pour mieux mémoriser (ex: 🌊 pour "océan" en anglais).'
    },
    {
      id: 'flashcards',
      icon: <Play className="w-6 h-6" />,
      title: 'Étudier en mode flashcards',
      intro: 'Révise tes mots de vocabulaire façon jeu de cartes.',
      steps: [
        'Va dans « Vocabulaire »',
        'Clique sur « 🎴 Mode révision »',
        'Lis le mot → devine la définition → retourne la carte',
        'Marque « Je sais » ou « À revoir »'
      ],
      tip: 'Centrinote te montre en priorité les mots que tu maîtrises le moins, pour optimiser ton temps.'
    },
    {
      id: 'collaboration',
      icon: <Users className="w-6 h-6" />,
      title: 'Partager une note (collaboration temps-réel)',
      intro: 'Travaille sur la même note avec tes amis en direct, comme sur Google Docs.',
      steps: [
        'Ouvre ta note → clique sur « 👥 Partager »',
        'Entre l\'email de ton ami',
        'Choisis « Peut modifier » ou « Lecture seule »',
        'Vous éditez ensemble en temps réel !'
      ],
      tip: 'Les modifications apparaissent instantanément, parfait pour préparer un exposé à plusieurs.'
    },
    {
      id: 'planning',
      icon: <Clock className="w-6 h-6" />,
      title: 'Planifier une révision (rappels)',
      intro: 'Programme des alertes pour ne jamais oublier de réviser.',
      steps: [
        'Clique sur « 📅 Planning »',
        'Clique sur « + Ajouter un rappel »',
        'Choisis la matière, la date, l\'heure',
        'Tu recevras une notification au bon moment ⏰'
      ],
      tip: 'Active les rappels récurrents (ex: tous les lundis) pour créer une routine de révision.'
    },
    {
      id: 'automation',
      icon: <Zap className="w-6 h-6" />,
      title: 'Automatiser des tâches (règles simples)',
      intro: 'Demande à Centrinote de faire des actions répétitives à ta place.',
      steps: [
        'Clique sur « ⚡ Automatisation »',
        'Clique sur « Créer une règle »',
        'Exemple : "Tous les vendredis, envoie-moi un résumé de la semaine par email"',
        'Active → c\'est fait automatiquement !'
      ],
      tip: 'Tu peux créer des règles comme "Si j\'ajoute #urgent à une note, envoie-moi un rappel demain matin".'
    },
    {
      id: 'plans',
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Choisir son forfait (Free / Starter / Pro / Teams)',
      intro: 'Découvre les 4 plans disponibles et choisis celui qui correspond à tes besoins.',
      steps: [
        'Clique sur « 💳 Plan » dans le menu',
        'Compare les 4 forfaits : Free (gratuit), Starter (9,99€ - populaire), Pro (19,99€), Teams (39,99€)',
        'Free : idéal pour démarrer avec 50 mots vocabulaire et 1 réunion',
        'Starter ⭐ : le plus populaire avec 150k tokens IA, 10 réunions et 100 mots vocabulaire',
        'Pro : pour aller plus loin avec 600k tokens IA, 20 réunions et résumés IA illimités',
        'Teams : pour les équipes avec tokens IA illimités, admin dashboard et support prioritaire',
        'Clique sur le bouton du plan choisi → paiement sécurisé Stripe'
      ],
      tip: 'Le plan Starter offre le meilleur rapport qualité/prix avec -23% de réduction. Tous les plans payants proposent un essai gratuit et peuvent être annulés à tout moment.'
    },
    {
      id: 'export',
      icon: <Download className="w-6 h-6" />,
      title: 'Sauvegarder & exporter ses données',
      intro: 'Récupère toutes tes notes en un clic, au cas où.',
      steps: [
        'Clique sur « ⚙️ Réglages » → « Export »',
        'Choisis le format : PDF, Markdown, ou ZIP complet',
        'Clique sur « Télécharger »',
        'Tes données sont sur ton ordinateur 💾'
      ],
      tip: 'Exporte régulièrement pour garder une copie locale, c\'est automatique avec le forfait Pro.'
    }
  ];

  const toggleSection = (id: string) => {
    setActiveSection(activeSection === id ? null : id);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/help')}
          className={`flex items-center space-x-2 mb-6 ${
            darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          } transition-colors`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à Aide & Support</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl">
              <Book className="w-10 h-10 text-white" />
            </div>
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📚 Guide Centrinote
            </h1>
          </div>
          <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Débuter en 5 minutes
          </p>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Maîtrise l'essentiel sans te noyer dans le jargon. Chaque fonctionnalité est expliquée en quelques lignes.
          </p>
        </div>

        {/* Guide sections */}
        <div className="space-y-4">
          {guideSections.map((section, index) => (
            <div
              key={section.id}
              className={`
                rounded-lg border overflow-hidden transition-all
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                ${activeSection === section.id ? 'shadow-lg' : 'hover:shadow-md'}
              `}
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`
                  w-full px-6 py-5 flex items-center justify-between text-left
                  transition-colors
                  ${darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Number badge */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${activeSection === section.id
                      ? 'bg-gradient-to-br from-blue-500 to-teal-500 text-white'
                      : darkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`
                    p-2 rounded-lg
                    ${activeSection === section.id
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : darkMode
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {section.icon}
                  </div>

                  {/* Title and intro */}
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {section.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">En 1 seconde :</span> {section.intro}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  <div className={`
                    transform transition-transform
                    ${activeSection === section.id ? 'rotate-180' : ''}
                  `}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Section content */}
              {activeSection === section.id && (
                <div className={`px-6 pb-6 space-y-4 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'}`}>
                  {/* Steps */}
                  <div>
                    <h4 className={`font-semibold mb-3 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <span className="text-xl">📍</span>
                      <span>Comment faire :</span>
                    </h4>
                    <ol className="space-y-2">
                      {section.steps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className={`flex items-start space-x-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          <span className={`
                            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                            ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}
                          `}>
                            {stepIndex + 1}
                          </span>
                          <span className="flex-1 pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tip */}
                  <div className={`
                    p-4 rounded-lg border-l-4
                    ${darkMode
                      ? 'bg-yellow-900/20 border-yellow-600'
                      : 'bg-yellow-50 border-yellow-400'
                    }
                  `}>
                    <p className={`flex items-start space-x-2 ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                      <span className="text-xl flex-shrink-0">💡</span>
                      <span>
                        <span className="font-semibold">Astuce :</span> <em>{section.tip}</em>
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Plans comparison */}
        <div className={`mt-12 p-8 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-6 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            💳 Forfaits disponibles
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free plan */}
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Free
              </h3>
              <div className={`text-2xl font-bold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Gratuit
              </div>
              <ul className="space-y-2">
                {['Notes illimitées', '50 mots vocabulaire', '1 réunion 45 min + résumé IA', '1 automation', '3 participants max'].map((feature) => (
                  <li key={feature} className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-green-500">✅</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Starter plan */}
            <div className={`p-6 rounded-lg border-2 border-indigo-500 bg-gradient-to-br ${darkMode ? 'from-indigo-900/20 to-purple-900/20' : 'from-indigo-50 to-purple-50'} relative`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                  ⭐ POPULAIRE
                </span>
              </div>
              <h3 className={`text-xl font-bold mb-2 mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Starter
              </h3>
              <div className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="text-2xl font-bold">9,99€</span>
                <span className="text-sm">/mois</span>
                <div className="text-xs text-orange-600 font-semibold mt-1">Économisez 23%</div>
              </div>
              <ul className="space-y-2">
                {['150k tokens IA', '10 réunions 45 min', '8 participants max', '5 résumés IA', '100 mots vocabulaire', '5 automations'].map((feature) => (
                  <li key={feature} className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-purple-500">✨</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro plan */}
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-900 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Pro
              </h3>
              <div className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="text-2xl font-bold">19,99€</span>
                <span className="text-sm">/mois</span>
                <div className="text-xs text-orange-600 font-semibold mt-1">Économisez 33%</div>
              </div>
              <ul className="space-y-2">
                {['600k tokens IA', '20 réunions 60 min', '15 participants max', 'Résumés IA illimités', '500 mots vocabulaire', 'Automations illimitées'].map((feature) => (
                  <li key={feature} className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-blue-500">🚀</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Teams plan */}
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-900 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Teams
              </h3>
              <div className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="text-2xl font-bold">39,99€</span>
                <span className="text-sm">/mois</span>
                <div className="text-xs text-orange-600 font-semibold mt-1">Économisez 20%</div>
              </div>
              <ul className="space-y-2">
                {['Tokens IA illimités', '60 réunions 60 min', '20 participants', 'Résumés IA illimités', 'Vocabulaire illimité', 'Automations illimitées', 'Admin dashboard', 'Support prioritaire'].map((feature) => (
                  <li key={feature} className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-yellow-500">👑</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Help section */}
        <div className={`mt-12 text-center p-8 rounded-xl ${darkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30' : 'bg-gradient-to-r from-purple-50 to-blue-50'}`}>
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🆘 Besoin d'aide ?
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <strong>🤖 Noteo</strong> : Ton assistant IA disponible 24/7 pour répondre à toutes tes questions
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/help')}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Book className="w-5 h-5" />
              <span>Centre d'aide</span>
            </button>
            <button
              onClick={() => navigate('/forum')}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Users className="w-5 h-5" />
              <span>Forum communautaire</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center mt-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <em>Fait avec ❤️ par l'équipe Centrinote. Bonne révision !</em>
        </p>
      </div>
    </div>
  );
}
