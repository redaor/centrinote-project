import { User } from '../types';
import { supabase } from '../lib/supabase';

// URLs des webhooks n8n - Lecture depuis .env avec fallbacks
const DEFAULT_N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886297.hstgr.cloud/webhook/fb90cf61-7012-43fd-85e8-2cbc0f9282c7';
const DEFAULT_N8N_DISCUSSION_URL = import.meta.env.VITE_N8N_DISCUSSION_URL || 'https://n8n.srv886297.hstgr.cloud/webhook/fb90cf61-7012-43fd-85e8-2cbc0f9282c7';
const DEFAULT_N8N_AUTOMATION_URL = import.meta.env.VITE_N8N_AUTOMATION_URL || 'https://n8n.srv886297.hstgr.cloud/webhook/a9493e88-d781-4dc7-a849-b1ba96da6b03';


interface WebhookResponse {
  success: boolean;
  message: string;
  data?: any;
  statusCode?: number;
  diagnostics?: {
    url: string;
    timestamp: string;
    responseTime: number;
    headers?: Record<string, string>;
    errorType?: string;
    fallbackUsed?: boolean;
    testType?: string;
    fallbackAttempted?: boolean;
  };
}

class WebhookService {
  private webhookUrl: string = DEFAULT_N8N_WEBHOOK_URL;
  private discussionUrl: string = DEFAULT_N8N_DISCUSSION_URL;
  private automationUrl: string = DEFAULT_N8N_AUTOMATION_URL;
  private configLoaded: boolean = false;

  /**
   * Charge l'URL du webhook depuis la configuration Supabase
   */
  async loadWebhookConfig(): Promise<void> {
    if (this.configLoaded) return;

    try {
      console.log('🔄 Chargement de la configuration webhook depuis Supabase...');
      
      // Charger toutes les configurations d'URL
      const { data, error } = await supabase
        .from('config')
        .select('key, value')
        .in('key', ['webhook_url', 'discussion_webhook_url', 'automation_webhook_url']);

      if (error) {
        console.warn('⚠️ Erreur lors du chargement de la config webhook (table config peut-être manquante):', error);
        console.log('📌 Utilisation des URLs par défaut');
        return;
      }

      // Appliquer les URLs trouvées
      data?.forEach(config => {
        switch(config.key) {
          case 'webhook_url':
            this.webhookUrl = config.value;
            break;
          case 'discussion_webhook_url':
            this.discussionUrl = config.value;
            break;
          case 'automation_webhook_url':
            this.automationUrl = config.value;
            break;
        }
      });

      console.log('✅ URLs webhook chargées:', {
        main: this.webhookUrl,
        discussion: this.discussionUrl,
        automation: this.automationUrl
      });
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement de la configuration webhook:', error);
      console.log('📌 Utilisation des URLs par défaut');
    } finally {
      this.configLoaded = true;
    }
  }

