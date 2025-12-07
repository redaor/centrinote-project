/**
 * Service pour générer des messages Noteo avec le nouveau format élégant
 */

import { Step } from '../components/ai/EnhancedNoteoMessage';

export interface NoteoMessageConfig {
  problemType: 'save-button' | 'import' | 'automation' | 'meeting' | 'general';
  userName?: string;
  customSteps?: Step[];
}

export class EnhancedNoteoService {
  /**
   * Génère un message de bienvenue personnalisé
   */
  generateWelcomeMessage(config: NoteoMessageConfig): string {
    const { problemType, userName } = config;
    
    const greetings: Record<string, string> = {
      'save-button': userName 
        ? `Merci pour cette précision ${userName} ! Je vais vous guider pas à pas pour résoudre ce problème de sauvegarde.`
        : 'Merci pour cette précision ! Je vais vous guider pas à pas pour résoudre ce problème de sauvegarde.',
      'import': 'Je comprends votre problème d\'import. Laissez-moi vous aider étape par étape.',
      'automation': 'Je vois que vous avez un souci avec les automatisations. Analysons cela ensemble.',
      'meeting': 'Il semble y avoir un problème avec votre réunion. Je vais vous aider à le résoudre.',
      'general': userName
        ? `Bonjour ${userName} ! Comment puis-je vous aider aujourd'hui ?`
        : 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
    };

    return greetings[problemType] || greetings['general'];
  }

  /**
   * Génère les étapes selon le type de problème
   */
  generateSteps(config: NoteoMessageConfig): Step[] {
    const { problemType, customSteps } = config;

    if (customSteps && customSteps.length > 0) {
      return customSteps;
    }

    switch (problemType) {
      case 'save-button':
        return [
          {
            id: 'step-1',
            number: 1,
            emoji: '🌐',
            title: 'Connexion Internet',
            content: 'Vérifiez que vous êtes bien connecté à Internet. Parfois, une connexion instable peut empêcher l\'enregistrement.',
            hint: 'Astuce : Testez votre connexion sur un autre site pour confirmer',
          },
          {
            id: 'step-2',
            number: 2,
            emoji: '🔄',
            title: 'Actualisation',
            content: 'Actualisez la page (F5 ou le bouton ↻), puis réessayez d\'enregistrer votre note.',
            hint: 'Astuce : Utilisez Ctrl+F5 pour un rafraîchissement complet',
          },
          {
            id: 'step-3',
            number: 3,
            emoji: '🔒',
            title: 'Permissions',
            content: 'Vérifiez que Centrinote a les permissions nécessaires dans votre navigateur (cookies et données).',
            hint: 'Astuce : Vérifiez les paramètres de confidentialité de votre navigateur',
          },
          {
            id: 'step-4',
            number: 4,
            emoji: '🧭',
            title: 'Navigateur',
            content: 'Si le problème persiste, essayez d\'accéder à Centrinote avec un autre navigateur pour isoler le problème.',
            hint: 'Astuce : Chrome, Firefox et Edge sont tous compatibles',
          },
        ];

      case 'import':
        return [
          {
            id: 'step-1',
            number: 1,
            emoji: '📄',
            title: 'Type de fichier',
            content: 'Vérifiez que votre fichier est dans un format supporté (PDF, Word, images).',
            hint: 'Astuce : Les formats PDF et DOCX sont les plus fiables',
          },
          {
            id: 'step-2',
            number: 2,
            emoji: '📏',
            title: 'Taille du fichier',
            content: 'Assurez-vous que votre fichier ne dépasse pas 5 Mo.',
            hint: 'Astuce : Compressez les images si nécessaire',
          },
          {
            id: 'step-3',
            number: 3,
            emoji: '🔄',
            title: 'Réessayer',
            content: 'Essayez de réimporter le fichier après avoir actualisé la page.',
            hint: 'Astuce : Utilisez le glisser-déposer pour une importation plus rapide',
          },
        ];

      case 'automation':
        return [
          {
            id: 'step-1',
            number: 1,
            emoji: '⚙️',
            title: 'Vérification',
            content: 'Vérifiez que l\'automatisation est bien activée dans vos paramètres.',
            hint: 'Astuce : Les automatisations peuvent être désactivées individuellement',
          },
          {
            id: 'step-2',
            number: 2,
            emoji: '📧',
            title: 'Notifications',
            content: 'Assurez-vous que les notifications email sont activées.',
            hint: 'Astuce : Vérifiez aussi votre dossier spam',
          },
        ];

      default:
        return [];
    }
  }

  /**
   * Génère un message de suivi
   */
  generateFollowUpMessage(problemType: string): string {
    const messages: Record<string, string> = {
      'save-button': 'Faites-moi savoir si l\'une de ces étapes aide à résoudre votre problème !',
      'import': 'Si le problème persiste après ces étapes, n\'hésitez pas à me le signaler.',
      'automation': 'Ces vérifications devraient résoudre la plupart des problèmes d\'automatisation.',
      'meeting': 'Essayez ces solutions et dites-moi si cela fonctionne.',
      'general': 'J\'espère que ces informations vous aideront !',
    };

    return messages[problemType] || messages['general'];
  }

  /**
   * Crée une configuration complète pour un message Noteo
   */
  createMessageConfig(problemType: NoteoMessageConfig['problemType'], userName?: string): {
    welcomeMessage: string;
    steps: Step[];
    followUpMessage: string;
  } {
    const config: NoteoMessageConfig = { problemType, userName };

    return {
      welcomeMessage: this.generateWelcomeMessage(config),
      steps: this.generateSteps(config),
      followUpMessage: this.generateFollowUpMessage(problemType),
    };
  }
}

export const enhancedNoteoService = new EnhancedNoteoService();


