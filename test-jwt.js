import jwt from 'jsonwebtoken';
import { TokenManager } from './utils/tokenManager.js';

const JWT_SECRET = process.env.JWT_SECRET || 'centrinote_jwt_secret_key_2025';

// Créer un token JWT de test
const testUser = {
  zoomUserId: 'test_zoom_id_123',
  email: 'test@example.com',
  displayName: 'Test User',
  accountId: 'test_account_123'
};

const testToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });

console.log('🔐 Token JWT de test généré:');
console.log(testToken);

// Tester la génération de tokens OAuth fictifs
const tokenManager = new TokenManager();
await tokenManager.storeTokens(testUser.zoomUserId, {
  accessToken: 'test_access_token_123',
  refreshToken: 'test_refresh_token_123',
  expiresIn: 3600,
  userInfo: testUser
});

console.log('✅ Tokens OAuth fictifs stockés pour test');
console.log('\n🧪 Test curl:');
console.log(`curl -H "Authorization: Bearer ${testToken}" http://localhost:5174/auth/me`);