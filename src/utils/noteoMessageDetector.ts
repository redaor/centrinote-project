/**
 * Utilitaires pour détecter si un message doit utiliser le format EnhancedNoteoMessage
 */

export interface MessageAnalysis {
  shouldUseEnhanced: boolean;
  problemType?: 'save-button' | 'import' | 'automation' | 'meeting' | 'general';
  hasSteps: boolean;
  stepCount: number;
}

/**
 * Détecte si un message contient des étapes numérotées
 */
export function hasNumberedSteps(content: string): boolean {
  const stepPatterns = [
    /\*\*\d+\.\s+/g,                    // **1.
    /\*\*\d+\.\*\*/g,                   // **1.** (sans espace)
    /^\d+\.\s+/gm,                      // 1.
    /Étape\s+\d+/gi,                    // Étape 1
    /\*\*Étape\s+\d+/gi,                // **Étape 1
    /^[\u2022\u2023\u25E6\u2043\u2219]\s+\d+/gm, // • 1, ◦ 1, etc.
    /\d+\.\s+\*\*[^\n]+\*\*/g,          // 1. **Titre**
  ];

  return stepPatterns.some(pattern => {
    const matches = content.match(pattern);
    return matches && matches.length >= 1; // AU MOINS 1 étape (changé de 2 à 1)
  });
}

/**
 * Compte le nombre d'étapes dans un message
 */
export function countSteps(content: string): number {
  // Chercher TOUS les patterns d'étapes possibles
  const stepRegex = /\*\*\d+\.\s+|\*\*\d+\.\*\*|\d+\.\s+\*\*|\d+\.\s+/g;
  const matches = content.match(stepRegex);
  if (matches) {
    return matches.length;
  }

  return 0;
}

/**
 * Détecte le type de problème basé sur le contenu
 */
export function detectProblemType(content: string): 'save-button' | 'import' | 'automation' | 'meeting' | 'general' {
  const lowerContent = content.toLowerCase();

  // Mots-clés pour chaque type de problème
  const saveButtonKeywords = [
    'sauvegarde', 'enregistrer', 'enregistrement', 'bouton sauvegarde',
    'ne fonctionne pas', 'ne s\'enregistre pas', 'ne se sauvegarde pas'
  ];
  
  const importKeywords = [
    'importer', 'import', 'fichier', 'pdf', 'document', 'upload', 'télécharger'
  ];
  
  const automationKeywords = [
    'automatisation', 'automatique', 'règle', 'email automatique', 'rappel automatique'
  ];
  
  const meetingKeywords = [
    'réunion', 'meeting', 'vidéo', 'audio', 'enregistrement réunion',
    'créer une réunion', 'créer réunion', 'organiser une réunion',
    'jitsi', 'zoom', 'participants', 'inviter'
  ];

  if (saveButtonKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'save-button';
  }
  
  if (importKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'import';
  }
  
  if (automationKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'automation';
  }
  
  if (meetingKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'meeting';
  }

  return 'general';
}

/**
 * Analyse un message pour déterminer s'il doit utiliser le format EnhancedNoteoMessage
 */
export function analyzeMessage(content: string): MessageAnalysis {
  const hasSteps = hasNumberedSteps(content);
  const stepCount = hasSteps ? countSteps(content) : 0;
  const problemType = detectProblemType(content);
  
  // Utiliser EnhancedNoteoMessage si :
  // 1. Le message contient des étapes numérotées (2+ étapes)
  // 2. Le type de problème est détecté et n'est pas 'general'
  // 3. Le message est assez long (> 150 caractères) et contient des mots-clés de problème
  // 4. OU message long (> 200 caractères) pour forcer le nouveau format (TEST)
  const shouldUseEnhanced =
    (hasSteps && stepCount >= 2) ||
    (problemType !== 'general' && content.length > 150 && hasSteps) ||
    (hasSteps && stepCount >= 1 && problemType !== 'general') ||
    (content.length > 200); // FORCER pour tester

  return {
    shouldUseEnhanced,
    problemType,
    hasSteps,
    stepCount,
  };
}

/**
 * Extrait les mots-clés d'un message pour améliorer la détection
 */
export function extractKeywords(content: string): string[] {
  const lowerContent = content.toLowerCase();
  const keywords: string[] = [];

  // Mots-clés importants
  const importantKeywords = [
    'problème', 'erreur', 'ne fonctionne pas', 'aide', 'résoudre',
    'étape', 'vérifier', 'essayer', 'solution', 'corriger'
  ];

  importantKeywords.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      keywords.push(keyword);
    }
  });

  return keywords;
}

