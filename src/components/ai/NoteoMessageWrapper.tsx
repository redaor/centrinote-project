/**
 * Wrapper intelligent qui détecte automatiquement le type de message
 * et utilise le composant approprié (EnhancedNoteoMessage ou SegmentedMessage)
 */

import React from 'react';
import { EnhancedNoteoMessage, Step } from './EnhancedNoteoMessage';
import { enhancedNoteoService } from '../../services/enhancedNoteoService';
import { ModernNoteoMessage } from './ModernNoteoMessage';
import { modernNoteoService } from '../../services/modernNoteoService';

export interface NoteoMessageWrapperProps {
  content: string;
  problemType?: 'save-button' | 'import' | 'automation' | 'meeting' | 'general';
  userName?: string;
  onSuccess?: () => void;
  onFailure?: () => void;
  darkMode?: boolean;
}

/**
 * Détecte si le contenu contient des étapes numérotées
 */
function detectStepsInContent(content: string): boolean {
  // Détecte les patterns comme "1. ", "**1. ", "Étape 1", etc.
  const stepPatterns = [
    /\*\*\d+\.\s+/g,
    /^\d+\.\s+/gm,
    /Étape\s+\d+/gi,
    /\*\*Étape\s+\d+/gi,
  ];

  return stepPatterns.some(pattern => pattern.test(content));
}

/**
 * Parse le contenu pour extraire les étapes
 */
function parseStepsFromContent(content: string): Step[] {
  const steps: Step[] = [];
  
  // Pattern amélioré pour détecter les étapes avec **1. ** ou **1.**
  // Format: **1. Titre** : Description
  // ou: **1. Titre** Description (sans les deux points)
  const stepRegex = /\*\*(\d+)\.\s*([^\n*]+?)\*\*\s*:?\s*([^\n]+?)(?=\n\n|\n\*\*\d+\.|$)/gs;
  let match;
  const matches: Array<{ num: number; title: string; content: string; index: number }> = [];

  // Collecter tous les matches
  while ((match = stepRegex.exec(content)) !== null) {
    const [, num, title, description] = match;
    matches.push({
      num: parseInt(num, 10),
      title: title.trim(),
      content: description.trim(),
      index: match.index,
    });
  }

  // Si aucun match avec ce pattern, essayer un pattern plus simple
  if (matches.length === 0) {
    const simpleStepRegex = /\*\*(\d+)\.\s*([^\n*]+?)\*\*/g;
    const simpleMatches: Array<{ num: number; title: string; index: number; endIndex: number }> = [];
    
    while ((match = simpleStepRegex.exec(content)) !== null) {
      const [, num, title] = match;
      const nextMatch = simpleStepRegex.exec(content);
      const endIndex = nextMatch ? nextMatch.index : content.length;
      
      simpleMatches.push({
        num: parseInt(num, 10),
        title: title.trim(),
        index: match.index! + match[0].length,
        endIndex,
      });
    }

    // Extraire le contenu pour chaque étape
    simpleMatches.forEach((stepMatch, idx) => {
      const stepContent = content
        .substring(stepMatch.index, stepMatch.endIndex)
        .trim()
        .replace(/^[:\-]\s*/, '') // Enlever les deux points ou tirets au début
        .replace(/\n\n.*$/, '') // Enlever tout après un double saut de ligne
        .trim();

      // Extraire l'emoji du titre si présent, sinon utiliser un emoji par défaut selon le contenu
      const emojiMatch = stepMatch.title.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
      let emoji = emojiMatch ? emojiMatch[0] : null;
      
      // Si pas d'emoji, détecter selon le contenu du titre
      if (!emoji) {
        const titleLower = stepMatch.title.toLowerCase();
        if (titleLower.includes('accédez') || titleLower.includes('section') || titleLower.includes('menu')) {
          emoji = '📂';
        } else if (titleLower.includes('choisissez') || titleLower.includes('type') || titleLower.includes('sélectionnez')) {
          emoji = '🎯';
        } else if (titleLower.includes('remplissez') || titleLower.includes('détails') || titleLower.includes('indiquez')) {
          emoji = '📝';
        } else if (titleLower.includes('invitez') || titleLower.includes('participants') || titleLower.includes('email')) {
          emoji = '👥';
        } else if (titleLower.includes('envoyez') || titleLower.includes('créer') || titleLower.includes('finaliser')) {
          emoji = '📤';
        } else {
          emoji = '💡';
        }
      }
      
      const cleanTitle = stepMatch.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u, '').trim();

      steps.push({
        id: `step-${stepMatch.num}`,
        number: stepMatch.num,
        emoji,
        title: cleanTitle || `Étape ${stepMatch.num}`,
        content: stepContent || 'Vérifiez cette étape.',
      });
    });

    return steps;
  }

  // Traiter les matches trouvés
  matches.forEach((stepMatch) => {
    // Extraire l'emoji du titre si présent, sinon utiliser un emoji par défaut
    const emojiMatch = stepMatch.title.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
    let emoji = emojiMatch ? emojiMatch[0] : null;
    
    // Si pas d'emoji, détecter selon le contenu du titre
    if (!emoji) {
      const titleLower = stepMatch.title.toLowerCase();
      if (titleLower.includes('accédez') || titleLower.includes('section') || titleLower.includes('menu')) {
        emoji = '📂';
      } else if (titleLower.includes('choisissez') || titleLower.includes('type') || titleLower.includes('sélectionnez')) {
        emoji = '🎯';
      } else if (titleLower.includes('remplissez') || titleLower.includes('détails') || titleLower.includes('indiquez')) {
        emoji = '📝';
      } else if (titleLower.includes('invitez') || titleLower.includes('participants') || titleLower.includes('email')) {
        emoji = '👥';
      } else if (titleLower.includes('envoyez') || titleLower.includes('créer') || titleLower.includes('finaliser')) {
        emoji = '📤';
      } else {
        emoji = '💡';
      }
    }
    
    const cleanTitle = stepMatch.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u, '').trim();

    // Nettoyer le contenu
    const cleanContent = stepMatch.content
      .replace(/^[:\-]\s*/, '')
      .replace(/\n\n.*$/, '')
      .trim();

    steps.push({
      id: `step-${stepMatch.num}`,
      number: stepMatch.num,
      emoji,
      title: cleanTitle || `Étape ${stepMatch.num}`,
      content: cleanContent || 'Vérifiez cette étape.',
    });
  });

  return steps;
}

