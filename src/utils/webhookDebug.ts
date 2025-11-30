import { webhookService } from '../services/webhookService';
import { logger } from './logger';

/**
 * Utilitaire pour déboguer les problèmes de webhook N8N
 */
export class WebhookDebugger {
  
  /**
   * Lance une série de tests complets pour diagnostiquer les problèmes
   */
  static async runFullDiagnostics() {
    logger.debug('🔍 === DIAGNOSTIC COMPLET DES WEBHOOKS N8N ===');
    
    const results = {
      connectivity: null as any,
      discussion: null as any,
      automation: null as any,
      simpleConnectivity: null as any
    };
    
    // Test 1: Connectivité N8N standard (utilise nouveau postWebhook)
    logger.debug('\n🧪 Test 1: Connectivité N8N standard...');
    try {
      results.connectivity = await webhookService.testN8NConnectivity();
      logger.debug('✅ Résultat:', results.connectivity);
    } catch (error) {
      logger.error('❌ Erreur connectivité N8N:', error);
      results.connectivity = { success: false, error: error };
    }
    
    // Test 2: Workflow discussion IA (avec déduplication)
    logger.debug('\n🤖 Test 2: Workflow Discussion IA...');
    try {
      results.discussion = await webhookService.triggerDiscussionWorkflow({
        userId: 'debug_user_' + Date.now(),
        message: 'Test de connectivité - ' + new Date().toLocaleString(),
        context: 'debug_test'
      });
      logger.debug('✅ Résultat:', results.discussion);
    } catch (error) {
      logger.error('❌ Erreur workflow discussion:', error);
      results.discussion = { success: false, error: error };
    }
    
    // Test 3: Workflow automatisation (avec déduplication)
    logger.debug('\n⚙️ Test 3: Workflow Automatisation...');
    try {
      results.automation = await webhookService.triggerAutomationWorkflow({
        userId: 'debug_user_' + Date.now(),
        automationType: 'connectivity_test'
      });
      logger.debug('✅ Résultat:', results.automation);
    } catch (error) {
      logger.error('❌ Erreur workflow automatisation:', error);
      results.automation = { success: false, error: error };
    }
    
    // Résumé des résultats
    logger.debug('\n📊 === RÉSUMÉ DES TESTS ===');
    logger.debug('Connectivité N8N:', results.connectivity?.success ? '✅' : '❌');
    logger.debug('Discussion IA:', results.discussion?.success ? '✅' : '❌');
    logger.debug('Automatisation:', results.automation?.success ? '✅' : '❌');
    
    return results;
  }
  
  /**
   * Test rapide spécifique au workflow discussion IA
   */
  static async testDiscussionWorkflow(message: string = 'Test de debug') {
    logger.debug('🤖 Test spécifique du workflow Discussion IA...');
    
    try {
      const result = await webhookService.triggerDiscussionWorkflow({
        userId: 'debug_user_' + Date.now(),
        message: message,
        context: 'debug_manual_test',
        vocabulary: []
      });
      
      logger.debug('📊 Résultat détaillé:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        logger.debug('✅ Test réussi!');
      } else {
        logger.debug('❌ Test échoué:', result.message);
        if (result.diagnostics) {
          logger.debug('🔍 Diagnostics:', result.diagnostics);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Erreur lors du test:', error);
      return { success: false, error: error };
    }
  }
  
  /**
   * Affiche les informations de configuration actuelle
   */
  static logCurrentConfig() {
    logger.debug('⚙️ === CONFIGURATION ACTUELLE ===');
    logger.debug('Origin:', window.location.origin);
    logger.debug('User Agent:', navigator.userAgent);
    logger.debug('Timestamp:', new Date().toISOString());
    logger.debug('=====================================');
  }
}

// Fonction d'aide pour tester rapidement depuis la console (en dev seulement)
if (!import.meta.env.PROD) {
  (window as any).debugWebhooks = WebhookDebugger.runFullDiagnostics;
  (window as any).testDiscussion = WebhookDebugger.testDiscussionWorkflow;
  (window as any).webhookConfig = WebhookDebugger.logCurrentConfig;

  logger.debug('🔧 Utilitaires de debug webhook disponibles:');
  logger.debug('- debugWebhooks() - Lance tous les tests');
  logger.debug('- testDiscussion("message") - Test le workflow discussion');
  logger.debug('- webhookConfig() - Affiche la config actuelle');
}