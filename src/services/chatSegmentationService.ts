/**
 * Service pour analyser les messages et créer des segments de réponse
 * Transforme les réponses longues en messages segmentés progressifs
 */

export interface SegmentData {
  emoji: string;
  content: string;
  isAction?: boolean;
  actionData?: {
    text: string;
    hint: string;
    onClick: () => void;
  };
}

export interface ProblemType {
  type: 'import' | 'automation' | 'meeting' | 'general' | 'vocabulary' | 'note';
  confidence: number;
}

class ChatSegmentationService {
  /**
   * Analyse un message utilisateur pour déterminer le type de problème
   */
  analyzeProblem(message: string): ProblemType {
    const lowerMessage = message.toLowerCase();
    
    // Détection des mots-clés pour chaque type de problème
    const importKeywords = ['import', 'importer', 'fichier', 'document', 'pdf', 'word', 'upload', 'télécharger'];
    const automationKeywords = ['automatisation', 'automatique', 'email', 'rappel', 'notification', 'programmé'];
    const meetingKeywords = ['réunion', 'meeting', 'vidéo', 'audio', 'partage', 'enregistrement', 'transcription'];
    const vocabularyKeywords = ['vocabulaire', 'mot', 'définition', 'terme', 'corriger', 'correction'];
    const noteKeywords = ['note', 'créer', 'modifier', 'supprimer', 'épingler'];
    
    let maxScore = 0;
    let detectedType: ProblemType['type'] = 'general';
    
    const scores = {
      import: importKeywords.filter(kw => lowerMessage.includes(kw)).length,
      automation: automationKeywords.filter(kw => lowerMessage.includes(kw)).length,
      meeting: meetingKeywords.filter(kw => lowerMessage.includes(kw)).length,
      vocabulary: vocabularyKeywords.filter(kw => lowerMessage.includes(kw)).length,
      note: noteKeywords.filter(kw => lowerMessage.includes(kw)).length,
    };
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type as ProblemType['type'];
      }
    }
    
    const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.3;
    
    return { type: detectedType, confidence };
  }

  /**
   * Génère les segments initiaux basés sur le type de problème
   */
  generateInitialSegments(problemType: ProblemType, userName?: string): SegmentData[] {
    const segments: SegmentData[] = [];
    
    // Message d'accueil personnalisé
    const greeting = userName 
      ? `👋 Bonjour ${userName}! Comment puis-je vous aider aujourd'hui ?`
      : `👋 Bonjour! Je suis Noteo, votre assistant IA. Comment puis-je vous aider ?`;
    
    segments.push({
      emoji: '🤖',
      content: greeting,
    });

    // Segments spécifiques selon le type de problème
    switch (problemType.type) {
      case 'import':
        segments.push({
          emoji: '📄',
          content: 'Je vois que vous avez un problème d\'import de document.',
        });
        segments.push({
          emoji: '🎯',
          content: 'Quel type de fichier voulez-vous importer ? (PDF, Word, images...)',
        });
        break;
        
      case 'automation':
        segments.push({
          emoji: '⚡',
          content: 'Je comprends votre souci avec les automatisations.',
        });
        segments.push({
          emoji: '🔧',
          content: 'Quelle automatisation pose problème ? (motivation/tâches/rappels)',
        });
        break;
        
      case 'meeting':
        segments.push({
          emoji: '📹',
          content: 'Je vois un problème avec vos réunions.',
        });
        segments.push({
          emoji: '🔍',
          content: 'La réunion est-elle créée ou en cours ?',
        });
        break;
        
      case 'vocabulary':
        segments.push({
          emoji: '📚',
          content: 'Je peux vous aider avec votre vocabulaire.',
        });
        segments.push({
          emoji: '💡',
          content: 'Souhaitez-vous ajouter, modifier ou corriger une définition ?',
        });
        break;
        
      case 'note':
        segments.push({
          emoji: '📝',
          content: 'Je peux vous aider avec vos notes.',
        });
        segments.push({
          emoji: '✨',
          content: 'Que souhaitez-vous faire ? (créer, modifier, rechercher)',
        });
        break;
        
      default:
        segments.push({
          emoji: '💬',
          content: 'Je suis là pour vous aider. Posez-moi votre question !',
        });
    }

    return segments;
  }

  /**
   * Segmente une réponse longue en plusieurs messages progressifs
   */
  segmentResponse(response: string, problemType?: ProblemType): SegmentData[] {
    const segments: SegmentData[] = [];
    
    // Si la réponse est courte, la retourner telle quelle
    if (response.length < 200) {
      return [{
        emoji: '💡',
        content: response,
      }];
    }

    // Détecter les sections dans la réponse (titres, listes, etc.)
    const lines = response.split('\n');
    let currentSection: string[] = [];
    let currentEmoji = '💡';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // Détecter les titres ou sections importantes
      if (line.match(/^#{1,3}\s+/) || line.match(/^[A-Z][^.!?]*:$/)) {
        // Sauvegarder la section précédente
        if (currentSection.length > 0) {
          segments.push({
            emoji: currentEmoji,
            content: currentSection.join('\n'),
          });
          currentSection = [];
        }
        
        // Déterminer l'emoji selon le contenu
        currentEmoji = this.detectEmojiForSection(line);
      } else if (line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
        // C'est une liste, créer un segment pour chaque élément important
        if (currentSection.length > 0) {
          segments.push({
            emoji: currentEmoji,
            content: currentSection.join('\n'),
          });
          currentSection = [];
        }
        
        segments.push({
          emoji: '📋',
          content: line,
        });
      } else {
        currentSection.push(line);
      }
    }
    
    // Ajouter la dernière section
    if (currentSection.length > 0) {
      segments.push({
        emoji: currentEmoji,
        content: currentSection.join('\n'),
      });
    }
    
    // Si aucun segment n'a été créé, créer un segment simple
    if (segments.length === 0) {
      // Diviser la réponse en chunks de ~300 caractères
      const chunkSize = 300;
      const chunks = [];
      for (let i = 0; i < response.length; i += chunkSize) {
        chunks.push(response.slice(i, i + chunkSize));
      }
      
      chunks.forEach((chunk, index) => {
        segments.push({
          emoji: index === 0 ? '💡' : index === chunks.length - 1 ? '📋' : '🔍',
          content: chunk.trim(),
        });
      });
    }
    
    return segments;
  }

  /**
   * Détecte l'emoji approprié pour une section
   */
  private detectEmojiForSection(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('étape') || lowerText.includes('première') || lowerText.includes('commencer')) {
      return '🎯';
    }
    if (lowerText.includes('vérification') || lowerText.includes('vérifier') || lowerText.includes('essayer')) {
      return '✅';
    }
    if (lowerText.includes('solution') || lowerText.includes('résoudre') || lowerText.includes('corriger')) {
      return '💡';
    }
    if (lowerText.includes('alternative') || lowerText.includes('sinon') || lowerText.includes('aussi')) {
      return '⚡';
    }
    if (lowerText.includes('récapitulatif') || lowerText.includes('résumé') || lowerText.includes('en résumé')) {
      return '📋';
    }
    if (lowerText.includes('attention') || lowerText.includes('important') || lowerText.includes('note')) {
      return '⚠️';
    }
    if (lowerText.includes('succès') || lowerText.includes('parfait') || lowerText.includes('terminé')) {
      return '🎉';
    }
    if (lowerText.includes('configuration') || lowerText.includes('paramètre') || lowerText.includes('réglage')) {
      return '🔧';
    }
    
    return '💡';
  }

  /**
   * Génère les boutons d'action rapides
   */
  generateQuickActions(): SegmentData[] {
    return [
      {
        emoji: '📥',
        content: 'Actions rapides disponibles :',
        isAction: true,
        actionData: {
          text: "J'ai un problème d'import",
          hint: 'PDF, Word, images...',
          onClick: () => {},
        },
      },
    ];
  }
}

export const chatSegmentationService = new ChatSegmentationService();

