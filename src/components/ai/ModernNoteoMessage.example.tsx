/**
 * Exemples d'utilisation du composant ModernNoteoMessage
 * Démonstration des différents styles et cas d'usage
 */

import React, { useState } from 'react';
import { ModernNoteoMessage, ModernSegment } from './ModernNoteoMessage';
import { modernNoteoService } from '../../services/modernNoteoService';

// ============================================================
// EXEMPLE 1 : Guide Notes (format prédéfini)
// ============================================================
export function ExampleNotesGuide() {
  const userName = 'Marie';
  const segments = modernNoteoService.generateSegmentsForProblem('notes', userName);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Exemple 1 : Guide Notes</h2>
      <ModernNoteoMessage
        segments={segments}
        onSuccess={() => console.log('✅ Utilisateur a créé sa note!')}
        onFailure={() => console.log('❌ Besoin d\'aide supplémentaire')}
        userName={userName}
        showProgressively={true}
        segmentDelay={1200}
        darkMode={false}
      />
    </div>
  );
}

// ============================================================
// EXEMPLE 2 : Guide Réunion (format prédéfini avec emojis contextuels)
// ============================================================
export function ExampleMeetingGuide() {
  const segments = modernNoteoService.generateSegmentsForProblem('meeting');

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Exemple 2 : Guide Réunion
      </h2>
      <ModernNoteoMessage
        segments={segments}
        onSuccess={() => console.log('✅ Réunion créée!')}
        onFailure={() => console.log('❌ Problème persiste')}
        showProgressively={true}
        segmentDelay={1500}
        darkMode={true}
      />
    </div>
  );
}

// ============================================================
// EXEMPLE 3 : Parsing de texte personnalisé
// ============================================================
export function ExampleCustomText() {
  const customText = `
Bonjour ! Je vais vous aider à résoudre ce problème de sauvegarde.

**1. Vérifiez votre connexion** : Assurez-vous d'être connecté à Internet.

**2. Actualisez la page** : Appuyez sur F5 pour rafraîchir.

**3. Videz le cache** : Allez dans Paramètres > Confidentialité > Effacer les données.

**4. Réessayez** : Tentez à nouveau de sauvegarder votre document.

Si le problème persiste, contactez le support technique !
  `;

  const segments = modernNoteoService.parseTextToSegments(customText, 'Jean');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Exemple 3 : Parsing Texte Personnalisé</h2>
      <ModernNoteoMessage
        segments={segments}
        onSuccess={() => console.log('✅ Problème résolu!')}
        onFailure={() => console.log('❌ Toujours bloqué')}
        userName="Jean"
        showProgressively={true}
        segmentDelay={1000}
        darkMode={false}
      />
    </div>
  );
}