/**
 * Extrait le message de bienvenue du contenu
 */
function extractWelcomeMessage(content: string, steps: Step[]): string {
  if (steps.length === 0) {
    return content.split('\n\n')[0] || content;
  }

  // Trouver la première étape (chercher **1. ou **1. )
  const firstStepPattern = new RegExp(`\\*\\*${steps[0].number}\\.`);
  const firstStepIndex = content.search(firstStepPattern);
  
  if (firstStepIndex > 0) {
    const welcomeText = content.substring(0, firstStepIndex).trim();
    // Nettoyer le texte (enlever les sauts de ligne multiples)
    return welcomeText.replace(/\n{3,}/g, '\n\n').trim();
  }

  // Fallback : prendre la première phrase/paragraphe
  const firstParagraph = content.split('\n\n')[0];
  return firstParagraph || 'Bonjour ! Je vais vous aider.';
}

/**
 * Extrait le message de suivi du contenu
 */
function extractFollowUpMessage(content: string, steps: Step[]): string {
  if (steps.length === 0) {
    return '';
  }

  // Chercher après la dernière étape
  const lastStepPattern = new RegExp(`\\*\\*${steps[steps.length - 1].number}\\.`);
  const lastStepMatch = content.match(lastStepPattern);
  
  if (lastStepMatch && lastStepMatch.index !== undefined) {
    // Trouver où se termine le contenu de la dernière étape
    const afterLastStepStart = lastStepMatch.index + lastStepMatch[0].length;
    
    // Chercher le prochain pattern d'étape ou la fin
    const nextStepPattern = new RegExp(`\\*\\*${steps[steps.length - 1].number + 1}\\.`);
    const nextStepMatch = content.substring(afterLastStepStart).match(nextStepPattern);
    
    let followUpStart = afterLastStepStart;
    if (nextStepMatch) {
      followUpStart = afterLastStepStart + nextStepMatch.index!;
    }
    
    // Extraire le texte après la dernière étape
    const afterLastStep = content.substring(followUpStart);
    
    // Enlever les boutons de résultat et la question
    const withoutButtons = afterLastStep
      .replace(/✅\s*Oui.*/gi, '')
      .replace(/❌\s*Non.*/gi, '')
      .replace(/Est-ce que.*\?/gi, '')
      .replace(/Oui, c'est réglé/gi, '')
      .replace(/Non, toujours bloqué/gi, '')
      .replace(/Non, toujours b'/gi, '')
      .trim();
    
    // Nettoyer les sauts de ligne multiples
    const cleaned = withoutButtons.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned || 'Faites-moi savoir si cela vous aide !';
  }

  return 'Faites-moi savoir si cela vous aide !';
}

export function NoteoMessageWrapper({
  content,
  problemType = 'general',
  userName,
  onSuccess,
  onFailure,
  darkMode = false,
}: NoteoMessageWrapperProps) {
  // Détecter si le contenu contient des étapes
  const hasSteps = detectStepsInContent(content);

  // Si pas d'étapes détectées mais qu'on a un type de problème, utiliser le service moderne
  if (!hasSteps && problemType !== 'general') {
    // Mapper les types de problèmes
    const modernProblemType = problemType === 'meeting' ? 'meeting' : 
                              problemType === 'import' ? 'import' : 
                              problemType === 'automation' ? 'automation' : 
                              'notes';
    
    const modernSegments = modernNoteoService.generateSegmentsForProblem(modernProblemType, userName);
    
    if (modernSegments.length > 0) {
      return (
        <div className={darkMode ? 'dark' : ''}>
          <ModernNoteoMessage
            segments={modernSegments}
            onSuccess={onSuccess}
            onFailure={onFailure}
            userName={userName}
            showProgressively={true}
            segmentDelay={1500}
            darkMode={darkMode}
          />
        </div>
      );
    }

    // Fallback vers l'ancien service si le service moderne n'a pas de segments
    const config = enhancedNoteoService.createMessageConfig(problemType, userName);
    
    return (
      <div className={darkMode ? 'dark' : ''}>
        <EnhancedNoteoMessage
          welcomeMessage={config.welcomeMessage}
          steps={config.steps}
          followUpMessage={config.followUpMessage}
          onSuccess={onSuccess}
          onFailure={onFailure}
          userName={userName}
          problemType={problemType}
          showStepsProgressively={true}
          stepDelay={500}
        />
      </div>
    );
  }

  // Si des étapes sont détectées dans le contenu, utiliser le format moderne
  if (hasSteps) {
    // Utiliser le service moderne pour parser et convertir
    const modernSegments = modernNoteoService.parseTextToSegments(content, userName);
    
    if (modernSegments.length > 0) {
      return (
        <div className={darkMode ? 'dark' : ''}>
          <ModernNoteoMessage
            segments={modernSegments}
            onSuccess={onSuccess}
            onFailure={onFailure}
            userName={userName}
            showProgressively={true}
            segmentDelay={1500}
            darkMode={darkMode}
          />
        </div>
      );
    }

    // Fallback vers l'ancien format si le parsing moderne échoue
    const parsedSteps = parseStepsFromContent(content);
    
    if (parsedSteps.length > 0) {
      const welcomeMessage = extractWelcomeMessage(content, parsedSteps);
      const followUpMessage = extractFollowUpMessage(content, parsedSteps);

      return (
        <div className={darkMode ? 'dark' : ''}>
          <EnhancedNoteoMessage
            welcomeMessage={welcomeMessage}
            steps={parsedSteps}
            followUpMessage={followUpMessage}
            onSuccess={onSuccess}
            onFailure={onFailure}
            userName={userName}
            problemType={problemType}
            showStepsProgressively={true}
            stepDelay={500}
          />
        </div>
      );
    }
  }

  // Fallback : utiliser le service avec le type de problème
  const config = enhancedNoteoService.createMessageConfig(problemType, userName);
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <EnhancedNoteoMessage
        welcomeMessage={config.welcomeMessage}
        steps={config.steps}
        followUpMessage={config.followUpMessage}
        onSuccess={onSuccess}
        onFailure={onFailure}
        userName={userName}
        problemType={problemType}
        showStepsProgressively={true}
        stepDelay={500}
      />
    </div>
  );
}

