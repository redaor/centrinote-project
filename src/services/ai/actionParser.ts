/**
 * Service pour parser les actions proposées par l'IA
 * Détecte les intentions de modification dans les réponses IA et les structure
 */

export interface AIAction {
  type: 'update_vocabulary' | 'update_note' | 'confirm_correction'; // Nouveau type pour la demande de confirmation
  targetId?: string; // ID du vocabulaire ou de la note à modifier
  targetName?: string; // Nom du mot ou titre de la note
  data: {
    // Pour vocabulaire
    word?: string;
    definition?: string;
    category?: string;
    examples?: string[];
    // Pour note
    title?: string;
    content?: string;
    // Pour confirm_correction
    errorDescription?: string; // Description de l'erreur détectée
  };
  originalData?: {
    // Données originales pour comparer
    word?: string;
    definition?: string;
    title?: string;
    content?: string;
  };
  reason?: string; // Raison de la modification (ex: "correction d'erreur")
}

/**
 * Parse les actions dans une réponse IA
 */
export class AIActionParser {
  /**
   * Détecte si la réponse contient une demande de confirmation (étape 1) ou une proposition de modification (étape 3)
   */
  static parseActions(aiResponse: string, context?: { vocabulary?: Array<{ id?: string; word: string; definition: string }>; notes?: Array<{ id?: string; title: string; content: string }> }): AIAction[] {
    const actions: AIAction[] = [];
    
    // D'abord, vérifier si c'est une demande de confirmation (étape 1)
    const confirmationPatterns = [
      /(?:souhaites-tu|veux-tu|dois-je|dois-tu|voulez-vous|aimerais-tu).*(?:que je|que je|je).*(?:corrige|modifie|propose|améliore)/i,
      /(?:souhaites-tu|veux-tu).*(?:une correction|une version corrigée|que je corrige)/i,
      /(?:dois-je|dois-tu).*(?:proposer|corriger|modifier)/i,
    ];
    
    const hasConfirmationRequest = confirmationPatterns.some(pattern => pattern.test(aiResponse));
    
    // Si c'est une demande de confirmation, détecter quel élément est concerné
    if (hasConfirmationRequest) {
      // Chercher les mentions de vocabulaire ou notes
      const vocabularyMentionPattern = /(?:la|le|définition|mot|vocabulaire).*["']([^"']+)["']/i;
      const noteMentionPattern = /(?:la|le|note).*["']([^"']+)["']/i;
      
      const vocabMatch = aiResponse.match(vocabularyMentionPattern);
      const noteMatch = aiResponse.match(noteMentionPattern);
      
      // Extraire la description de l'erreur
      const errorPattern = /(?:erreur|faute|problème|incorrect).*?([^.!?]+)/i;
      const errorMatch = aiResponse.match(errorPattern);
      
      if (vocabMatch && vocabMatch[1]) {
        const wordName = vocabMatch[1].trim();
        const vocabularyEntry = context?.vocabulary?.find(v => 
          v.word.toLowerCase() === wordName.toLowerCase()
        );
        
        if (vocabularyEntry) {
          actions.push({
            type: 'confirm_correction',
            targetId: vocabularyEntry.id,
            targetName: vocabularyEntry.word,
            data: {
              word: vocabularyEntry.word,
              errorDescription: errorMatch ? errorMatch[1].trim() : 'Erreur détectée dans la définition',
            },
            originalData: {
              word: vocabularyEntry.word,
              definition: vocabularyEntry.definition,
            },
            reason: 'L\'IA a détecté une erreur et demande confirmation avant de corriger',
          });
        }
      } else if (noteMatch && noteMatch[1]) {
        const noteTitle = noteMatch[1].trim();
        const note = context?.notes?.find(n => 
          n.title.toLowerCase() === noteTitle.toLowerCase() ||
          noteTitle.toLowerCase().includes(n.title.toLowerCase()) ||
          n.title.toLowerCase().includes(noteTitle.toLowerCase())
        );
        
        if (note) {
          actions.push({
            type: 'confirm_correction',
            targetId: note.id,
            targetName: note.title,
            data: {
              title: note.title,
              errorDescription: errorMatch ? errorMatch[1].trim() : 'Erreur détectée dans le contenu',
            },
            originalData: {
              title: note.title,
              content: note.content,
            },
            reason: 'L\'IA a détecté une erreur et demande confirmation avant de corriger',
          });
        }
      }
      
      // Si on a trouvé une demande de confirmation, ne pas chercher de corrections directes
      if (actions.length > 0) {
        return actions;
      }
    }
    
    // Sinon, chercher les propositions de modification directes (étape 3 - après confirmation utilisateur)
    const vocabularyPatterns = [
      /(?:mettre à jour|modifier|corriger|améliorer).*(?:la|le|définition|mot|vocabulaire).*["']([^"']+)["']/gi,
      /["']([^"']+)["'].*(?:doit être|devrait être|est incorrect|contient une erreur)/gi,
      /(?:correction|version révisée|nouvelle définition|définition correcte).*["']([^"']+)["']/gi,
    ];
    
    const notePatterns = [
      /(?:mettre à jour|modifier|corriger).*(?:la|le|note).*["']([^"']+)["']/gi,
      /["']([^"']+)["'].*(?:doit être|devrait être|est incorrect)/gi,
    ];
    
    // Chercher des références au vocabulaire
    for (const pattern of vocabularyPatterns) {
      const matches = Array.from(aiResponse.matchAll(pattern));
      for (const match of matches) {
        const wordName = match[1]?.trim();
        if (!wordName) continue;
        
        // Chercher le mot dans le contexte
        const vocabularyEntry = context?.vocabulary?.find(v => 
          v.word.toLowerCase() === wordName.toLowerCase()
        );
        
          if (vocabularyEntry) {
            // Extraire la nouvelle définition proposée (en passant la définition originale pour les corrections de mots)
            const newDefinitionMatch = this.extractNewDefinition(aiResponse, wordName, vocabularyEntry.definition);
            
            if (newDefinitionMatch) {
              // Validation de la définition extraite
              const trimmedDefinition = newDefinitionMatch.trim();
              
              // Vérifier longueur minimale
              if (trimmedDefinition.length < 10) {
                console.warn('⚠️ [ActionParser] Définition trop courte, ignorée:', trimmedDefinition);
                continue;
              }
              
              // Vérifier longueur maximale
              if (trimmedDefinition.length > 10000) {
                console.warn('⚠️ [ActionParser] Définition trop longue, ignorée:', trimmedDefinition.length, 'caractères');
                continue;
              }
              
              // Vérifier que ce n'est pas un fragment parasite
              const invalidPatterns = [
                /^(?:à|à la|la|définition de|dans ton vocabulaire)[\s:]*$/i,
                /^(?:Actuellement, tu as noté que)/i,
                /^(?:je remarque que)/i,
              ];
              
              let isInvalid = false;
              for (const pattern of invalidPatterns) {
                if (pattern.test(trimmedDefinition)) {
                  console.warn('⚠️ [ActionParser] Fragment parasite détecté, ignoré:', trimmedDefinition.substring(0, 100));
                  isInvalid = true;
                  break;
                }
              }
              
              if (!isInvalid) {
                actions.push({
                  type: 'update_vocabulary',
                  targetId: vocabularyEntry.id,
                  targetName: vocabularyEntry.word,
                  data: {
                    word: vocabularyEntry.word,
                    definition: trimmedDefinition,
                  },
                  originalData: {
                    word: vocabularyEntry.word,
                    definition: vocabularyEntry.definition,
                  },
                  reason: 'Correction proposée par l\'IA',
                });
              }
            }
          }
      }
    }
    
    // Chercher des références aux notes
    for (const pattern of notePatterns) {
      const matches = Array.from(aiResponse.matchAll(pattern));
      for (const match of matches) {
        const noteTitle = match[1]?.trim();
        if (!noteTitle) continue;
        
        const note = context?.notes?.find(n => 
          n.title.toLowerCase().includes(noteTitle.toLowerCase()) ||
          noteTitle.toLowerCase().includes(n.title.toLowerCase())
        );
        
        if (note) {
          const newContentMatch = this.extractNewContent(aiResponse, noteTitle);
          
          if (newContentMatch) {
            actions.push({
              type: 'update_note',
              targetId: note.id,
              targetName: note.title,
              data: {
                title: note.title,
                content: newContentMatch,
              },
              originalData: {
                title: note.title,
                content: note.content,
              },
              reason: 'Correction proposée par l\'IA',
            });
          }
        }
      }
    }
    
    return actions;
  }
  
