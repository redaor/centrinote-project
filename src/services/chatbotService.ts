/**
 * Service de Chatbot pour Centrinote
 * Gère les interactions avec le chatbot et l'escalation vers email
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotRequest {
  message: string;
  userId: string;
  userEmail: string;
  userName: string;
  conversationHistory: ChatMessage[];
}

interface ChatbotResponse {
  message: string;
  requiresEscalation: boolean;
  confidence?: number;
  ticketId?: string;
  emailDraft?: string;
  showConfirmationButtons?: boolean;
}

interface EscalationRequest {
  userId: string;
  userEmail: string;
  userName: string;
  conversationHistory: any[];
  ticketId?: string;
}

interface EscalationResponse {
  ticketId: string;
  status: 'created' | 'sent';
  estimatedResponseTime: string;
}

class ChatbotService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  }

  /**
   * Envoie un message au chatbot et récupère la réponse
   */
  async sendMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/chatbot-handler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          action: 'chat',
          ...request
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur chatbot service:', response.status, errorText);
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur chatbot service:', error);
      // En cas d'erreur, proposer l'escalation
      return {
        message: 'Je rencontre une difficulté technique. Souhaitez-vous que je vous aide à rédiger un email à notre équipe de support ?',
        requiresEscalation: true,
        confidence: 0
      };
    }
  }

  /**
   * Escale la conversation vers un email de support
   */
  async escalateToEmail(request: EscalationRequest): Promise<EscalationResponse> {
    try {
      console.log('[chatbotService] 📧 Début de l\'escalation vers email:', {
        userId: request.userId,
        userEmail: request.userEmail,
        userName: request.userName,
        ticketId: request.ticketId,
        conversationLength: request.conversationHistory?.length || 0
      });

      const response = await fetch(`${this.baseUrl}/functions/v1/chatbot-handler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          action: 'escalate',
          ...request
        })
      });

      console.log('[chatbotService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[chatbotService] ❌ Erreur HTTP:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[chatbotService] ✅ Escalation réussie:', data);
      return data;
    } catch (error) {
      console.error('[chatbotService] ❌ Erreur escalation service:', error);
      throw error;
    }
  }
}

export const chatbotService = new ChatbotService();

