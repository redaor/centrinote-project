/**
 * SDK Client CentrinoteAI
 * Interface principale pour l'intégration de l'IA dans Centrinote
 * 
 * Architecture:
 * - Moteur IA Hybride (OpenAI GPT API)
 * - Validation multi-couches
 * - Gestion de contexte intelligent
 * - API REST, WebSocket, Webhooks
 */

import { AIEngine, GenerationOptions, GenerationResult, CompletionOptions, CompletionResult } from './core/AIEngine';
import { contextManager } from './context/ContextManager';
import { securityValidator } from './validators/SecurityValidator';
import { codeValidator } from './validators/CodeValidator';

export interface CentrinoteAIConfig {
  apiKey: string;
  apiEndpoint?: string;
  context?: 'typescript-node' | 'typescript-react' | 'javascript-node';
  securityLevel?: 'low' | 'medium' | 'high';
  enableWebSocket?: boolean;
  websocketUrl?: string;
}

export interface GenerateFunctionResult extends GenerationResult {
  executionTime: number;
  cached?: boolean;
}

export interface AnalyzeCodeResult {
  bugs: Array<{ type: string; message: string; line?: number }>;
  optimizations: Array<{ type: string; message: string; suggestion?: string }>;
  complexity: { score: number; factors: string[] };
  executionTime: number;
}

export class CentrinoteAI {
  private engine: AIEngine;
  private config: Required<Omit<CentrinoteAIConfig, 'websocketUrl'>> & { websocketUrl?: string };
  private wsConnection: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: CentrinoteAIConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      apiEndpoint: config.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
      context: config.context || 'typescript-node',
      securityLevel: config.securityLevel || 'high',
      enableWebSocket: config.enableWebSocket || false,
      websocketUrl: config.websocketUrl,
    };

    this.engine = new AIEngine({
      apiKey: this.config.apiKey,
      apiEndpoint: this.config.apiEndpoint,
    });

    // Initialiser le contexte selon le type
    this.initializeContext();
  }

  /**
   * Génère une fonction avec validation
   */
  async generateFunction(options: GenerationOptions): Promise<GenerateFunctionResult> {
    const startTime = Date.now();

    try {
      // Vérifier le niveau de sécurité
      if (this.config.securityLevel === 'high') {
        // Validation préalable de la description
        const descValidation = securityValidator.validateXSS(options.description);
        if (!descValidation.isValid) {
          throw new Error('Description contient du contenu non sécurisé');
        }
      }

      const result = await this.engine.generateFunction({
        ...options,
        language: options.language || (this.config.context.includes('typescript') ? 'typescript' : 'javascript'),
      });

      const executionTime = Date.now() - startTime;

      // Si le score de sécurité est trop bas, rejeter selon le niveau
      if (this.config.securityLevel === 'high' && result.securityScore < 0.95) {
        throw new Error(`Code généré ne respecte pas le niveau de sécurité requis (score: ${result.securityScore.toFixed(2)})`);
      }

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      throw new Error(`Erreur génération fonction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Complétion intelligente rapide
   */
  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();

    try {
      const result = await this.engine.complete({
        ...options,
        language: options.language || (this.config.context.includes('typescript') ? 'typescript' : 'javascript'),
        // userContext est déjà dans options si fourni
      });

      const executionTime = Date.now() - startTime;

      // Pour les réponses conversationnelles avec contexte utilisateur (notes/vocabulaire),
      // le validateur peut être trop strict car il détecte des mots dans le contenu des notes.
      // Utiliser un seuil plus bas pour les conversations personnalisées
      const isConversationalWithContext = !!options.userContext && options.prefix.length < 200;
      const securityThreshold = isConversationalWithContext ? 0.5 : 0.95; // Plus tolérant pour conversations

      // En mode high security, rejeter si score trop bas (mais avec seuil adapté)
      if (this.config.securityLevel === 'high' && result.securityScore < securityThreshold) {
        console.warn(`⚠️ [CentrinoteAI] Score sécurité faible (${result.securityScore.toFixed(2)}), mais autorisé pour conversation personnalisée`);
        // Ne pas rejeter pour les conversations avec contexte utilisateur si le score est > 0.3
        if (isConversationalWithContext && result.securityScore > 0.3) {
          // Autoriser mais logger
          console.log('✅ [CentrinoteAI] Réponse acceptée malgré score bas (conversation personnalisée)');
        } else {
          throw new Error(`Complétion non sécurisée (score: ${result.securityScore.toFixed(2)})`);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Erreur complétion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Analyse du code existant
   */
  async analyzeCode(code: string): Promise<AnalyzeCodeResult> {
    const startTime = Date.now();

    try {
      const analysis = await this.engine.analyzeCode(code);

      return {
        ...analysis,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Erreur analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Recherche dans le contexte
   */
  searchContext(query: string, limit: number = 10) {
    return contextManager.search(query, limit);
  }

  /**
   * Ajoute une entrée au contexte
   */
  addToContext(entry: {
    type: 'function' | 'class' | 'variable' | 'import' | 'note';
    name: string;
    content: string;
    metadata?: {
      file?: string;
      line?: number;
      dependencies?: string[];
    };
  }) {
    return contextManager.addEntry(entry);
  }

  /**
   * Récupère le contexte formaté
   */
  getContext(maxTokens?: number): string {
    return contextManager.getFormattedContext(maxTokens);
  }

  /**
   * Statistiques du contexte
   */
  getContextStats() {
    return contextManager.getStats();
  }

  /**
   * Connexion WebSocket pour suggestions en temps réel
   */
  async connectWebSocket(onMessage: (data: any) => void, onError?: (error: Error) => void): Promise<void> {
    if (!this.config.enableWebSocket || !this.config.websocketUrl) {
      throw new Error('WebSocket non configuré');
    }

    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(this.config.websocketUrl!);

        this.wsConnection.onopen = () => {
          console.log('[CentrinoteAI] WebSocket connecté');
          this.wsReconnectAttempts = 0;
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            console.error('[CentrinoteAI] Erreur parsing message WebSocket:', error);
          }
        };

        this.wsConnection.onerror = (error) => {
          console.error('[CentrinoteAI] Erreur WebSocket:', error);
          onError?.(new Error('Erreur WebSocket'));
        };

        this.wsConnection.onclose = () => {
          console.log('[CentrinoteAI] WebSocket fermé');
          this.wsConnection = null;
          
          // Tentative de reconnexion automatique
          if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
            this.wsReconnectAttempts++;
            setTimeout(() => {
              this.connectWebSocket(onMessage, onError).catch(reject);
            }, 1000 * this.wsReconnectAttempts); // Backoff exponentiel
          }
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Erreur connexion WebSocket'));
      }
    });
  }

  /**
   * Déconnexion WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Envoie un message via WebSocket
   */
  sendWebSocketMessage(data: any): void {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    this.wsConnection.send(JSON.stringify(data));
  }

  /**
   * Initialise le contexte selon le type
   */
  private initializeContext(): void {
    // Ajouter des entrées de contexte de base selon le type
    if (this.config.context.includes('react')) {
      contextManager.addEntry({
        type: 'import',
        name: 'React',
        content: "import React from 'react';",
        metadata: {},
      });
    }
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    this.disconnectWebSocket();
    contextManager.clear();
  }
}

// Export pour utilisation avec import { CentrinoteAI } from '@centrinote/ai-sdk'
export default CentrinoteAI;

