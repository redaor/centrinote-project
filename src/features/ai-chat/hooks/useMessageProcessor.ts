/**
 * Hook: useMessageProcessor
 *
 * Traite et transforme les réponses de l'IA :
 * - Nettoie le formatage markdown (**, ```, etc.)
 * - Détecte et extrait les blocs de code
 * - Détecte le code inline et le transforme en texte conversationnel
 * - Segmente les longues réponses pour un affichage progressif
 *
 * Responsabilités :
 * - Parsing et nettoyage des réponses IA
 * - Détection de code vs texte naturel
 * - Segmentation des messages longs
 * - Transformation du code en messages d'aide (mode chat)
 *
 * @example
 * const processor = useMessageProcessor();
 * const result = await processor.processMessage({
 *   rawContent: aiResponse,
 *   mode: 'chat',
 *   problemType: 'general'
 * });
 * // result.processedContent, result.messageType, result.shouldSegment
 */

import { useCallback } from 'react';
import { chatSegmentationService } from '../../../services/chatSegmentationService';
import type { ChatSegment } from '../../../hooks/useChatSegmentation';

/**
 * Paramètres pour le traitement d'un message
 */
interface ProcessMessageParams {
  rawContent: string;
  mode: 'chat' | 'analyze';
  problemType?: string;
}

/**
 * Résultat du traitement d'un message
 */
interface ProcessMessageResult {
  processedContent: string;
  messageType: 'ai' | 'code';
  shouldSegment: boolean;
  segments?: ChatSegment[];
}

/**
 * Hook useMessageProcessor
 */
