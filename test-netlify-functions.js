// 🧪 Tests pour Netlify Functions - API Centrinote
// Suite de tests complète pour valider les endpoints serverless
// =========================================================

const https = require('https');

// 🔧 Configuration des tests
const CONFIG = {
  // URLs de production (à adapter selon votre domaine)
  BASE_URL: process.env.NETLIFY_URL || 'https://centrinote.netlify.app',
  
  // Clé API pour les tests (à définir dans les variables d'environnement)
  TEST_API_KEY: process.env.TEST_API_KEY || '',
  
  // Master token pour la génération de clés (admin only)
  MASTER_TOKEN: process.env.MASTER_API_TOKEN || '',
  
  // Timeouts
  REQUEST_TIMEOUT: 10000
};

// 🔧 Utilitaire HTTP pour Netlify Functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: CONFIG.REQUEST_TIMEOUT
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

// 🧪 Suite de tests
class NetlifyFunctionTests {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // ✅ Assertion helper
  assert(condition, testName, details = '') {
    const result = {
      name: testName,
      passed: condition,
      details: details,
      timestamp: new Date().toISOString()
    };

    this.results.tests.push(result);
    
    if (condition) {
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${testName}${details ? ` - ${details}` : ''}`);
    }
  }

  // 🧪 Test 1: Health Check Function
  async testHealthFunction() {
    console.log('\n🏥 Test Health Function...');
    
    try {
      const response = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/health`);
      
      this.assert(
        response.statusCode === 200,
        'Health endpoint returns 200',
        `Status: ${response.statusCode}`
      );

      this.assert(
        response.data.status === 'healthy',
        'Health status is healthy',
        `Status: ${response.data.status}`
      );

      this.assert(
        response.data.serverless === true,
        'Confirms serverless architecture',
        `Serverless: ${response.data.serverless}`
      );

      this.assert(
        response.data.platform === 'netlify',
        'Confirms Netlify platform',
        `Platform: ${response.data.platform}`
      );

      this.assert(
        !!response.data.timestamp,
        'Health check includes timestamp',
        `Timestamp: ${response.data.timestamp}`
      );

    } catch (error) {
      this.assert(false, 'Health function request failed', error.message);
    }
  }

  // 🧪 Test 2: CORS Headers
  async testCORSHeaders() {
    console.log('\n🌐 Test CORS Headers...');
    
    try {
      // OPTIONS request pour CORS preflight
      const optionsResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/health`, {
        method: 'OPTIONS'
      });

      this.assert(
        optionsResponse.statusCode === 200,
        'OPTIONS request succeeds',
        `Status: ${optionsResponse.statusCode}`
      );

      this.assert(
        !!optionsResponse.headers['access-control-allow-origin'],
        'CORS Allow-Origin header present',
        `Header: ${optionsResponse.headers['access-control-allow-origin']}`
      );

      this.assert(
        !!optionsResponse.headers['access-control-allow-methods'],
        'CORS Allow-Methods header present',
        `Methods: ${optionsResponse.headers['access-control-allow-methods']}`
      );

    } catch (error) {
      this.assert(false, 'CORS test request failed', error.message);
    }
  }

  // 🧪 Test 3: Reports Function (sans authentification)
  async testReportsUnauthorized() {
    console.log('\n🔐 Test Reports Unauthorized...');
    
    try {
      // Test GET sans Bearer token
      const getResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/reports`);
      
      this.assert(
        getResponse.statusCode === 401,
        'GET reports without auth returns 401',
        `Status: ${getResponse.statusCode}`
      );

      this.assert(
        getResponse.data.error === 'Unauthorized',
        'Correct error message for unauthorized GET',
        `Error: ${getResponse.data.error}`
      );

      // Test POST sans Bearer token
      const postResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/reports`, {
        method: 'POST',
        body: {
          reportId: 'test-123',
          roomName: 'test-room',
          reportData: '{"test": "data"}'
        }
      });

      this.assert(
        postResponse.statusCode === 401,
        'POST reports without auth returns 401',
        `Status: ${postResponse.statusCode}`
      );

    } catch (error) {
      this.assert(false, 'Reports unauthorized test failed', error.message);
    }
  }

  // 🧪 Test 4: Reports Function (avec clé API valide)
  async testReportsWithAuth() {
    if (!CONFIG.TEST_API_KEY) {
      console.log('\n⚠️  Skipping auth tests - No TEST_API_KEY provided');
      return;
    }

    console.log('\n🔑 Test Reports With Authentication...');
    
    try {
      // Test GET avec clé API
      const getResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/reports`, {
        headers: {
          'Authorization': `Bearer ${CONFIG.TEST_API_KEY}`
        }
      });

      this.assert(
        getResponse.statusCode === 200,
        'GET reports with valid key returns 200',
        `Status: ${getResponse.statusCode}`
      );

      this.assert(
        getResponse.data.success === true,
        'GET reports returns success',
        `Success: ${getResponse.data.success}`
      );

      this.assert(
        Array.isArray(getResponse.data.data),
        'GET reports returns array data',
        `Data type: ${typeof getResponse.data.data}`
      );

      // Test POST avec données valides
      const testReport = {
        reportId: `test-report-${Date.now()}`,
        roomName: `test-room-${Date.now()}`,
        reportData: JSON.stringify({
          transcript: 'Test transcript content',
          summary: 'Test summary',
          participants: ['test@example.com']
        }),
        participantEmails: 'test@example.com,test2@example.com',
        reportType: 'meeting_report',
        metadata: {
          duration: 300,
          participantCount: 2
        }
      };

      const postResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.TEST_API_KEY}`
        },
        body: testReport
      });

      this.assert(
        postResponse.statusCode === 201,
        'POST report with valid data returns 201',
        `Status: ${postResponse.statusCode}`
      );

      this.assert(
        postResponse.data.success === true,
        'POST report returns success',
        `Success: ${postResponse.data.success}`
      );

      this.assert(
        postResponse.data.data.reportId === testReport.reportId,
        'POST report returns correct reportId',
        `Returned ID: ${postResponse.data.data.reportId}`
      );

    } catch (error) {
      this.assert(false, 'Reports auth test failed', error.message);
    }
  }

  // 🧪 Test 5: Generate Key Function
  async testGenerateKeyFunction() {
    if (!CONFIG.MASTER_TOKEN) {
      console.log('\n⚠️  Skipping key generation tests - No MASTER_TOKEN provided');
      return;
    }

    console.log('\n🔑 Test Generate Key Function...');
    
    try {
      // Test POST pour créer une clé
      const keyData = {
        name: `Test Key ${Date.now()}`,
        permissions: ['reports:write'],
        expiresIn: 30, // 30 jours
        metadata: {
          purpose: 'automated_test',
          environment: 'test'
        }
      };

      const response = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/generate-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.MASTER_TOKEN}`
        },
        body: keyData
      });

      this.assert(
        response.statusCode === 201,
        'Key generation returns 201',
        `Status: ${response.statusCode}`
      );

      this.assert(
        response.data.success === true,
        'Key generation returns success',
        `Success: ${response.data.success}`
      );

      this.assert(
        response.data.data.key.startsWith('cnt_live_'),
        'Generated key has correct format',
        `Key format: ${response.data.data.key.substring(0, 20)}...`
      );

      this.assert(
        response.data.data.name === keyData.name,
        'Key has correct name',
        `Name: ${response.data.data.name}`
      );

      this.assert(
        !!response.data.warning,
        'Key generation includes security warning',
        `Warning: ${response.data.warning}`
      );

    } catch (error) {
      this.assert(false, 'Generate key test failed', error.message);
    }
  }

  // 🧪 Test 6: Error Handling
  async testErrorHandling() {
    console.log('\n❌ Test Error Handling...');
    
    try {
      // Test méthode non supportée
      const invalidMethodResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/health`, {
        method: 'DELETE'
      });

      this.assert(
        invalidMethodResponse.statusCode === 405,
        'Invalid method returns 405',
        `Status: ${invalidMethodResponse.statusCode}`
      );

      // Test données JSON invalides
      if (CONFIG.TEST_API_KEY) {
        const invalidJsonResponse = await makeRequest(`${CONFIG.BASE_URL}/.netlify/functions/reports`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CONFIG.TEST_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: 'invalid json string'
        });

        this.assert(
          invalidJsonResponse.statusCode === 400,
          'Invalid JSON returns 400',
          `Status: ${invalidJsonResponse.statusCode}`
        );
      }

    } catch (error) {
      this.assert(false, 'Error handling test failed', error.message);
    }
  }

  // 📊 Exécuter tous les tests
  async runAllTests() {
    console.log('🧪 Démarrage des tests Netlify Functions...');
    console.log(`🎯 URL de base: ${CONFIG.BASE_URL}`);
    console.log(`🔑 Clé API test: ${CONFIG.TEST_API_KEY ? 'Définie' : 'Non définie'}`);
    console.log(`🛠️  Master token: ${CONFIG.MASTER_TOKEN ? 'Défini' : 'Non défini'}`);
    console.log('=' .repeat(60));

    const startTime = Date.now();

    await this.testHealthFunction();
    await this.testCORSHeaders();
    await this.testReportsUnauthorized();
    await this.testReportsWithAuth();
    await this.testGenerateKeyFunction();
    await this.testErrorHandling();

    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSULTATS DES TESTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests réussis: ${this.results.passed}`);
    console.log(`❌ Tests échoués: ${this.results.failed}`);
    console.log(`⏱️  Durée totale: ${duration}ms`);
    console.log(`🎯 Score: ${Math.round(this.results.passed / (this.results.passed + this.results.failed) * 100)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ TESTS ÉCHOUÉS:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.details}`);
        });
    }

    return this.results;
  }
}

// 🚀 Exécution des tests
async function main() {
  const tester = new NetlifyFunctionTests();
  
  try {
    const results = await tester.runAllTests();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n💥 ERREUR FATALE DANS LES TESTS:', error);
    process.exit(1);
  }
}

// Lancer les tests si ce fichier est exécuté directement
if (require.main === module) {
  main();
}

module.exports = { NetlifyFunctionTests, CONFIG };