// ============================================================
// EXEMPLE 4 : Segments créés manuellement
// ============================================================
export function ExampleManualSegments() {
  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const manualSegments: ModernSegment[] = [
    {
      id: 'welcome-manual',
      time: currentTime,
      emoji: '🤖',
      title: 'Noteo',
      content: 'Bonjour ! Je vais vous expliquer comment utiliser les automatisations.',
      isWelcome: true,
    },
    {
      id: 'intro-manual',
      time: currentTime,
      emoji: '📚',
      title: 'Introduction',
      content: 'Les automatisations vous permettent de gagner du temps en programmant des actions récurrentes.',
      isIntro: true,
    },
    {
      id: 'step-1-manual',
      time: currentTime,
      emoji: '1️⃣',
      title: 'Accéder aux automatisations',
      content: 'Rendez-vous dans Paramètres > Automatisations.',
    },
    {
      id: 'step-2-manual',
      time: currentTime,
      emoji: '2️⃣',
      title: 'Créer une nouvelle automatisation',
      content: 'Cliquez sur "+ Nouvelle automatisation" et choisissez un type (email, rappel, tâche).',
    },
    {
      id: 'step-3-manual',
      time: currentTime,
      emoji: '3️⃣',
      title: 'Configurer les déclencheurs',
      content: 'Définissez quand l\'automatisation doit se déclencher (heure, événement, action).',
    },
    {
      id: 'summary-manual',
      time: currentTime,
      emoji: '📊',
      title: 'Résumé',
      content: 'Vos automatisations sont maintenant configurées ! Vous recevrez des notifications selon vos réglages.',
      isSummary: true,
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Exemple 4 : Segments Manuels</h2>
      <ModernNoteoMessage
        segments={manualSegments}
        onSuccess={() => console.log('✅ Automatisation configurée!')}
        onFailure={() => console.log('❌ Configuration échouée')}
        showProgressively={true}
        segmentDelay={1800}
        darkMode={false}
      />
    </div>
  );
}

// ============================================================
// EXEMPLE 5 : Comparaison Ancien vs Nouveau Format
// ============================================================
export function ExampleComparison() {
  const [showModern, setShowModern] = useState(true);

  const modernSegments = modernNoteoService.generateSegmentsForProblem('notes', 'Sophie');

  const oldFormatText = `
**Noteo X**

Je suis là pour vous aider

Pour travailler avec les notes dans Centrinote, c'est super simple ! Voici comment procéder :

**1. Créer une nouvelle note** : Dans le menu, allez dans "Notes" et cliquez sur "+ Nouvelle note". Vous pourrez ensuite saisir un titre et le contenu de votre note. Pas d'inquiétude, tout s'enregistre automatiquement !

**2. Modifier une note existante** : Si vous voulez apporter des modifications à une note, il suffit de cliquer sur celle-ci. Ensuite, cherchez l'icône en forme de crayon en haut à droite...

**3. Organiser vos notes** : Utilisez des tags et des catégories pour organiser vos notes. Vous pouvez aussi épingler les notes importantes pour un accès rapide.

**4. Importer des documents** : Vous pouvez importer des PDF ou connecter Google Drive via le menu "Importer". Les fichiers importés deviennent du texte modifiable.
  `;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Exemple 5 : Comparaison Avant/Après</h2>
        <button
          onClick={() => setShowModern(!showModern)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {showModern ? '📊 Voir Ancien Format' : '✨ Voir Nouveau Format'}
        </button>
      </div>

      {showModern ? (
        <div className="border-2 border-green-500 rounded-xl p-4">
          <div className="mb-3 px-3 py-2 bg-green-100 text-green-800 rounded-lg inline-block font-medium">
            ✨ Nouveau Format (Moderne)
          </div>
          <ModernNoteoMessage
            segments={modernSegments}
            onSuccess={() => console.log('✅ Format moderne')}
            onFailure={() => console.log('❌ Format moderne')}
            userName="Sophie"
            showProgressively={true}
            segmentDelay={1000}
            darkMode={false}
          />
        </div>
      ) : (
        <div className="border-2 border-gray-400 rounded-xl p-6">
          <div className="mb-4 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg inline-block font-medium">
            📊 Ancien Format (Dense)
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
              {oldFormatText}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-bold text-green-800 mb-2">✅ Avantages Nouveau Format</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Messages segmentés et aérés</li>
            <li>• Horodatage systématique</li>
            <li>• Emojis numériques clairs</li>
            <li>• Style chat conversationnel</li>
            <li>• Animations progressives</li>
            <li>• Avatar Noteo visible</li>
          </ul>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-2">❌ Inconvénients Ancien Format</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Blocs de texte lourds (300+ mots)</li>
            <li>• Pas d'horodatage</li>
            <li>• Numéros gras peu visuels</li>
            <li>• Manque de distinction visuelle</li>
            <li>• Apparition instantanée</li>
            <li>• Pas de personnalisation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXEMPLE 6 : Affichage simultané (sans progression)
// ============================================================
export function ExampleInstantDisplay() {
  const segments = modernNoteoService.generateSegmentsForProblem('notes');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Exemple 6 : Affichage Instantané</h2>
      <p className="text-gray-600 mb-4">
        Tous les segments apparaissent en même temps (showProgressively=false)
      </p>
      <ModernNoteoMessage
        segments={segments}
        onSuccess={() => console.log('✅ OK')}
        onFailure={() => console.log('❌ KO')}
        showProgressively={false}
        darkMode={false}
      />
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL : Affiche tous les exemples
// ============================================================
export default function ModernNoteoExamples() {
  const [activeExample, setActiveExample] = useState<number>(1);

  const examples = [
    { id: 1, title: 'Guide Notes', component: <ExampleNotesGuide /> },
    { id: 2, title: 'Guide Réunion', component: <ExampleMeetingGuide /> },
    { id: 3, title: 'Texte Personnalisé', component: <ExampleCustomText /> },
    { id: 4, title: 'Segments Manuels', component: <ExampleManualSegments /> },
    { id: 5, title: 'Comparaison Avant/Après', component: <ExampleComparison /> },
    { id: 6, title: 'Affichage Instantané', component: <ExampleInstantDisplay /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation des exemples */}
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🎨 ModernNoteoMessage - Exemples
          </h1>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${activeExample === example.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {example.id}. {example.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu de l'exemple actif */}
      <div className="max-w-6xl mx-auto py-8">
        {examples.find(ex => ex.id === activeExample)?.component}
      </div>

      {/* Footer avec informations */}
      <div className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t border-gray-200 dark:border-gray-700">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
              📚 Documentation
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Consultez README_ModernNoteoMessage.md pour plus de détails
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-bold text-green-900 dark:text-green-100 mb-2">
              ✨ Utilisation
            </h3>
            <p className="text-sm text-green-800 dark:text-green-200">
              Importez ModernNoteoMessage et modernNoteoService dans votre code
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-2">
              🎯 Personnalisation
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Ajustez les délais, emojis et contenu selon vos besoins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