export function useMessageProcessor() {
  // ═══════════════════════════════════════════════════════════════
  // Fonction utilitaire : Nettoyer les marqueurs de gras
  // ═══════════════════════════════════════════════════════════════
  const cleanBoldMarkers = useCallback((text: string): string => {
    if (!text) return text;
    let cleaned = text;
    // Supprimer les astérisques doubles utilisés pour le gras (**texte**)
    cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*\*([^*\n]+?)\*\*/g, '$1');
    // Nettoyer les sauts de ligne multiples
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Fonction principale : Traiter un message IA
  // ═══════════════════════════════════════════════════════════════
  const processMessage = useCallback(async (params: ProcessMessageParams): Promise<ProcessMessageResult> => {
    const { rawContent, mode, problemType = 'general' } = params;

    // Nettoyer les astérisques de gras AVANT tout autre traitement
    let processedContent = cleanBoldMarkers(rawContent.trim());
    let messageType: 'ai' | 'code' = 'ai';

    // ─────────────────────────────────────────────────────────────
    // Mode CHAT : Traitement du texte naturel (pas de code)
    // ─────────────────────────────────────────────────────────────
    if (mode === 'chat') {
      // Détecter les blocs de code markdown (```language ... ```)
      const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
      const hasCodeBlock = codeBlockRegex.test(processedContent);

      if (hasCodeBlock) {
        const matches = Array.from(processedContent.matchAll(codeBlockRegex));

        // Si c'est un seul bloc de code, extraire le contenu
        if (matches.length === 1) {
          const codeBlock = matches[0][2].trim(); // Le contenu du code

          // Détecter si c'est vraiment du code (fonctions, déclarations, etc.)
          const isRealCode = codeBlock.match(/^(const|let|var|function|export|class|interface|type|enum|async|import|export)\s+|^\w+\s*\([^)]*\)\s*[:{]\s*$|^\w+\s*\([^)]*\)\s*:\s*\w+\s*[{;]|^\w+\s*\([^)]*:\s*\w+\)/);

          if (isRealCode) {
            // C'est vraiment du code généré par erreur, demander une reformulation
            processedContent = `Je peux t'aider ! Cependant, j'ai généré du code alors que tu étais en mode conversation. Peux-tu reformuler ta question de manière plus explicite ? Par exemple, au lieu de "corrige", dis-moi ce que tu veux corriger exactement.`;
            messageType = 'ai';
            console.log('⚠️ [useMessageProcessor] Code détecté en mode chat, demande de reformulation');
          } else if (codeBlock.includes('"') || codeBlock.includes("'")) {
            // Extraire le texte entre guillemets
            const textMatches = codeBlock.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g);
            const allTexts = Array.from(textMatches).map(m => m[0].slice(1, -1));

            if (allTexts.length > 0 && allTexts[0].length > 5) {
              const longestText = allTexts.reduce((a, b) => a.length > b.length ? a : b);
              processedContent = longestText;
              messageType = 'ai';
              console.log('📝 [useMessageProcessor] Texte extrait du bloc de code:', processedContent);
            } else {
              // Pas de texte, utiliser le contenu directement
              processedContent = codeBlock;
              messageType = 'ai';
            }
          } else {
            // Pas de guillemets, utiliser le contenu directement comme texte
            processedContent = codeBlock;
            messageType = 'ai';
            console.log('📝 [useMessageProcessor] Bloc traité comme texte');
          }
        } else {
          // Plusieurs blocs, garder le format mais enlever les backticks
          processedContent = processedContent.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
          messageType = 'ai';
        }
      } else {
        // Pas de bloc de code, mais vérifier si c'est du code inline (fonction, déclaration, etc.)
        // Détecter aussi les fragments de code comme "await getLastNote()", "? await", etc.
        const codePatterns = [
          /^(const|let|var|function|export|class|interface|async|import|export)\s+/,
          /^\w+\s*\([^)]*\)\s*[:{]\s*$/,
          /^\w+\s*\([^)]*\)\s*:\s*\w+\s*[{;]/,
          /^\w+\s*\([^)]*:\s*\w+\)/,
          /\?.*await.*:/,  // Ternary avec await
          /await\s+\w+\s*\([^)]*\)/,  // await function()
          /getLastNote|getVocabulary|getNotes/,  // Noms de fonctions spécifiques
        ];

        const containsCode = codePatterns.some(pattern => pattern.test(processedContent));

        if (containsCode) {
          // C'est du code, transformer en message d'aide
          processedContent = `Je comprends ta question. Cependant, je ne peux pas exécuter de code. Peux-tu reformuler ta demande de manière conversationnelle ? Par exemple, au lieu de code, dis-moi simplement ce que tu veux savoir ou ce dont tu as besoin.`;
          messageType = 'ai';
          console.log('⚠️ [useMessageProcessor] Code inline détecté, conversion en texte');
        }
      }

      // Nettoyage final : enlever tous les backticks restants et fragments de code
      processedContent = processedContent
        .replace(/```[\w]*\n?/g, '')
        .replace(/```/g, '')
        .replace(/\?\s*await\s+[^:]+:\s*null/g, '') // Nettoyer les ternaires avec await
        .replace(/await\s+\w+\s*\([^)]*\)/g, '') // Nettoyer les await function()
        .trim();

      // Si après nettoyage le contenu est vide ou très court, utiliser un message par défaut
      if (processedContent.length < 10) {
        processedContent = `Je n'ai pas pu générer une réponse valide. Peux-tu reformuler ta question ?`;
      }
    } else {
      // Mode analyse : garder le code tel quel
      messageType = 'code';
    }

    console.log('✅ [useMessageProcessor] Contenu traité:', processedContent.substring(0, 50), 'type:', messageType, 'length:', processedContent.length);

    // ─────────────────────────────────────────────────────────────
    // Segmentation : Si le message est long (> 200 chars)
    // ─────────────────────────────────────────────────────────────
    const shouldSegment = processedContent.length > 200;
    let segments: ChatSegment[] | undefined;

    if (shouldSegment) {
      console.log('📦 [useMessageProcessor] Message long détecté, segmentation en cours...');
      // Segmenter la réponse complète
      segments = chatSegmentationService.segmentResponse(processedContent, problemType);
      console.log('📦 [useMessageProcessor] Segments générés:', segments.length);
    }

    return {
      processedContent,
      messageType,
      shouldSegment,
      segments,
    };
  }, [cleanBoldMarkers]);

  // ═══════════════════════════════════════════════════════════════
  // Retour du hook
  // ═══════════════════════════════════════════════════════════════
  return {
    processMessage,
    cleanBoldMarkers,
  };
}
