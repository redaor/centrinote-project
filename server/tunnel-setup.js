#!/usr/bin/env node

/**
 * Script de setup tunnel HTTPS pour résoudre définitivement l'erreur 4700 Zoom
 * Génère automatiquement les URLs tunnels et met à jour la configuration
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5174;
const ENV_TUNNEL_PATH = path.join(__dirname, '.env.tunnel');
const ENV_PATH = path.join(__dirname, '.env');

console.log('🚀 SETUP TUNNEL HTTPS - RÉSOLUTION DÉFINITIVE ERREUR 4700');
console.log('=' .repeat(60));

// Vérifier si ngrok est installé
function checkNgrok() {
  return new Promise((resolve) => {
    const check = spawn('which', ['ngrok'], { stdio: 'ignore' });
    check.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// Installer ngrok si nécessaire
async function installNgrok() {
  console.log('📦 Installation de ngrok...');
  
  return new Promise((resolve, reject) => {
    // Tentative d'installation via npm
    const install = spawn('npm', ['install', '-g', '@ngrok/ngrok'], { 
      stdio: ['inherit', 'pipe', 'pipe'] 
    });
    
    install.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ngrok installé avec succès');
        resolve(true);
      } else {
        console.log('❌ Échec installation ngrok via npm');
        console.log('💡 Installez manuellement: npm install -g @ngrok/ngrok');
        console.log('💡 Ou via brew: brew install ngrok');
        reject(new Error('Installation ngrok échouée'));
      }
    });
  });
}

// Lancer ngrok et récupérer l'URL
function startNgrok() {
  return new Promise((resolve, reject) => {
    console.log(`🌐 Lancement du tunnel ngrok sur port ${PORT}...`);
    
    const ngrok = spawn('ngrok', ['http', PORT.toString(), '--log=stdout'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let ngrokUrl = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 secondes max
    
    // Parser la sortie ngrok pour extraire l'URL
    ngrok.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📡 Ngrok:', output.trim());
      
      // Chercher l'URL HTTPS
      const httpsMatch = output.match(/https:\/\/[\w-]+\.ngrok[-\w]*\.io/);
      if (httpsMatch && !ngrokUrl) {
        ngrokUrl = httpsMatch[0];
        console.log(`✅ Tunnel HTTPS établi: ${ngrokUrl}`);
        resolve(ngrokUrl);
      }
    });
    
    ngrok.stderr.on('data', (data) => {
      const stderr = data.toString().trim();
      console.log('⚠️ Ngrok stderr:', stderr);
      
      // Détecter erreur d'authentification
      if (stderr.includes('ERR_NGROK_4018') || stderr.includes('authentication failed')) {
        console.log('\n🔐 AUTHENTIFICATION NGROK REQUISE');
        console.log('=' .repeat(50));
        console.log('📋 Étapes requises:');
        console.log('   1. Créez un compte gratuit: https://dashboard.ngrok.com/signup');
        console.log('   2. Obtenez votre authtoken: https://dashboard.ngrok.com/get-started/your-authtoken');
        console.log('   3. Configurez: ngrok authtoken YOUR_TOKEN_HERE');
        console.log('\n💡 Alternative: Utilisez localhost temporairement avec npm run dev');
        ngrok.kill();
        reject(new Error('Authentification ngrok requise'));
      }
    });
    
    ngrok.on('close', (code) => {
      if (code !== 0 && !ngrokUrl) {
        reject(new Error(`Ngrok fermé avec code ${code}`));
      }
    });
    
    // Timeout si ngrok ne démarre pas
    setTimeout(() => {
      if (!ngrokUrl) {
        ngrok.kill();
        reject(new Error('Timeout: ngrok n\'a pas fourni d\'URL dans les 30s'));
      }
    }, 30000);
  });
}

// Mettre à jour le fichier .env avec l'URL tunnel
function updateEnvFile(tunnelUrl) {
  try {
    console.log(`🔧 Mise à jour configuration avec ${tunnelUrl}...`);
    
    // Lire le template .env.tunnel
    let envContent = fs.readFileSync(ENV_TUNNEL_PATH, 'utf8');
    
    // Remplacer les placeholders
    envContent = envContent.replace(/PLACEHOLDER_TUNNEL_URL/g, tunnelUrl.replace('https://', ''));
    envContent = envContent.replace(/https:\/\/([^/]+)/g, 'https://$1');
    
    // Écrire le fichier .env final
    fs.writeFileSync(ENV_PATH, envContent);
    
    console.log('✅ Configuration .env mise à jour');
    
    // Afficher les informations importantes
    console.log('\n🎯 CONFIGURATION ZOOM MARKETPLACE REQUISE:');
    console.log('=' .repeat(50));
    console.log(`📋 Redirect URI à configurer: ${tunnelUrl}/auth/callback`);
    console.log(`📋 App URL: ${tunnelUrl}`);
    console.log(`📋 Client ID: orVpgkFaS3SSsNfs_kagQw`);
    console.log('\n🌐 URLs importantes:');
    console.log(`   • Interface test: ${tunnelUrl}/test-bff`);
    console.log(`   • Health check: ${tunnelUrl}/health`);
    console.log(`   • OAuth endpoint: ${tunnelUrl}/auth/zoom`);
    console.log('\n⚠️  IMPORTANT: Configurez ces URLs dans Zoom Marketplace avant de tester !');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur mise à jour .env:', error.message);
    return false;
  }
}

// Démarrer le serveur avec la nouvelle configuration
function startServer() {
  console.log('\n🚀 Démarrage serveur avec configuration tunnel...');
  
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  server.on('close', (code) => {
    console.log(`\n⏹️ Serveur fermé avec code ${code}`);
    process.exit(code);
  });
  
  // Gérer l'arrêt propre
  process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    server.kill('SIGINT');
  });
  
  return server;
}

// Fonction principale
async function main() {
  try {
    // Vérifier ngrok
    const hasNgrok = await checkNgrok();
    
    if (!hasNgrok) {
      console.log('❌ ngrok non trouvé');
      await installNgrok();
    }
    
    // Lancer le tunnel
    const tunnelUrl = await startNgrok();
    
    // Mettre à jour la configuration
    const configUpdated = updateEnvFile(tunnelUrl);
    
    if (!configUpdated) {
      throw new Error('Échec mise à jour configuration');
    }
    
    console.log('\n✅ Tunnel HTTPS configuré avec succès !');
    console.log('⏳ Le serveur va démarrer dans 3 secondes...');
    
    // Petite pause pour laisser le temps de lire
    setTimeout(() => {
      startServer();
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ ERREUR SETUP TUNNEL:', error.message);
    
    if (error.message.includes('Authentification ngrok requise')) {
      console.log('\n🚀 UTILISATION ALTERNATIVE SANS TUNNEL:');
      console.log('=' .repeat(50));
      console.log('   npm run dev  # Démarre sur localhost');
      console.log('\n⚠️ ATTENTION: localhost peut causer erreur 4700 avec Zoom');
      console.log('💡 Pour test local uniquement, modifiez Zoom Marketplace:');
      console.log('   Redirect URI: http://localhost:5174/auth/callback');
    } else {
      console.log('\n💡 Solutions possibles:');
      console.log('   1. Installer ngrok: npm install -g @ngrok/ngrok');
      console.log('   2. Ou via brew: brew install ngrok');
      console.log('   3. Vérifier la connexion internet');
    }
    
    process.exit(1);
  }
}

// Lancer si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}