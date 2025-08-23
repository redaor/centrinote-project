import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import zoomAuthRoutes from './routes/zoomAuth.js';
import zoomMeetingRoutes from './routes/zoomMeetings.js';
import { authMiddleware } from './middleware/auth.js';

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;

// 🛡️ VALIDATION STRICTE: Refuser localhost/127.0.0.1 pour Zoom OAuth
const redirectUri = process.env.ZOOM_REDIRECT_URI || '';

if (redirectUri.includes('localhost') || redirectUri.includes('127.0.0.1') || !redirectUri.startsWith('https://')) {
  console.error('❌ ERREUR CRITIQUE: ZOOM_REDIRECT_URI invalide');
  console.error(`📋 Valeur actuelle: ${redirectUri}`);
  console.error('✅ Requis: URL HTTPS publique (ex: https://xxxx.ngrok.io/auth/callback)');
  console.error('💡 Utilisez: npm run dev:tunnel pour configurer automatiquement');
  console.error('🚫 Refus de démarrer avec localhost/127.0.0.1 - Zoom OAuth échouera');
  process.exit(1);
}

console.log('✅ ZOOM_REDIRECT_URI validé:', redirectUri);

// Middleware CORS - Support tunnel HTTPS + domaines locaux
const corsOrigins = [
  process.env.CLIENT_URL || 'http://zoomapp.local:5173',
  'http://zoomapp.local:5173',
  'http://zoomapp.local:5174',
  'null' // Pour supporter file:// en développement
];

// Ajouter support tunnel HTTPS si configuré
if (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.startsWith('https://')) {
  corsOrigins.push(process.env.APP_PUBLIC_URL);
}

// Fallback localhost uniquement si pas en mode FORCE_HTTPS
if (process.env.FORCE_HTTPS !== 'true') {
  corsOrigins.push('http://localhost:5173', 'http://localhost:5174');
}

console.log('🔐 CORS Origins autorisées:', corsOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Permettre les requêtes sans origine (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Vérifier si l'origine est autorisée
    if (corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Autoriser tous les domaines ngrok.app et ngrok-free.app en développement
    if (process.env.NODE_ENV === 'development' && 
        (origin.includes('.ngrok.app') || origin.includes('.ngrok-free.app'))) {
      console.log('✅ Domaine ngrok autorisé:', origin);
      return callback(null, true);
    }
    
    console.warn('❌ Origine CORS refusée:', origin);
    callback(new Error('Non autorisé par la politique CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'Origin', 
    'X-Requested-With', 
    'Accept',
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration avec support HTTPS tunnel
app.use(session({
  secret: process.env.SESSION_SECRET || 'centrinote_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.FORCE_HTTPS === 'true' ? 'none' : 'lax'
  }
}));

// Static files pour le frontend de test
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    zoom_configured: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
    cors_origins: corsOrigins
  });
});

// Alternative health check endpoint
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'centrinote-backend'
  });
});

// Auth status endpoint
app.get('/auth/me', (req, res) => {
  res.json({
    authenticated: false,
    message: 'Auth endpoint accessible',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/auth', zoomAuthRoutes);
app.use('/api/meetings', authMiddleware, zoomMeetingRoutes);

// Route principale - Interface de test
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes pour les tests d'authentification
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-auth-flow.html'));
});

app.get('/frontend-auth-helper.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '..', 'frontend-auth-helper.js'));
});

// Route pour le helper BFF
app.get('/frontend-auth-helper-bff.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '..', 'frontend-auth-helper-bff.js'));
});

// Route pour servir la page de callback OAuth sur port 5174
app.get('/zoom/callback', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'zoom-callback.html'));
});

// Route pour la page de simulation de callback success
app.get('/test-callback', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-callback-success.html'));
});

// Route pour l'interface de test BFF
app.get('/test-bff', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-auth-bff.html'));
});

// La route GET /zoom/callback sert maintenant la page HTML de callback

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur Centrinote Zoom démarré sur http://localhost:${PORT}`);
  console.log(`📋 Interface de test: http://localhost:${PORT}`);
  console.log(`🔗 OAuth Callback: ${process.env.ZOOM_REDIRECT_URI || 'http://localhost:5173/zoom/callback'}`);
  console.log(`⚙️  Environnement: ${process.env.NODE_ENV || 'development'}`);
  
  // Vérification configuration Zoom
  if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    console.warn('⚠️  Configuration Zoom OAuth incomplète');
  } else {
    console.log('✅ Configuration Zoom OAuth prête');
  }
});

export default app;