/**
 * Service pour générer des messages Noteo au format chat moderne
 * Segmentation avec horodatage et emojis numériques
 */

import { ModernSegment } from '../components/ai/ModernNoteoMessage';
import { getNumberEmoji } from '../components/ai/ModernNoteoMessage';

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export interface MessageData {
  welcomeMessage?: string;
  introduction?: string;
  steps: Array<{
    number: number;
    title: string;
    content: string;
    emoji?: string;
  }>;
  summary?: string;
  problemType?: 'notes' | 'meeting' | 'import' | 'automation' | 'general';
}

export class ModernNoteoService {
  /**
   * Convertit un message avec étapes en segments modernes
   */
  convertToModernSegments(messageData: MessageData, userName?: string): ModernSegment[] {
    const segments: ModernSegment[] = [];
    const currentTime = formatTime(new Date());

    // Message de bienvenue
    if (messageData.welcomeMessage) {
      segments.push({
        id: `welcome-${Date.now()}`,
        time: currentTime,
        emoji: '🤖',
        title: 'Noteo',
        content: messageData.welcomeMessage,
      });
    }

    // Introduction si présente
    if (messageData.introduction) {
      segments.push({
        id: `intro-${Date.now()}`,
        time: currentTime,
        emoji: '📚',
        title: 'Introduction',
        content: messageData.introduction,
      });
    }

    // Étapes avec emojis numériques
    messageData.steps.forEach((step, index) => {
      const emoji = step.emoji || getNumberEmoji(step.number);
      
      segments.push({
        id: `step-${step.number}-${Date.now()}-${index}`,
        time: currentTime,
        emoji,
        title: step.title,
        content: step.content,
      });
    });

    // Résumé final si présent
    if (messageData.summary) {
      segments.push({
        id: `summary-${Date.now()}`,
        time: currentTime,
        emoji: '📊',
        title: 'Résumé',
        content: messageData.summary,
        isSummary: true,
      });
    }

    return segments;
  }

