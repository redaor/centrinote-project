/**
 * Exemple d'utilisation du composant EnhancedNoteoMessage
 * 
 * Ce fichier montre comment utiliser le nouveau composant de message Noteo
 * avec le design élégant et moderne.
 */

import React from 'react';
import { EnhancedNoteoMessage, SAVE_BUTTON_STEPS } from './EnhancedNoteoMessage';
import { NoteoMessageWrapper } from './NoteoMessageWrapper';
import { enhancedNoteoService } from '../../services/enhancedNoteoService';

/**
 * Exemple 1 : Utilisation directe avec des étapes personnalisées
 */
export function Example1_DirectUsage() {
  const handleSuccess = () => {
    console.log('Problème résolu !');
  };

  const handleFailure = () => {
    console.log('Problème persiste');
  };

  return (
    <EnhancedNoteoMessage
      welcomeMessage="Merci pour cette précision ! Je vais vous guider pas à pas pour résoudre ce problème de sauvegarde."
      steps={SAVE_BUTTON_STEPS}
      followUpMessage="Faites-moi savoir si l'une de ces étapes aide à résoudre votre problème !"
      onSuccess={handleSuccess}
      onFailure={handleFailure}
      userName="Reda"
      showStepsProgressively={true}
      stepDelay={500}
    />
  );
}

/**
 * Exemple 2 : Utilisation avec le service pour générer automatiquement
 */
export function Example2_WithService() {
  const config = enhancedNoteoService.createMessageConfig('save-button', 'Reda');

  return (
    <EnhancedNoteoMessage
      welcomeMessage={config.welcomeMessage}
      steps={config.steps}
      followUpMessage={config.followUpMessage}
      onSuccess={() => console.log('Succès')}
      onFailure={() => console.log('Échec')}
      userName="Reda"
    />
  );
}

/**
 * Exemple 3 : Utilisation avec le wrapper intelligent
 */
export function Example3_WithWrapper() {
  const content = `Merci pour cette précision ! Si vous voyez le bouton de sauvegarde mais qu'il ne fonctionne pas, essayons quelques étapes simples pour résoudre le problème :

**1. Vérifiez votre connexion internet** : Assurez-vous que vous êtes bien connecté à Internet. Parfois, une connexion instable peut empêcher l'enregistrement.

**2. Actualisez la page** : Essayez d'actualiser la page (en appuyant sur F5 ou en utilisant le bouton d'actualisation de votre navigateur), puis réessayez d'enregistrer votre note.

**3. Permissions du navigateur** : Parfois, des paramètres de sécurité ou de confidentialité dans votre navigateur peuvent bloquer certaines actions. Assurez-vous que Centrinote a bien les permissions nécessaires (comme les autorisations de cookies et de données).

**4. Essayez un autre navigateur** : Si le problème persiste, essayez d'accéder à Centrinote avec un autre navigateur pour voir si cela change quelque chose.

Faites-moi savoir si l'une de ces étapes aide à résoudre votre problème ou si cela ne fonctionne toujours pas !

Est-ce que votre problème est résolu ?

✅ Oui, c'est réglé

❌ Non, toujours bloqué`;

  return (
    <NoteoMessageWrapper
      content={content}
      problemType="save-button"
      userName="Reda"
      onSuccess={() => console.log('Succès')}
      onFailure={() => console.log('Échec')}
    />
  );
}

/**
 * Exemple 4 : Message avec étapes personnalisées
 */
export function Example4_CustomSteps() {
  const customSteps = [
    {
      id: 'step-1',
      number: 1,
      emoji: '🔍',
      title: 'Diagnostic',
      content: 'Analysons d\'abord le problème pour comprendre ce qui se passe.',
      hint: 'Astuce : Vérifiez la console du navigateur pour les erreurs',
    },
    {
      id: 'step-2',
      number: 2,
      emoji: '🛠️',
      title: 'Solution',
      content: 'Appliquons les corrections nécessaires.',
      hint: 'Astuce : Suivez les étapes dans l\'ordre',
    },
  ];

  return (
    <EnhancedNoteoMessage
      welcomeMessage="Je vais vous aider à résoudre ce problème étape par étape."
      steps={customSteps}
      followUpMessage="Dites-moi si cela fonctionne !"
      onSuccess={() => console.log('Succès')}
      onFailure={() => console.log('Échec')}
    />
  );
}

/**
 * Exemple 5 : Différents types de problèmes
 */
export function Example5_DifferentProblemTypes() {
  const importConfig = enhancedNoteoService.createMessageConfig('import', 'Reda');
  const automationConfig = enhancedNoteoService.createMessageConfig('automation', 'Reda');

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold mb-4">Problème d'import</h3>
        <EnhancedNoteoMessage
          welcomeMessage={importConfig.welcomeMessage}
          steps={importConfig.steps}
          followUpMessage={importConfig.followUpMessage}
          problemType="import"
        />
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4">Problème d'automatisation</h3>
        <EnhancedNoteoMessage
          welcomeMessage={automationConfig.welcomeMessage}
          steps={automationConfig.steps}
          followUpMessage={automationConfig.followUpMessage}
          problemType="automation"
        />
      </div>
    </div>
  );
}

