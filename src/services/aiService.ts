/**
 * Service IA utilisant le webhookService existant
 * Envoie vers N8N avec le format attendu
 */

import { webhookService } from './webhookService';

interface AIServiceResponse {
  success: boolean;
  response?: string;
  error?: string;
}

class AIService {
  private readonly timeout = 30000; // 30 secondes

  /**
   * Envoie un message à l'IA via le webhook service
   */
  async sendMessage(userMessage: string, userId?: string): Promise<AIServiceResponse> {
    if (!userMessage.trim()) {
      return {
        success: false,
        error: 'Le message ne peut pas être vide'
      };
    }

    const payload = {
      userId: userId || 'anonymous',
      message: userMessage.trim(),
      context: 'ai_search_chat',
      vocabulary: []
    };

    console.log('📤 Envoi au workflow Discussion IA :', payload);

    try {
      const result = await webhookService.triggerDiscussionWorkflow(payload);
      console.log('📥 Réponse complète N8N :', result);
      console.log('📊 Données brutes reçues :', result.data);
      console.log('📋 Type de données :', typeof result.data);

      // Vérifier si c'est une erreur de workflow N8N
      if (result.data && typeof result.data === 'object' && result.data.message) {
        if (result.data.message.includes('Workflow Webhook Error') || 
            result.data.message.includes('Workflow could not be started')) {
          console.log('❌ Erreur de workflow N8N détectée:', result.data.message);
          return {
            success: false,
            error: `Workflow N8N non démarré. Vérifiez que le workflow est actif dans N8N. Erreur: ${result.data.message}`
          };
        }
      }

      if (result.success && result.data) {
        console.log('✅ Succès confirmé, analyse des données...');
        
        // Cas 1: Réponse texte pur (N8N configuré en mode Text)
        if (typeof result.data === 'string') {
          console.log('📝 Réponse texte pur de N8N:', result.data);
          return {
            success: true,
            response: result.data
          };
        }
        
        // Vérifier si la réponse contient le champ output (format N8N)
        if (typeof result.data === 'object' && result.data !== null && result.data.output) {
          console.log('🎯 Champ output trouvé :', result.data.output);
          return {
            success: true,
            response: result.data.output
          };
        }
        
        // Vérifier si la réponse contient le champ response (format alternatif)
        if (typeof result.data === 'object' && result.data !== null && result.data.response) {
          console.log('🎯 Champ response trouvé :', result.data.response);
          return {
            success: true,
            response: result.data.response
          };
        }
        
        // Fallback pour d'autres formats - afficher tout le contenu
        console.log('🔄 Fallback - conversion en JSON :', result.data);
        return {
          success: true,
          response: JSON.stringify(result.data, null, 2)
        };
      }

      console.log('❌ Échec - pas de données ou succès = false');
      console.log('🔍 Détails de l\'échec :', { success: result.success, hasData: !!result.data, error: result.error });
      
      return {
        success: false,
        error: result.error || `Aucune réponse reçue de l'IA. Debug: success=${result.success}, data=${JSON.stringify(result.data)}`
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi IA:', error);

      let errorMessage = 'Erreur de communication avec l\'IA';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Timeout: L\'IA met trop de temps à répondre';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Impossible de se connecter au service IA';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Teste la connectivité avec le service IA
   */
  async testConnection(userId?: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 Test de connectivité IA démarré...');
      
      // Test direct avec triggerDiscussionWorkflow
      const result = await webhookService.triggerDiscussionWorkflow({
        userId: userId || 'test_user',
        message: 'Test de connectivité IA - ' + new Date().toLocaleString(),
        context: 'connectivity_test',
        vocabulary: []
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log('📊 Résultat du test de connectivité:', result);

      if (result.success) {
        return {
          success: true,
          message: 'Service IA opérationnel - Connexion réussie',
          responseTime
        };
      } else {
        return {
          success: false,
          message: result.message || 'Test de connectivité échoué',
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ Erreur lors du test de connectivité:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du test de connectivité',
        responseTime
      };
    }
  }
}

// Instance singleton
export const aiService = new AIService();