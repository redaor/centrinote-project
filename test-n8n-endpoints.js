#!/usr/bin/env node

// 🧪 Script de test direct des endpoints n8n
// Usage: node test-n8n-endpoints.js

const N8N_BASE_URL = 'https://n8n.srv886297.hstgr.cloud';

// Test 1: Envoi de lien de vérification
async function testSendVerificationLink() {
  console.log('🔗 Test 1: Envoi de lien de vérification...');
  
  const payload = {
    email: 'test@centrinote.fr',
    user_id: '12345678-1234-1234-1234-123456789012',
    action: 'signup',
    timestamp: new Date().toISOString(),
    domain: 'https://centrinote.fr'
  };

  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/send-verification-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'centrinote-test'
      },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Réponse:', result);
      
      // Vérifier le format de réponse attendu
      if (result.success && result.message && result.action === 'link_sent') {
        console.log('✅ Format de réponse correct !');
        return result;
      } else {
        console.log('⚠️ Format de réponse inattendu');
        return null;
      }
    } else {
      const error = await response.text();
      console.log('❌ Erreur:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    return null;
  }
}

// Test 2: Validation de token (GET)
async function testVerifyToken() {
  console.log('\n🔍 Test 2: Validation de token...');
  
  const testToken = 'test-token-123';
  const testEmail = 'test@centrinote.fr';
  
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/verify-email-token?token=${encodeURIComponent(testToken)}&email=${encodeURIComponent(testEmail)}`
    );

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/html')) {
        console.log('✅ Réponse HTML reçue (attendu pour redirection)');
        const html = await response.text();
        console.log('Extrait HTML:', html.substring(0, 200) + '...');
        
        // Vérifier si HTML contient redirection JavaScript
        if (html.includes('window.location') || html.includes('redirect')) {
          console.log('✅ Redirection JavaScript détectée !');
        }
      } else {
        const result = await response.json();
        console.log('✅ Réponse JSON:', result);
      }
      
      return true;
    } else {
      if (response.status === 404) {
        console.log('✅ 404 attendu pour token de test invalide');
      } else {
        const error = await response.text();
        console.log('❌ Erreur:', error);
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    return false;
  }
}

// Test complet
async function runTests() {
  console.log('🚀 Tests des endpoints n8n\n');
  console.log(`Base URL: ${N8N_BASE_URL}\n`);
  
  const results = {
    sendLink: await testSendVerificationLink(),
    verifyToken: await testVerifyToken()
  };
  
  console.log('\n📊 Résumé des tests:');
  console.log('- Envoi lien:', results.sendLink ? '✅ OK' : '❌ ÉCHEC');
  console.log('- Validation token:', results.verifyToken ? '✅ OK' : '❌ ÉCHEC');
  
  if (results.sendLink && results.verifyToken) {
    console.log('\n🎉 Tous les tests sont passés ! Les endpoints n8n sont opérationnels.');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration n8n.');
  }
}

// Exécution
runTests().catch(console.error);