  /**
   * Déclenche le workflow de discussion IA
   */
  async triggerDiscussionWorkflow(payload: {
    userId: string;
    message: string;
    context?: string;
    vocabulary?: any[];
  }): Promise<WebhookResponse> {
    await this.loadWebhookConfig();
    
    const startTime = Date.now();
    
    try {
      console.log('🤖 Déclenchement du workflow Discussion IA...');
      console.log('🔗 URL utilisée:', this.discussionUrl);
      console.log('📦 Payload envoyé:', JSON.stringify(payload, null, 2));
      console.log('🌐 Origin:', window.location.origin);
      console.log('⏰ Timestamp début:', new Date().toISOString());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(this.discussionUrl, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Centrinote-Discussion/1.0',
          'Origin': window.location.origin,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          user_id: payload.userId,
          message: payload.message,
          context: payload.context || 'vocabulary_learning',
          vocabulary_items: payload.vocabulary || [],
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      console.log('📊 Réponse Discussion IA:', {
        status: response.status,
        ok: response.ok,
        responseTime: responseTime + 'ms'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : { message: 'Réponse vide' };
      } catch (e) {
        data = { message: 'Réponse reçue mais non parsable' };
      }
      
      return {
        success: true,
        message: 'Discussion IA déclenchée avec succès',
        data,
        statusCode: response.status,
        diagnostics: {
          url: this.discussionUrl,
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    } catch (error) {
      console.error('❌ Erreur workflow Discussion IA - Détails complets:', {
        error: error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
        errorStack: error instanceof Error ? error.stack : undefined,
        url: this.discussionUrl,
        payload: payload,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

      // Tentative de fallback avec une approche différente
      console.log('🔄 Tentative de fallback...');
      try {
        const fallbackResult = await this.fallbackDiscussionRequest(payload);
        if (fallbackResult.success) {
          console.log('✅ Fallback réussi!');
          return fallbackResult;
        }
      } catch (fallbackError) {
        console.error('❌ Échec du fallback:', fallbackError);
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur workflow discussion',
        diagnostics: {
          url: this.discussionUrl,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          fallbackAttempted: true
        }
      };
    }
  }

  /**
   * Déclenche le workflow d'automatisation (traitement vocabulaire)
   */
  async triggerAutomationWorkflow(payload: {
    userId: string;
    vocabularyItems?: any[];
    action?: string;
  }): Promise<WebhookResponse> {
    await this.loadWebhookConfig();
    
    const startTime = Date.now();
    
    try {
      console.log('⚙️ Déclenchement du workflow Automatisation...');
      console.log('🔗 URL utilisée:', this.automationUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(this.automationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Automation/1.0'
        },
        body: JSON.stringify({
          user_id: payload.userId,
          vocabulary_items: payload.vocabularyItems || [],
          action: payload.action || 'process_vocabulary',
          callback_url: `${window.location.origin}/api/n8n-callback`,
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      console.log('📊 Réponse Automatisation:', {
        status: response.status,
        ok: response.ok,
        responseTime: responseTime + 'ms'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : { message: 'Réponse vide' };
      } catch (e) {
        data = { message: 'Réponse reçue mais non parsable' };
      }
      
      return {
        success: true,
        message: 'Automatisation déclenchée avec succès',
        data,
        statusCode: response.status,
        diagnostics: {
          url: this.automationUrl,
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    } catch (error) {
      console.error('❌ Erreur workflow Automatisation:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur workflow automatisation',
        diagnostics: {
          url: this.automationUrl,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Teste la connectivité vers l'instance N8N
   */
  async testN8NConnectivity(): Promise<WebhookResponse> {
    await this.loadWebhookConfig();
    
    const startTime = Date.now();
    
    try {
      const webhookUrl = this.getWebhookUrl();
      console.log('🔍 Test de connectivité N8N vers:', webhookUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Webhook-Test/1.0'
        },
        body: JSON.stringify({
          test: true,
          source: 'centrinote_connectivity_test',
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      const diagnostics = {
        url: webhookUrl,
        timestamp: new Date().toISOString(),
        responseTime,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      console.log('📊 Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime: responseTime + 'ms'
      });
      
      if (response.ok) {
        let responseData = null;
        try {
          const responseText = await response.text();
          if (responseText) {
            responseData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.log('ℹ️ Réponse non-JSON reçue (normal pour certains webhooks)');
        }
        
        return {
          success: true,
          message: `Instance N8N accessible et répond correctement (${response.status})`,
          statusCode: response.status,
          diagnostics,
          data: responseData
        };
      } else {
        let errorContent = '';
        try {
          errorContent = await response.text();
        } catch (readError) {
          console.warn('Impossible de lire le contenu de l\'erreur:', readError);
        }
        
        return {
          success: false,
          message: `Instance N8N retourne une erreur - HTTP ${response.status}: ${response.statusText}${errorContent ? ` - ${errorContent}` : ''}`,
          statusCode: response.status,
          diagnostics,
          data: errorContent ? { error: errorContent } : undefined
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.error('❌ Erreur de connectivité N8N détaillée:', {
        error: error,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        url: this.getWebhookUrl()
      });
      
      let errorMessage = 'Erreur de connexion à N8N';
      
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Timeout: L\'instance N8N met trop de temps à répondre (>10s). Vérifiez que le service est actif.';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erreur de réseau: Impossible de joindre l\'instance N8N. Vérifiez que l\'URL est correcte et que le service est accessible.';
      } else if (error instanceof Error && error.message.includes('CORS')) {
        errorMessage = 'Erreur CORS: L\'instance N8N bloque les requêtes depuis votre domaine. Vérifiez la configuration CORS de N8N.';
      } else if (error instanceof Error) {
        errorMessage = `Erreur de connexion: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage,
        diagnostics: {
          url: this.getWebhookUrl(),
          timestamp: new Date().toISOString(),
          responseTime,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Teste tous les webhooks
   */
  async testAllWebhooks(): Promise<{
    main: WebhookResponse;
    discussion: WebhookResponse;
    automation: WebhookResponse;
  }> {
    await this.loadWebhookConfig();
    
    console.log('🧪 Test de tous les webhooks...');
    
    const [mainResult, discussionResult, automationResult] = await Promise.all([
      this.testConnection(),
      this.triggerDiscussionWorkflow({
        userId: 'test_user',
        message: 'Test de connexion',
        context: 'test'
      }),
      this.triggerAutomationWorkflow({
        userId: 'test_user',
        action: 'test_connection'
      })
    ]);
    
    return {
      main: mainResult,
      discussion: discussionResult,
      automation: automationResult
    };
  }

  /**
   * Envoie une requête webhook vers N8N
   * @param action Action à effectuer
   * @param payload Données à envoyer
   * @returns Réponse du webhook
   */
  async sendWebhookRequest(action: string, payload: Record<string, any>): Promise<WebhookResponse> {
    await this.loadWebhookConfig();
    
    const startTime = Date.now();
    const webhookUrl = this.getWebhookUrl();

    if (!webhookUrl) {
      return {
        success: false,
        message: 'URL du webhook N8N non configurée',
        statusCode: 0
      };
    }

    try {
      console.log(`🔄 Envoi d'une requête webhook N8N (${action})...`);
      console.log('🔗 URL utilisée:', webhookUrl);
      
      const data = action === 'ai_test' ? payload : {
        body: {
          action: payload.action || this.getActionFromType(action),
          userId: payload.userId || 'unknown',
          timestamp: payload.timestamp || new Date().toISOString(),
          ...payload
        }
      };
      
      console.log('Payload formaté pour n8n:', data);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Webhook/1.0',
          'X-Centrinote-Action': action
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      const diagnostics = {
        url: webhookUrl,
        timestamp: new Date().toISOString(),
        responseTime,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      console.log('📊 Réponse webhook reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime: responseTime + 'ms'
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.log('📄 Contenu de l\'erreur:', errorText);
        } catch (e) {
          errorText = 'Impossible de lire la réponse d\'erreur';
        }
        
        let errorMessage = '';
        switch (response.status) {
          case 404:
            errorMessage = 'Webhook N8N non trouvé (404). Vérifiez que le workflow est actif et que l\'URL est correcte.';
            break;
          case 500:
            errorMessage = 'Erreur interne du serveur N8N (500). Le workflow pourrait avoir un problème.';
            break;
          case 503:
            errorMessage = 'Service N8N indisponible (503). L\'instance pourrait être en maintenance.';
            break;
          case 405:
            errorMessage = 'Méthode non autorisée (405). Le webhook n\'accepte peut-être que certaines méthodes HTTP.';
            break;
          case 403:
            errorMessage = 'Accès interdit (403). Vérifiez les permissions du webhook.';
            break;
          default:
            errorMessage = `Erreur HTTP ${response.status}: ${errorText || 'Erreur inconnue'}`;
        }
        
        return {
          success: false,
          message: errorMessage,
          statusCode: response.status,
          diagnostics,
          data: errorText ? { error: errorText } : undefined
        };
      }
      
      let responseData;
      try {
        const responseText = await response.text();
        console.log('📄 Réponse brute:', responseText);
        
        if (responseText) {
          try {
            responseData = JSON.parse(responseText);
            console.log('✅ Réponse JSON parsée:', responseData);
          } catch (jsonError) {
            console.log('📝 Réponse texte pur détectée:', responseText);
            responseData = responseText;
          }
        } else {
          responseData = { message: 'Réponse vide mais succès HTTP' };
        }
      } catch (e) {
        console.log('ℹ️ Erreur lors de la lecture de la réponse');
        responseData = { message: 'Erreur lors de la lecture de la réponse' };
      }
      
      console.log('✅ Réponse du webhook N8N:', responseData);
      
      return {
        success: true,
        message: 'Webhook N8N déclenché avec succès',
        statusCode: response.status,
        data: responseData,
        diagnostics
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.error('❌ Erreur lors de l\'envoi du webhook:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi du webhook';
      
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Timeout: Le webhook N8N met trop de temps à répondre (>15s)';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erreur de réseau: Impossible de joindre le webhook N8N';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
        diagnostics: {
          url: webhookUrl,
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    }
  }

  /**
   * Teste la connexion au webhook N8N avec un payload de test
   * @returns Réponse du webhook
   */
  async testConnection(): Promise<WebhookResponse> {
    console.log('🧪 Test de connexion webhook N8N avec payload de test');
    return this.sendWebhookRequest('test_connection', {
      action: 'test_connection',
      test: true,
      source: 'centrinote_test_connection',
      timestamp: new Date().toISOString(),
      userId: 'test_user'
    });
  }
  
  /**
   * Déclenche une automatisation via le webhook n8n
   * @param automation Automatisation à déclencher
   * @param user Utilisateur actuel
   * @returns Réponse du webhook
   */
  async triggerAutomation(automation: any, user: User | null): Promise<WebhookResponse> {
    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non authentifié'
      };
    }
    
    const payload = {
      action: 'test_automation',
      name: automation.name,
      trigger_type: automation.trigger_type,
      action_type: automation.action_type,
      userId: user.id,
      note_title: automation.trigger_type === 'note_created' ? 'Titre de la note de test' : undefined,
      timestamp: new Date().toISOString(),
      ...automation.action_config
    };
    
    console.log('Envoi de l\'automatisation à n8n:', payload);
    return this.sendWebhookRequest(automation.action_type, payload);
  }

  /**
   * Supprime une automatisation via le webhook n8n
   * @param automationId ID de l'automatisation à supprimer
   * @param user Utilisateur actuel
   * @returns Réponse du webhook
   */
  async deleteAutomation(automationId: string, user: User | null): Promise<WebhookResponse> {
    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non authentifié'
      };
    }

    try {
      console.log('🗑️ Suppression de l\'automatisation via N8N:', automationId);
      
      const payload = {
        action: 'delete_automation',
        automationId: automationId,
        userId: user.id,
        timestamp: new Date().toISOString()
      };
      
      const result = await this.sendWebhookRequest('delete_automation', payload);
      
      if (result.success) {
        console.log('✅ Automatisation supprimée avec succès via N8N');
      } else {
        console.warn('⚠️ Erreur lors de la suppression via N8N:', result.message);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'automatisation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression'
      };
    }
  }

  /**
   * Met à jour l'URL du webhook
   * @param newUrl Nouvelle URL du webhook
   */
  async updateWebhookUrl(newUrl: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('config')
        .upsert({
          key: 'webhook_url',
          value: newUrl,
          description: 'URL du webhook N8N pour les automatisations',
          is_public: false
        });
        
      if (error) {
        console.error('❌ Erreur lors de la mise à jour de l\'URL webhook (table config peut-être manquante):', error);
        this.webhookUrl = newUrl;
        console.log('⚠️ Mise à jour locale uniquement:', newUrl);
        return false;
      }
      
      this.webhookUrl = newUrl;
      console.log('✅ URL du webhook mise à jour:', newUrl);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'URL webhook:', error);
      this.webhookUrl = newUrl;
      console.log('⚠️ Mise à jour locale uniquement:', newUrl);
      return false;
    }
  }
  
  /**
   * Met à jour l'URL du webhook (méthode legacy)
   * @param newUrl Nouvelle URL du webhook
   */
  updateWebhookUrlLegacy(newUrl: string): void {
    this.webhookUrl = newUrl;
    console.log('🔄 URL du webhook mise à jour (legacy):', newUrl);
  }

  /**
   * Obtient l'URL actuelle du webhook
   * @returns URL du webhook
   */
  getWebhookUrl(): string {
    if (typeof this.webhookUrl === 'string') {
      return this.webhookUrl;
    }
    
    if (this.webhookUrl && typeof this.webhookUrl === 'object' && 'url' in this.webhookUrl) {
      return (this.webhookUrl as any).url;
    }
    
    return DEFAULT_N8N_WEBHOOK_URL;
  }

  /**
   * Détermine l'action à partir du type d'action
   * @param actionType Type d'action
   * @returns Action standardisée pour N8N
   */
  private getActionFromType(actionType: string): string {
    const actionMapping: Record<string, string> = {
      'test_connection': 'test_connection',
      'delete_automation': 'delete_automation',
      'create_zoom_meeting': 'create_zoom_meeting',
      'update_zoom_meeting': 'update_zoom_meeting',
      'cancel_zoom_meeting': 'cancel_zoom_meeting',
      'send_zoom_invitations': 'send_zoom_invitations',
      'ai_query': 'ai_query',
      'ai_status': 'ai_status',
      'ai_test': 'ai_test',
      'email.send': 'send_email',
      'reminder.create': 'create_reminder',
      'notification.send': 'send_notification',
      'session.schedule': 'schedule_session',
      'task.create': 'create_task',
      'note_created': 'create_automation',
      'document_created': 'create_automation',
      'document_updated': 'create_automation',
      'document_shared': 'create_automation',
      'vocabulary_added': 'create_automation',
      'vocabulary_mastered': 'create_automation',
      'study_session_completed': 'create_automation',
      'schedule_time': 'create_automation',
      'user_registered': 'create_automation'
    };

    return actionMapping[actionType] || 'unknown_action';
  }

  /**
   * Fonction de fallback pour les requêtes de discussion IA
   */
  async fallbackDiscussionRequest(payload: {
    userId: string;
    message: string;
    context?: string;
    vocabulary?: any[];
  }): Promise<WebhookResponse> {
    console.log('🔄 Tentative de fallback avec méthode alternative...');
    
    const startTime = Date.now();
    
    try {
      // Essayer avec une approche plus simple (sans CORS complexe)
      const simpleResponse = await fetch(this.discussionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: payload.userId,
          message: payload.message,
          context: payload.context || 'vocabulary_learning',
          vocabulary_items: payload.vocabulary || [],
          timestamp: new Date().toISOString(),
          fallback: true
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (simpleResponse.ok) {
        let data;
        try {
          const responseText = await simpleResponse.text();
          data = responseText ? JSON.parse(responseText) : { message: 'Réponse fallback reçue' };
        } catch (e) {
          data = { message: 'Réponse fallback non parsable' };
        }
        
        return {
          success: true,
          message: 'Discussion IA déclenchée avec succès (fallback)',
          data,
          statusCode: simpleResponse.status,
          diagnostics: {
            url: this.discussionUrl,
            timestamp: new Date().toISOString(),
            responseTime,
            fallbackUsed: true
          }
        };
      } else {
        throw new Error(`Fallback failed: HTTP ${simpleResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Échec du fallback:', error);
      throw error;
    }
  }

  /**
   * Test de connectivité simple pour diagnostiquer les problèmes
   */
  async testSimpleConnectivity(): Promise<WebhookResponse> {
    console.log('🔍 Test de connectivité simple vers N8N...');
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(this.discussionUrl, {
        method: 'GET',
        mode: 'no-cors'
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Connectivité basique réussie',
        statusCode: response.status || 0,
        diagnostics: {
          url: this.discussionUrl,
          timestamp: new Date().toISOString(),
          responseTime,
          testType: 'simple_connectivity'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connectivité',
        diagnostics: {
          url: this.discussionUrl,
          timestamp: new Date().toISOString(),
          responseTime,
          testType: 'simple_connectivity',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  getTriggerTypeName(type: string) {
    const types: Record<string, string> = {
      'manual': 'Manuel',
      'note_created': 'Note créée',
      'document_created': 'Document créé',
      'document_updated': 'Document mis à jour',
      'document_shared': 'Document partagé',
    };
    return types[type] || type;
  }
}

// Exporter une instance singleton
export const webhookService = new WebhookService();