  /**
   * Parse un texte avec étapes numérotées en segments modernes
   */
  parseTextToSegments(text: string, userName?: string): ModernSegment[] {
    const segments: ModernSegment[] = [];
    const currentTime = formatTime(new Date());
    const steps: Array<{ number: number; title: string; content: string; index: number }> = [];

    // Extraire le message de bienvenue (avant la première étape)
    // Chercher soit **1. soit 1. ** soit 1. **Titre**
    const firstStepMatch = text.match(/(\*\*\d+\.|\d+\.\s+\*\*)/);
    let welcomeText = '';

    if (firstStepMatch && firstStepMatch.index) {
      welcomeText = text.substring(0, firstStepMatch.index).trim();
    } else {
      // Si pas d'étapes, prendre la première phrase
      welcomeText = text.split('\n\n')[0] || text.substring(0, 200);
    }

    // Nettoyer le texte de bienvenue
    welcomeText = welcomeText
      .replace(/^Bien sûr,?\s*/i, '')
      .replace(/^Je\s+serais\s+ravi\s+de\s+/i, '')
      .replace(/^Pour\s+cela,?\s*/i, '')
      .replace(/^Voici\s+comment\s+procéder\s*:?\s*/i, '')
      .replace(/^il\s+vous\s+suffit\s+de\s+suivre\s+ces\s+étapes\s*:?\s*/i, '')
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();

    if (welcomeText && welcomeText.length > 10) {
      segments.push({
        id: `welcome-${Date.now()}`,
        time: currentTime,
        emoji: '🤖',
        title: 'Noteo',
        content: welcomeText,
        isWelcome: true,
      });
    }

    // Extraire les étapes - Pattern amélioré pour capturer le contenu complet
    // Format 1: **1. Titre** : Description
    // Format 2: 1. **Titre** : Description
    const stepRegex1 = /\*\*(\d+)\.\s*([^\n*]+?)\*\*\s*:?\s*/g;
    const stepRegex2 = /(\d+)\.\s*\*\*([^\n*]+?)\*\*\s*:?\s*/g;
    let match;
    const stepMatches: Array<{ number: number; title: string; startIndex: number; endIndex: number }> = [];

    // Essayer d'abord le format **1. Titre**
    while ((match = stepRegex1.exec(text)) !== null) {
      const [, num, title] = match;
      stepMatches.push({
        number: parseInt(num, 10),
        title: title.trim(),
        startIndex: match.index! + match[0].length,
        endIndex: 0, // Sera calculé après
      });
    }

    // Si aucun match, essayer le format 1. **Titre**
    if (stepMatches.length === 0) {
      while ((match = stepRegex2.exec(text)) !== null) {
        const [, num, title] = match;
        stepMatches.push({
          number: parseInt(num, 10),
          title: title.trim(),
          startIndex: match.index! + match[0].length,
          endIndex: 0, // Sera calculé après
        });
      }
    }

    // Calculer les endIndex
    stepMatches.forEach((stepMatch, idx) => {
      if (idx < stepMatches.length - 1) {
        // Trouver le début de la prochaine étape (format **N. ou N. **)
        const nextStepPattern1 = new RegExp(`\\*\\*${stepMatches[idx + 1].number}\\.`);
        const nextStepPattern2 = new RegExp(`${stepMatches[idx + 1].number}\\.\\s*\\*\\*`);
        const nextMatch1 = text.substring(stepMatch.startIndex).match(nextStepPattern1);
        const nextMatch2 = text.substring(stepMatch.startIndex).match(nextStepPattern2);
        
        const nextMatch = nextMatch1 || nextMatch2;
        stepMatch.endIndex = nextMatch 
          ? stepMatch.startIndex + nextMatch.index! 
          : text.length;
      } else {
        // Pour la dernière étape, chercher le message de suivi ou la fin
        const followUpPattern = /Si vous rencontrez|Faites-moi savoir|Est-ce que votre problème/i;
        const followUpMatch = text.substring(stepMatch.startIndex).match(followUpPattern);
        stepMatch.endIndex = followUpMatch
          ? stepMatch.startIndex + followUpMatch.index!
          : text.length;
      }
    });

    // Extraire le contenu pour chaque étape
    stepMatches.forEach((stepMatch) => {
      const content = text
        .substring(stepMatch.startIndex, stepMatch.endIndex)
        .trim()
        .replace(/^[:\-]\s*/, '') // Enlever les deux points ou tirets au début
        .split('\n\n')[0] // Prendre seulement le premier paragraphe si plusieurs
        .trim();

      steps.push({
        number: stepMatch.number,
        title: stepMatch.title,
        content: content || 'Vérifiez cette étape.',
        index: stepMatch.startIndex,
      });
    });

    // Si pas d'étapes trouvées avec ce pattern, essayer un pattern plus simple
    if (steps.length === 0) {
      const simpleStepRegex = /\*\*(\d+)\.\s*([^\n*]+?)\*\*/g;
      const allMatches: Array<{ num: number; title: string; index: number; endIndex: number }> = [];
      
      // Collecter tous les matches d'abord
      let simpleMatch;
      while ((simpleMatch = simpleStepRegex.exec(text)) !== null) {
        const [, num, title] = simpleMatch;
        allMatches.push({
          num: parseInt(num, 10),
          title: title.trim(),
          index: simpleMatch.index! + simpleMatch[0].length,
          endIndex: 0, // Sera calculé après
        });
      }

      // Calculer les endIndex pour chaque match
      allMatches.forEach((stepMatch, idx) => {
        if (idx < allMatches.length - 1) {
          // L'endIndex est l'index de début de la prochaine étape
          stepMatch.endIndex = allMatches[idx + 1].index;
        } else {
          // Pour la dernière étape, aller jusqu'à la fin du texte
          stepMatch.endIndex = text.length;
        }
      });

      // Extraire le contenu pour chaque étape
      allMatches.forEach((stepMatch) => {
        const content = text
          .substring(stepMatch.index, stepMatch.endIndex)
          .trim()
          .replace(/^[:\-]\s*/, '')
          .split('\n\n')[0] // Prendre seulement le premier paragraphe
          .trim();

        steps.push({
          number: stepMatch.num,
          title: stepMatch.title,
          content: content || 'Vérifiez cette étape.',
          index: stepMatch.index,
        });
      });
    }

    // Convertir les étapes en segments avec emojis numériques
    steps.forEach((step, index) => {
      // Détecter l'emoji selon le contenu du titre
      let emoji = getNumberEmoji(step.number);
      const titleLower = step.title.toLowerCase();
      
      // Emojis contextuels si le titre contient certains mots
      if (titleLower.includes('accédez') || titleLower.includes('section') || titleLower.includes('menu')) {
        emoji = getNumberEmoji(step.number) + ' 📂';
      } else if (titleLower.includes('choisissez') || titleLower.includes('type') || titleLower.includes('sélectionnez')) {
        emoji = getNumberEmoji(step.number) + ' 🎯';
      } else if (titleLower.includes('remplissez') || titleLower.includes('détails') || titleLower.includes('indiquez')) {
        emoji = getNumberEmoji(step.number) + ' 📝';
      } else if (titleLower.includes('invitez') || titleLower.includes('participants') || titleLower.includes('email')) {
        emoji = getNumberEmoji(step.number) + ' 👥';
      } else if (titleLower.includes('envoyez') || titleLower.includes('créer') || titleLower.includes('finaliser')) {
        emoji = getNumberEmoji(step.number) + ' 📤';
      }

      segments.push({
        id: `step-${step.number}-${Date.now()}-${index}`,
        time: currentTime,
        emoji,
        title: step.title,
        content: step.content,
      });
    });

    // Extraire le message de suivi (après les étapes)
    if (steps.length > 0) {
      const lastStepPattern = new RegExp(`\\*\\*${steps[steps.length - 1].number}\\.`);
      const lastStepMatch = text.match(lastStepPattern);
      
      if (lastStepMatch && lastStepMatch.index !== undefined) {
        const afterLastStep = text.substring(lastStepMatch.index + lastStepMatch[0].length);
        const followUpText = afterLastStep
          .replace(/✅\s*Oui.*/gi, '')
          .replace(/❌\s*Non.*/gi, '')
          .replace(/Est-ce que.*\?/gi, '')
          .replace(/Oui, c'est réglé/gi, '')
          .replace(/Non, toujours bloqué/gi, '')
          .trim()
          .split('\n\n')[0]
          .trim();

        if (followUpText && followUpText.length > 10) {
          segments.push({
            id: `followup-${Date.now()}`,
            time: currentTime,
            emoji: '📊',
            title: 'Résumé',
            content: followUpText,
            isSummary: true,
          });
        }
      }
    }

    return segments;
  }

  /**
   * Génère des segments pour un type de problème spécifique
   */
  generateSegmentsForProblem(problemType: MessageData['problemType'], userName?: string): ModernSegment[] {
    const currentTime = formatTime(new Date());
    const segments: ModernSegment[] = [];

    switch (problemType) {
      case 'notes':
        segments.push({
          id: `welcome-${Date.now()}`,
          time: currentTime,
          emoji: '🤖',
          title: 'Noteo',
          content: userName
            ? `Bonjour ${userName} ! Je vais vous guider pour utiliser les notes dans Centrinote.`
            : 'Bonjour ! Je vais vous guider pour utiliser les notes dans Centrinote.',
          isWelcome: true,
        });
        segments.push({
          id: `intro-${Date.now()}`,
          time: currentTime,
          emoji: '📚',
          title: 'Introduction',
          content: 'Centrinote vous permet de créer, modifier, organiser et importer des notes facilement.',
          isIntro: true,
        });
        segments.push({
          id: `step-1-${Date.now()}`,
          time: currentTime,
          emoji: '1️⃣',
          title: 'Créer une note',
          content: "Cliquez sur '+ Nouvelle note' dans le menu. Tout s'enregistre automatiquement !",
        });
        segments.push({
          id: `step-2-${Date.now()}`,
          time: currentTime,
          emoji: '2️⃣',
          title: 'Modifier une note',
          content: "Cliquez sur une note, puis sur l'icône ✏️ en haut à droite.",
        });
        segments.push({
          id: `step-3-${Date.now()}`,
          time: currentTime,
          emoji: '3️⃣',
          title: 'Organiser vos notes',
          content: 'Utilisez des tags et catégories. Épinglez les notes importantes.',
        });
        segments.push({
          id: `step-4-${Date.now()}`,
          time: currentTime,
          emoji: '4️⃣',
          title: 'Importer des documents',
          content: "Importez PDF ou Google Drive via le menu 'Importer'.",
        });
        break;

      case 'meeting':
        segments.push({
          id: `welcome-${Date.now()}`,
          time: currentTime,
          emoji: '🤖',
          title: 'Noteo',
          content: 'Bien sûr, je serais ravi de vous aider à créer une réunion !',
          isWelcome: true,
        });
        segments.push({
          id: `step-1-${Date.now()}`,
          time: currentTime,
          emoji: '1️⃣ 📂',
          title: 'Accédez à la section des réunions',
          content: 'Ouvrez votre application Centrinote et recherchez l\'option pour créer une réunion. Cela peut être sous "📅 Planning" ou dans un menu dédié.',
        });
        segments.push({
          id: `step-2-${Date.now()}`,
          time: currentTime,
          emoji: '2️⃣ 🎯',
          title: 'Choisissez le type de réunion',
          content: 'Vous pouvez opter pour une réunion via Jitsi Meet ou Zoom. Sélectionnez celui que vous préférez.',
        });
        segments.push({
          id: `step-3-${Date.now()}`,
          time: currentTime,
          emoji: '3️⃣ 📝',
          title: 'Remplissez les détails',
          content: 'Indiquez le titre de la réunion, la date, l\'heure et éventuellement une description si vous le souhaitez. N\'oubliez pas de choisir la durée de la réunion.',
        });
        segments.push({
          id: `step-4-${Date.now()}`,
          time: currentTime,
          emoji: '4️⃣ 👥',
          title: 'Invitez des participants',
          content: 'Entrez les adresses e-mail des personnes que vous souhaitez inviter. Si vous êtes en version Pro, vous pouvez inviter autant de collaborateurs que vous le souhaitez.',
        });
        segments.push({
          id: `step-5-${Date.now()}`,
          time: currentTime,
          emoji: '5️⃣ 📤',
          title: 'Envoyez les invitations',
          content: 'Une fois que tout est en ordre, cliquez sur "Envoyer" ou "Créer" pour finaliser la réunion. Les participants recevront un lien pour rejoindre.',
        });
        segments.push({
          id: `summary-${Date.now()}`,
          time: currentTime,
          emoji: '📊',
          title: 'Résumé',
          content: 'Si vous rencontrez des étapes spécifiques qui vous posent problème, n\'hésitez pas à me le dire, je vous aiderai avec plaisir !',
          isSummary: true,
        });
        break;

      default:
        break;
    }

    return segments;
  }
}

export const modernNoteoService = new ModernNoteoService();