  /**
   * Extrait la nouvelle définition proposée depuis la réponse
   */
  private static extractNewDefinition(response: string, wordName: string, originalDefinition?: string): string | null {
    console.log('🔍 [ActionParser] Extraction définition pour:', wordName);
    console.log('📝 [ActionParser] Réponse complète:', response);
    console.log('📋 [ActionParser] Définition originale:', originalDefinition?.substring(0, 100));
    
    // Nettoyer le nom du mot pour la recherche (enlever guillemets si présents)
    const cleanWordName = wordName.replace(/["']/g, '').trim();
    
    // 0. Détecter les corrections de mots simples (ex: "teste" devrait être "test")
    if (originalDefinition) {
      const wordCorrectionPattern = /(?:le\s+)?mot\s+["']([^"']+)["']\s+(?:devrait|doit)\s+être\s+["']([^"']+)["']/i;
      const correctionMatch = response.match(wordCorrectionPattern);
      if (correctionMatch) {
        const wrongWord = correctionMatch[1].trim();
        const correctWord = correctionMatch[2].trim();
        // Remplacer le mot erroné par le mot correct dans la définition originale
        const correctedDefinition = originalDefinition.replace(
          new RegExp(wrongWord, 'gi'),
          correctWord
        );
        if (correctedDefinition !== originalDefinition && correctedDefinition.length > 10) {
          console.log('✅ [ActionParser] Correction de mot appliquée:', { wrongWord, correctWord });
          console.log('✅ [ActionParser] Définition corrigée:', correctedDefinition.substring(0, 150));
          return correctedDefinition;
        }
      }
      
      // Si la correction a été trouvée, elle a déjà été retournée plus haut
      // Pas besoin de pattern alternatif ici
    }
    
    // 1. Chercher après "En réalité" ou "En fait" - souvent la vraie définition
    // MAIS ignorer si c'est suivi de "il y a une erreur" ou similaire
    const realityPattern = /(?:en réalité|en fait|en vérité|en revanche)[:;\s]+(?!.*?(?:erreur|faute|incorrect))([^.\n]{50,}(?:\.[^.\n]{0,200})*\.)/i;
    let match = response.match(realityPattern);
    if (match && match[1]) {
      let extracted = match[1].trim();
      // Nettoyer les fragments de début comme "à la définition", "il y a", etc.
      extracted = extracted.replace(/^(?:à|à la|la|définition de|dans ton vocabulaire|il y a|petite erreur)[\s:.,]*/i, '');
      // Ignorer si ça commence par une explication d'erreur
      if (!/^(?:erreur|faute|incorrect|tu as écrit|noté que)/i.test(extracted) && extracted.length > 30) {
        console.log('✅ [ActionParser] Définition extraite (réalité):', extracted.substring(0, 150));
        return extracted;
      }
    }
    
    // 2. Chercher la définition complète après "La [mot] est" ou similaire
    const wordDefPattern = new RegExp(`(?:la|le|L'|l')?\\s*${cleanWordName}\\s+(?:est|serait|c'est|ce processus|serait)\\s+([^.\n]{50,}(?:\\.(?![^.\n]{0,50}\\s*(?:Par exemple|Ex:|Les animaux|Elle|Il|Tu as|Tu|dans))[^.\n]{0,200})*\\.)`, 'i');
    match = response.match(wordDefPattern);
    if (match && match[1]) {
      let extracted = match[1].trim();
      // Ignorer si c'est juste une explication d'erreur
      if (!/^(?:erreur|faute|incorrect|tu as écrit|noté que|il y a)/i.test(extracted)) {
        extracted = extracted.replace(/^(?:à|à la|la|définition de|dans ton vocabulaire)[\s:]*/i, '');
        if (extracted.length > 30) {
          console.log('✅ [ActionParser] Définition extraite (mot+est):', extracted.substring(0, 150));
          return extracted;
        }
      }
    }
    
    // 3. Chercher après des phrases introductives (mais ignorer les explications d'erreur)
    const introPatterns = [
      /(?:voici|définition révisée|nouvelle définition|version corrigée|définition correcte|définition serait)[:;\s]+(?!.*?(?:erreur|faute|incorrect))([^.\n]{50,}(?:\.[^.\n]{0,200})*\.)/i,
      /(?:la\s+)?(?:définition|version)\s+(?:serait|est|sera)[:;\s]+(?!.*?(?:erreur|faute|incorrect))([^.\n]{50,}(?:\.[^.\n]{0,200})*\.)/i,
    ];
    
    for (const pattern of introPatterns) {
      match = response.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        // Ignorer si ça commence par une explication
        if (!/^(?:à|à la|la|définition de|dans ton vocabulaire|il y a|erreur|faute|tu as écrit|noté que|En effet)/i.test(extracted)) {
          if (extracted.length > 30) {
            console.log('✅ [ActionParser] Définition extraite (intro):', extracted.substring(0, 150));
            return extracted;
          }
        }
      }
    }
    
    // 4. Chercher après le mot entre guillemets
    const wordInQuotes = new RegExp(`["']${cleanWordName}["']`, 'i');
    const wordMatch = response.match(wordInQuotes);
    if (wordMatch && wordMatch.index !== undefined) {
      const afterWord = response.substring(wordMatch.index + wordMatch[0].length);
      // Chercher plusieurs phrases après le mot
      const sentenceMatch = afterWord.match(/[:;\s]+([^.\n]{50,}(?:\.[^.\n]{0,200})*\.)/);
      if (sentenceMatch && sentenceMatch[1]) {
        let extracted = sentenceMatch[1].trim();
        extracted = extracted.replace(/^(?:à|à la|la|définition de|dans ton vocabulaire)[\s:]*/i, '');
        if (extracted.length > 30) {
          console.log('✅ [ActionParser] Définition extraite (après mot):', extracted.substring(0, 150));
          return extracted;
        }
      }
    }
    
    // 5. Chercher une définition entre guillemets (dernière citation longue)
    const quotePattern = /["']([^"']{50,})["']/g;
    const quotes = Array.from(response.matchAll(quotePattern));
    if (quotes.length > 0) {
      // Prendre la dernière citation longue qui ne ressemble pas à un mot simple
      for (let i = quotes.length - 1; i >= 0; i--) {
        const quote = quotes[i][1].trim();
        // Ignorer les citations courtes ou qui sont juste le nom du mot
        if (quote.length > 50 && !quote.toLowerCase().includes(cleanWordName.toLowerCase()) || 
            quote.split(' ').length > 5) {
          console.log('✅ [ActionParser] Définition extraite (guillemets):', quote.substring(0, 150));
          return quote;
        }
      }
    }
    
    // 6. Fallback: chercher la définition dans la dernière partie de la réponse (souvent après les explications)
    // Ignorer les premières phrases qui sont souvent des explications
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 30);
    if (sentences.length > 1) {
      // Prendre une des dernières phrases qui semble être une définition
      for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 3); i--) {
        const sentence = sentences[i].trim();
        // Vérifier que ce n'est pas une explication d'erreur
        if (!/^(?:à|à la|la|définition de|dans ton vocabulaire|il y a|erreur|faute|tu as écrit|noté que|En effet|Le mot|devrait être)/i.test(sentence)) {
          // Vérifier que ça ressemble à une définition (contient le mot ou des mots descriptifs)
          if (sentence.length > 30 && sentence.length < 1000) {
            console.log('✅ [ActionParser] Définition extraite (dernière phrase):', sentence.substring(0, 150));
            return sentence;
          }
        }
      }
    }
    
    // 7. Si on a la définition originale et qu'on a détecté une correction de mot, appliquer la correction
    if (originalDefinition) {
      // Chercher tous les patterns de correction: "X devrait être Y"
      const allCorrections = Array.from(response.matchAll(/(?:le\s+)?mot\s+["']([^"']+)["']\s+(?:devrait|doit)\s+être\s+["']([^"']+)["']/gi));
      if (allCorrections.length > 0) {
        let corrected = originalDefinition;
        for (const correction of allCorrections) {
          const wrongWord = correction[1].trim();
          const correctWord = correction[2].trim();
          corrected = corrected.replace(new RegExp(`\\b${wrongWord}\\b`, 'gi'), correctWord);
        }
        if (corrected !== originalDefinition) {
          console.log('✅ [ActionParser] Correction(s) appliquée(s) à la définition originale');
          return corrected;
        }
      }
    }
    
    console.warn('⚠️ [ActionParser] Aucune définition valide trouvée');
    return null;
  }
  
  /**
   * Extrait le nouveau contenu proposé pour une note
   */
  private static extractNewContent(response: string, noteTitle: string): string | null {
    const patterns = [
      new RegExp(`(?:voici|contenu révisé|nouveau contenu|version corrigée)[:;\\s]+([^\\n]{20,})`, 'i'),
      new RegExp(`["']${noteTitle}["'][\\s:]+([^\\n]{20,})`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1] && match[1].length > 20) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Améliore le prompt pour que l'IA structure ses réponses avec des actions
   */
  static enhancePromptForActions(basePrompt: string): string {
    return `${basePrompt}

IMPORTANT - Si tu proposes une correction ou modification :
- Mentionne clairement le mot ou la note à modifier entre guillemets
- Fournis la version corrigée/améliorée de manière claire
- Utilise des phrases comme "Voici la version corrigée :" ou "La nouvelle définition serait :"
- Assure-toi que la correction est complète et directement utilisable`;
  }
}

