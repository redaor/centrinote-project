/**
 * Hook React pour CentrinoteAI
 * Intègre le SDK CentrinoteAI avec React
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { CentrinoteAI, GenerateFunctionResult, CompletionResult, AnalyzeCodeResult } from '../services/ai/CentrinoteAI';
import { useApp } from '../contexts/AppContext';
import { userDataLoader } from '../services/ai/userData/UserDataLoader';

export interface UseCentrinoteAIOptions {
  autoConnect?: boolean;
  enableWebSocket?: boolean;
}

export interface UseCentrinoteAIReturn {
  // État
  isReady: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions principales
  generateFunction: (options: {
    description: string;
    parameters?: Array<{ name: string; type: string }>;
    returnType?: string;
    includeTests?: boolean;
  }) => Promise<GenerateFunctionResult>;
  complete: (prefix: string, maxTokens?: number) => Promise<CompletionResult>;
  analyzeCode: (code: string) => Promise<AnalyzeCodeResult>;
  
  // Contexte
  searchContext: (query: string, limit?: number) => any[];
  addToContext: (entry: {
    type: 'function' | 'class' | 'variable' | 'import' | 'note';
    name: string;
    content: string;
    metadata?: { file?: string; line?: number; dependencies?: string[] };
  }) => string;
  getContext: (maxTokens?: number) => string;
  getContextStats: () => any;
  
  // WebSocket
  connectWebSocket: (onMessage: (data: any) => void) => Promise<void>;
  disconnectWebSocket: () => void;
  sendWebSocketMessage: (data: any) => void;
  
  // Utilitaires
  clearError: () => void;
}

export function useCentrinoteAI(options: UseCentrinoteAIOptions = {}): UseCentrinoteAIReturn {
  const { state } = useApp();
  const { user } = state;
  
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const aiInstanceRef = useRef<CentrinoteAI | null>(null);
  const wsMessageHandlerRef = useRef<((data: any) => void) | null>(null);

  // Initialisation de l'instance CentrinoteAI - une seule fois au montage
  const initialized = useRef(false);
  
  useEffect(() => {
    // Éviter la réinitialisation multiple
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    // ⚠️ ATTENTION : Ce hook utilise l'architecture legacy (appel OpenAI direct)
    // Pour une architecture sécurisée, utilisez useAIChatEdgeFunction à la place
    // qui appelle l'Edge Function ai-chat (pas d'exposition de clé API)

    // Utiliser une clé factice pour initialiser (ne sera pas utilisée si Edge Function est préférée)
    const apiKey = 'dummy-key-use-edge-function-instead';

    console.warn('⚠️ [useCentrinoteAI] Architecture legacy - Préférez useAIChatEdgeFunction pour sécurité');

    try {
      console.log('🔧 [useCentrinoteAI] Initialisation CentrinoteAI...');
      aiInstanceRef.current = new CentrinoteAI({
        apiKey,
        context: 'typescript-react',
        securityLevel: 'high',
        enableWebSocket: options.enableWebSocket || false,
      });

      setIsReady(true);
      setError(null);
      console.log('✅ [useCentrinoteAI] CentrinoteAI initialisé avec succès');

      // Connexion WebSocket automatique si activé
      if (options.autoConnect && options.enableWebSocket) {
        connectWebSocketInternal((data) => {
          wsMessageHandlerRef.current?.(data);
        }).catch((err) => {
          console.error('[useCentrinoteAI] Erreur connexion WebSocket:', err);
        });
      }
    } catch (err) {
      console.error('❌ [useCentrinoteAI] Erreur initialisation:', err);
      setError(err instanceof Error ? err.message : 'Erreur initialisation CentrinoteAI');
      setIsReady(false);
      initialized.current = false; // Permettre une nouvelle tentative
    }

    return () => {
      // Nettoyage seulement si le composant est complètement démonté
      console.log('🧹 [useCentrinoteAI] Nettoyage...');
      if (aiInstanceRef.current) {
        aiInstanceRef.current.cleanup();
        aiInstanceRef.current = null;
      }
      initialized.current = false; // Réinitialiser pour permettre une nouvelle initialisation
    };
  }, [connectWebSocketInternal, options.autoConnect, options.enableWebSocket]);

  const generateFunction = useCallback(async (options: {
    description: string;
    parameters?: Array<{ name: string; type: string }>;
    returnType?: string;
    includeTests?: boolean;
  }): Promise<GenerateFunctionResult> => {
    if (!aiInstanceRef.current || !isReady) {
      throw new Error('CentrinoteAI non initialisé');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiInstanceRef.current.generateFunction({
        description: options.description,
        parameters: options.parameters,
        returnType: options.returnType,
        includeTests: options.includeTests,
        language: 'typescript',
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur génération fonction';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const complete = useCallback(async (prefix: string, maxTokens?: number): Promise<CompletionResult> => {
    if (!aiInstanceRef.current || !isReady) {
      throw new Error('CentrinoteAI non initialisé');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 [useCentrinoteAI] Début complétion, chargement contexte utilisateur...');
      
      // Charger les données utilisateur pour personnaliser le contexte (avec timeout)
      let userContext: string | undefined;
      if (user?.id) {
        try {
          console.log('📥 [useCentrinoteAI] Chargement données utilisateur pour:', user.id);
          
          // Timeout de 5 secondes pour le chargement des données
          const loadUserDataPromise = userDataLoader.loadUserData(user.id);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout chargement données utilisateur')), 5000)
          );
          
          const userData = await Promise.race([loadUserDataPromise, timeoutPromise]) as any;
          
          console.log('✅ [useCentrinoteAI] Données utilisateur chargées:', {
            notes: userData.notes?.length || 0,
            vocabulary: userData.vocabulary?.length || 0,
          });
          
          const formattedContext = userDataLoader.formatUserContext(userData, 3000);
          // Combiner les sections pertinentes
          userContext = [
            formattedContext.notesSummary,
            formattedContext.vocabularySummary,
            formattedContext.recentNotes,
            formattedContext.keyVocabulary,
          ].filter(Boolean).join('\n\n');
          
          console.log('📝 [useCentrinoteAI] Contexte formaté:', {
            hasNotes: !!formattedContext.notesSummary,
            hasVocabulary: !!formattedContext.vocabularySummary,
            totalTokens: formattedContext.totalTokens,
            contextLength: userContext?.length || 0,
          });
        } catch (err) {
          console.warn('⚠️ [useCentrinoteAI] Erreur chargement données utilisateur, continuation sans contexte personnalisé:', err);
          // Continuer sans contexte personnalisé - ne pas bloquer l'IA
        }
      } else {
        console.log('ℹ️ [useCentrinoteAI] Pas d\'utilisateur connecté, pas de contexte personnalisé');
      }

      console.log('🚀 [useCentrinoteAI] Appel API OpenAI avec contexte personnalisé:', {
        prefixLength: prefix.length,
        hasUserContext: !!userContext,
        maxTokens,
      });

      const result = await aiInstanceRef.current.complete({
        prefix,
        maxTokens,
        language: 'typescript',
        userContext, // Passer le contexte personnalisé
      });

      console.log('✅ [useCentrinoteAI] Réponse reçue:', {
        hasSuggestion: !!result.suggestion,
        suggestionLength: result.suggestion?.length || 0,
        isValid: result.isValid,
        securityScore: result.securityScore,
      });

      return result;
    } catch (err) {
      console.error('❌ [useCentrinoteAI] Erreur complétion:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur complétion';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isReady, user?.id]);

  const analyzeCode = useCallback(async (code: string): Promise<AnalyzeCodeResult> => {
    if (!aiInstanceRef.current || !isReady) {
      throw new Error('CentrinoteAI non initialisé');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiInstanceRef.current.analyzeCode(code);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur analyse';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const searchContext = useCallback((query: string, limit?: number) => {
    if (!aiInstanceRef.current || !isReady) {
      return [];
    }

    return aiInstanceRef.current.searchContext(query, limit);
  }, [isReady]);

  const addToContext = useCallback((entry: {
    type: 'function' | 'class' | 'variable' | 'import' | 'note';
    name: string;
    content: string;
    metadata?: { file?: string; line?: number; dependencies?: string[] };
  }) => {
    if (!aiInstanceRef.current || !isReady) {
      throw new Error('CentrinoteAI non initialisé');
    }

    return aiInstanceRef.current.addToContext(entry);
  }, [isReady]);

  const getContext = useCallback((maxTokens?: number) => {
    if (!aiInstanceRef.current || !isReady) {
      return '';
    }

    return aiInstanceRef.current.getContext(maxTokens);
  }, [isReady]);

  const getContextStats = useCallback(() => {
    if (!aiInstanceRef.current || !isReady) {
      return { totalEntries: 0, currentTokens: 0, maxTokens: 50000, utilization: 0 };
    }

    return aiInstanceRef.current.getContextStats();
  }, [isReady]);

  const connectWebSocketInternal = useCallback(async (onMessage: (data: any) => void): Promise<void> => {
    if (!aiInstanceRef.current || !isReady) {
      throw new Error('CentrinoteAI non initialisé');
    }

    wsMessageHandlerRef.current = onMessage;

    await aiInstanceRef.current.connectWebSocket(
      onMessage,
      (err) => {
        setError(`Erreur WebSocket: ${err.message}`);
        setIsConnected(false);
      }
    );

    setIsConnected(true);
  }, [isReady]);

  const connectWebSocket = useCallback(async (onMessage: (data: any) => void): Promise<void> => {
    return connectWebSocketInternal(onMessage);
  }, [connectWebSocketInternal]);

  const disconnectWebSocket = useCallback(() => {
    if (aiInstanceRef.current) {
      aiInstanceRef.current.disconnectWebSocket();
      setIsConnected(false);
      wsMessageHandlerRef.current = null;
    }
  }, []);

  const sendWebSocketMessage = useCallback((data: any) => {
    if (!aiInstanceRef.current || !isConnected) {
      throw new Error('WebSocket non connecté');
    }

    aiInstanceRef.current.sendWebSocketMessage(data);
  }, [isConnected]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    isReady,
    isConnected,
    isLoading,
    error,
    
    // Actions
    generateFunction,
    complete,
    analyzeCode,
    
    // Contexte
    searchContext,
    addToContext,
    getContext,
    getContextStats,
    
    // WebSocket
    connectWebSocket,
    disconnectWebSocket,
    sendWebSocketMessage,
    
    // Utilitaires
    clearError,
  };
}

