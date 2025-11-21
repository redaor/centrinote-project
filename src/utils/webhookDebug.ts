import { webhookService } from '../services/webhookService';
import { log } from './logger';

/**
 * Utilitaire pour déboguer les problèmes de webhook N8N
 */
export class WebhookDebugger {
  
  /**
   * Lance une série de tests complets pour diagnostiquer les problèmes
   */
  static async runFullDiagnostics() {
    log.debug('🔍 === DIAGNOSTIC COMPLET DES WEBHOOKS N8N ===');
    
    const results = {
      connectivity: null as any,
      discussion: null as any,
      automation: null as any,
      simpleConnectivity: null as any
    };
    
    // Test 1: Connectivité N8N standard (utilise nouveau postWebhook)
    log.debug('\n🧪 Test 1: Connectivité N8N standard...');
    try {
      results.connectivity = await webhookService.testN8NConnectivity();
      log.debug('✅ Résultat:', results.connectivity);
    } catch (error) {
      log.error('❌ Erreur connectivité N8N:', error);
      results.connectivity = { success: false, error: error };
    }
    
    // Test 2: Workflow discussion IA (avec déduplication)
    log.debug('\n🤖 Test 2: Workflow Discussion IA...');
    try {
      results.discussion = await webhookService.triggerDiscussionWorkflow({
        userId: 'debug_user_' + Date.now(),
        message: 'Test de connectivité - ' + new Date().toLocaleString(),
        context: 'debug_test'
      });
      log.debug('✅ Résultat:', results.discussion);
    } catch (error) {
      log.error('❌ Erreur workflow discussion:', error);
      results.discussion = { success: false, error: error };
    }
    
    // Test 3: Workflow automatisation (avec déduplication)
    log.debug('\n⚙️ Test 3: Workflow Automatisation...');
    try {
      results.automation = await webhookService.triggerAutomationWorkflow({
        userId: 'debug_user_' + Date.now(),
        automationType: 'connectivity_test'
      });
      log.debug('✅ Résultat:', results.automation);
    } catch (error) {
      log.error('❌ Erreur workflow automatisation:', error);
      results.automation = { success: false, error: error };
    }
    
    // Résumé des résultats
    log.debug('\n📊 === RÉSUMÉ DES TESTS ===');
    log.debug('Connectivité N8N:', results.connectivity?.success ? '✅' : '❌');
    log.debug('Discussion IA:', results.discussion?.success ? '✅' : '❌');
    log.debug('Automatisation:', results.automation?.success ? '✅' : '❌');
    
    return results;
  }
  
  /**
   * Test rapide spécifique au workflow discussion IA
   */
  static async testDiscussionWorkflow(message: string = 'Test de debug') {
    log.debug('🤖 Test spécifique du workflow Discussion IA...');
    
    try {
      const result = await webhookService.triggerDiscussionWorkflow({
        userId: 'debug_user_' + Date.now(),
        message: message,
        context: 'debug_manual_test',
        vocabulary: []
      });
      
      log.debug('📊 Résultat détaillé:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        log.debug('✅ Test réussi!');
      } else {
        log.debug('❌ Test échoué:', result.message);
        if (result.diagnostics) {
          log.debug('🔍 Diagnostics:', result.diagnostics);
        }
      }
      
      return result;
    } catch (error) {
      log.error('❌ Erreur lors du test:', error);
      return { success: false, error: error };
    }
  }
  
  /**
   * Affiche les informations de configuration actuelle
   */
  static logCurrentConfig() {
    log.debug('⚙️ === CONFIGURATION ACTUELLE ===');
    log.debug('Origin:', window.location.origin);
    log.debug('User Agent:', navigator.userAgent);
    log.debug('Timestamp:', new Date().toISOString());
    log.debug('=====================================');
  }
}

// Fonction d'aide pour tester rapidement depuis la console (en dev seulement)
if (!import.meta.env.PROD) {
  (window as any).debugWebhooks = WebhookDebugger.runFullDiagnostics;
  (window as any).testDiscussion = WebhookDebugger.testDiscussionWorkflow;
  (window as any).webhookConfig = WebhookDebugger.logCurrentConfig;

  log.debug('🔧 Utilitaires de debug webhook disponibles:');
  log.debug('- debugWebhooks() - Lance tous les tests');
  log.debug('- testDiscussion("message") - Test le workflow discussion');
  log.debug('- webhookConfig() - Affiche la config actuelle');
}