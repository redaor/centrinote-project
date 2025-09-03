/**
 * 🧠 Hook React personnalisé pour CentrinoteAI
 * Intègre l'IA intelligente avec le state management existant
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNotes } from './useNotes';
import { useVocabulary } from './useVocabulary';
import { centrinoteAI } from '../services/CentrinoteAI';

interface AIAnalysis {
  type: 'note' | 'vocabulaire' | 'memoire' | 'general';
  confidence: number;
  confirmation: string;
  contenu: string;
  source?: any;
  alternatives?: Array<{ title: string; id: string; type: string }>;
  suggestions?: string[];
}

interface AIResponse {
  success: boolean;
  analyse: AIAnalysis | null;
  reponse: string | null;
  error?: string;
  raw?: any;
}

interface AIMessage {
  id: string;
  type: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
  analysis?: AIAnalysis;
}

export function useCentrinoteAI() {
  const { state } = useApp();
  const { user } = state;
  const { notes } = useNotes();
  const { vocabulary } = useVocabulary();

  // États du hook
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Références pour optimisation
  const lastRequestRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 🧪 Test initial de connectivité
   */
  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await centrinoteAI.testConnectivite();
        setIsConnected(result.success);
        if (!result.success) {
          setError(result.message || 'Erreur de connectivité IA');
        }
      } catch (err) {
        setIsConnected(false);
        setError('Service IA indisponible');
        console.error('❌ Test connectivité IA échoué:', err);
      }
    };

    testConnection();
  }, []);

  /**
   * 🤖 Envoi de message avec analyse intelligente
   */
  const sendMessage = useCallback(async (userMessage: string): Promise<AIResponse> => {
    // Validation des entrées
    if (!userMessage?.trim()) {
      const errorResponse: AIResponse = {
        success: false,
        analyse: null,
        reponse: null,
        error: 'Message vide'
      };
      return errorResponse;
    }

    // Éviter les requêtes en double
    const messageKey = userMessage.trim().toLowerCase();
    if (lastRequestRef.current === messageKey && isLoading) {
      console.log('⚠️ Requête en double ignorée');
      return {
        success: false,
        analyse: null,
        reponse: null,
        error: 'Requête en cours'
      };
    }

    // Annuler la requête précédente si en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Nouvelle requête
    abortControllerRef.current = new AbortController();
    lastRequestRef.current = messageKey;

    try {
      setIsLoading(true);
      setError(null);

      // Ajouter le message utilisateur
      const userMessageObj: AIMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessageObj]);

      console.log('🚀 CentrinoteAI Hook - Traitement demande:', {
        message: userMessage.substring(0, 50) + '...',
        notesCount: notes.length,
        vocabularyCount: vocabulary.length,
        userId: user?.id
      });

      // Appel du module IA intelligent
      const result = await centrinoteAI.traiterDemande(
        userMessage,
        notes || [],
        vocabulary || []
      );

      console.log('📊 Résultat CentrinoteAI:', {
        success: result.success,
        type: result.analyse?.type,
        confidence: result.analyse?.confidence
      });

      if (result.success && result.reponse) {
        // Message IA réussi
        const aiMessageObj: AIMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: result.reponse,
          timestamp: new Date(),
          analysis: result.analyse || undefined
        };
        
        setMessages(prev => [...prev, aiMessageObj]);
        setIsConnected(true);

        return result;
      } else {
        // Erreur de traitement
        const errorMessage = result.error || 'Aucune réponse de l\'IA';
        
        const errorMessageObj: AIMessage = {
          id: `error-${Date.now()}`,
          type: 'error',
          content: `Erreur: ${errorMessage}`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessageObj]);
        setError(errorMessage);
        setIsConnected(false);

        return result;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur useCentrinoteAI:', err);

      // Message d'erreur
      const errorMessageObj: AIMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Erreur: ${errorMessage}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessageObj]);
      setError(errorMessage);
      setIsConnected(false);

      return {
        success: false,
        analyse: null,
        reponse: null,
        error: errorMessage
      };
      
    } finally {
      setIsLoading(false);
      lastRequestRef.current = '';
      abortControllerRef.current = null;
    }
  }, [notes, vocabulary, user?.id, isLoading]);

  /**
   * 🧪 Test de connectivité manuel
   */
  const testConnection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      const result = await centrinoteAI.testConnectivite();
      setIsConnected(result.success);
      
      if (!result.success) {
        setError(result.message);
      } else {
        setError(null);
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de test';
      setIsConnected(false);
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 🗑️ Effacer l'historique des messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    console.log('🧹 Historique IA effacé');
  }, []);

  /**
   * ⏹️ Annuler la requête en cours
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      console.log('⏹️ Requête IA annulée');
    }
  }, []);

  /**
   * 📊 Statistiques contextuelles
   */
  const getContextStats = useCallback(() => {
    const notesRecentes = notes.filter(note => {
      if (!note.created_at) return false;
      const joursDepuis = (Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return joursDepuis <= 7;
    }).length;

    const vocabFaible = vocabulary.filter(vocab => vocab.mastery < 70).length;

    return {
      totalNotes: notes.length,
      notesRecentes,
      totalVocabulary: vocabulary.length,
      vocabularyToReview: vocabFaible,
      hasContext: notes.length > 0 || vocabulary.length > 0
    };
  }, [notes, vocabulary]);

  /**
   * 🎯 Suggestions basées sur le contexte utilisateur
   */
  const getSuggestions = useCallback(() => {
    const stats = getContextStats();
    const suggestions = [];

    if (stats.notesRecentes > 0) {
      suggestions.push(`Révise tes ${stats.notesRecentes} notes récentes`);
    }

    if (stats.vocabularyToReview > 0) {
      suggestions.push(`Travaille sur ${stats.vocabularyToReview} mots à réviser`);
    }

    if (stats.totalNotes > 5) {
      suggestions.push("Fais-moi un résumé de tes notes importantes");
    }

    if (stats.totalVocabulary > 10) {
      suggestions.push("Quiz-moi sur mon vocabulaire");
    }

    return suggestions;
  }, [getContextStats]);

  // Nettoyage à la désactivation
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // États principaux
    messages,
    isLoading,
    isConnected,
    error,
    
    // Actions principales
    sendMessage,
    testConnection,
    clearMessages,
    cancelRequest,
    
    // Utilitaires contextuels
    getContextStats,
    getSuggestions,
    
    // Statistiques en temps réel
    stats: getContextStats()
  };
}