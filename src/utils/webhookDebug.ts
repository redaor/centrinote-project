import { webhookService } from '../services/webhookService';

/**
 * Utilitaire pour déboguer les problèmes de webhook N8N
 */
export class WebhookDebugger {
  
  /**
   * Lance une série de tests complets pour diagnostiquer les problèmes
   */
  static async runFullDiagnostics() {
    console.log('🔍 === DIAGNOSTIC COMPLET DES WEBHOOKS N8N ===');
    
    const results = {
      connectivity: null as any,
      discussion: null as any,
      automation: null as any,
      simpleConnectivity: null as any
    };
    
    // Test 1: Connectivité simple
    console.log('\n📡 Test 1: Connectivité simple...');
    try {
      results.simpleConnectivity = await webhookService.testSimpleConnectivity();
      console.log('✅ Résultat:', results.simpleConnectivity);
    } catch (error) {
      console.error('❌ Erreur test simple:', error);
      results.simpleConnectivity = { success: false, error: error };
    }
    
    // Test 2: Connectivité N8N standard
    console.log('\n🧪 Test 2: Connectivité N8N standard...');
    try {
      results.connectivity = await webhookService.testN8NConnectivity();
      console.log('✅ Résultat:', results.connectivity);
    } catch (error) {
      console.error('❌ Erreur connectivité N8N:', error);
      results.connectivity = { success: false, error: error };
    }
    
    // Test 3: Workflow discussion IA
    console.log('\n🤖 Test 3: Workflow Discussion IA...');
    try {
      results.discussion = await webhookService.triggerDiscussionWorkflow({
        userId: 'debug_user_' + Date.now(),
        message: 'Test de connectivité - ' + new Date().toLocaleString(),
        context: 'debug_test'
      });
      console.log('✅ Résultat:', results.discussion);
    } catch (error) {
      console.error('❌ Erreur workflow discussion:', error);
      results.discussion = { success: false, error: error };
    }
    
    // Test 4: Workflow automatisation
    console.log('\n⚙️ Test 4: Workflow Automatisation...');
    try {
      results.automation = await webhookService.triggerAutomationWorkflow({
        userId: 'debug_user_' + Date.now(),
        action: 'connectivity_test'
      });
      console.log('✅ Résultat:', results.automation);
    } catch (error) {
      console.error('❌ Erreur workflow automatisation:', error);
      results.automation = { success: false, error: error };
    }
    
    // Résumé des résultats
    console.log('\n📊 === RÉSUMÉ DES TESTS ===');
    console.log('Connectivité simple:', results.simpleConnectivity?.success ? '✅' : '❌');
    console.log('Connectivité N8N:', results.connectivity?.success ? '✅' : '❌');
    console.log('Discussion IA:', results.discussion?.success ? '✅' : '❌');
    console.log('Automatisation:', results.automation?.success ? '✅' : '❌');
    
    return results;
  }
  
  /**
   * Test rapide spécifique au workflow discussion IA
   */
  static async testDiscussionWorkflow(message: string = 'Test de debug') {
    console.log('🤖 Test spécifique du workflow Discussion IA...');
    
    try {
      const result = await webhookService.triggerDiscussionWorkflow({
        userId: 'debug_user_' + Date.now(),
        message: message,
        context: 'debug_manual_test',
        vocabulary: []
      });
      
      console.log('📊 Résultat détaillé:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Test réussi!');
      } else {
        console.log('❌ Test échoué:', result.message);
        if (result.diagnostics) {
          console.log('🔍 Diagnostics:', result.diagnostics);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      return { success: false, error: error };
    }
  }
  
  /**
   * Affiche les informations de configuration actuelle
   */
  static logCurrentConfig() {
    console.log('⚙️ === CONFIGURATION ACTUELLE ===');
    console.log('URL Discussion:', webhookService.getWebhookUrl());
    console.log('Origin:', window.location.origin);
    console.log('User Agent:', navigator.userAgent);
    console.log('Timestamp:', new Date().toISOString());
    console.log('=====================================');
  }
}

// Fonction d'aide pour tester rapidement depuis la console
(window as any).debugWebhooks = WebhookDebugger.runFullDiagnostics;
(window as any).testDiscussion = WebhookDebugger.testDiscussionWorkflow;
(window as any).webhookConfig = WebhookDebugger.logCurrentConfig;

console.log('🔧 Utilitaires de debug webhook disponibles:');
console.log('- debugWebhooks() - Lance tous les tests');
console.log('- testDiscussion("message") - Test le workflow discussion');
console.log('- webhookConfig() - Affiche la config actuelle');