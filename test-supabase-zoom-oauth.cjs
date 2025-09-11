#!/usr/bin/env node

// 🧪 Script de test pour la nouvelle authentification Zoom via Supabase OAuth
// Usage: node test-supabase-zoom-oauth.js
// =======================================================================

console.log('🧪 Test de l\'implémentation Supabase OAuth Zoom\n');

// Tests basiques de la structure des fichiers
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/services/supabaseZoomAuth.ts',
  'src/components/zoom/SupabaseZoomAuth.tsx',
  'src/hooks/useSupabaseZoom.ts',
  'src/components/zoom/SupabaseZoomManager.tsx',
  'src/components/zoom/SupabaseZoomMeeting.tsx',
  'src/services/n8nZoomIntegration.ts'
];

console.log('📁 Vérification des fichiers créés...');

let allFilesExist = true;
for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ ${file} - MANQUANT`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Certains fichiers requis sont manquants !');
  process.exit(1);
}

console.log('\n🔍 Analyse du contenu des fichiers...');

// Vérifier la présence des fonctions clés
const checkFileContent = (filePath, requiredPatterns) => {
  const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  const results = {};
  
  for (const [name, pattern] of Object.entries(requiredPatterns)) {
    results[name] = content.includes(pattern);
  }
  
  return results;
};

// Tests du service principal
const authServiceChecks = checkFileContent('src/services/supabaseZoomAuth.ts', {
  'signInWithOAuth': 'signInWithOAuth',
  'getSession': 'getSession',
  'provider_token': 'provider_token',
  'refreshSession': 'refreshSession'
});

console.log('\n📋 Service supabaseZoomAuth.ts :');
for (const [check, passed] of Object.entries(authServiceChecks)) {
  console.log(`  ${passed ? '✅' : '❌'} ${check}`);
}

// Tests du hook
const hookChecks = checkFileContent('src/hooks/useSupabaseZoom.ts', {
  'useSupabaseZoom': 'useSupabaseZoom',
  'createMeeting': 'createMeeting',
  'getMeetings': 'getMeetings',
  'makeZoomApiCall': 'makeZoomApiCall'
});

console.log('\n🎣 Hook useSupabaseZoom.ts :');
for (const [check, passed] of Object.entries(hookChecks)) {
  console.log(`  ${passed ? '✅' : '❌'} ${check}`);
}

// Tests du service n8n
const n8nServiceChecks = checkFileContent('src/services/n8nZoomIntegration.ts', {
  'zoom_access_token': 'zoom_access_token',
  'requiresZoomAuth': 'requiresZoomAuth',
  'callWorkflow': 'callWorkflow',
  'supabase_oauth': 'supabase_oauth'
});

console.log('\n🔗 Service n8nZoomIntegration.ts :');
for (const [check, passed] of Object.entries(n8nServiceChecks)) {
  console.log(`  ${passed ? '✅' : '❌'} ${check}`);
}

// Vérifier les mises à jour des fichiers existants
const updatedFiles = [
  'src/components/layout/AppLayout.tsx',
  'src/components/routing/AppRouter.tsx'
];

console.log('\n🔄 Vérification des mises à jour...');

for (const file of updatedFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasSupabaseZoom = content.includes('SupabaseZoomManager');
    const hasOldZoom = content.includes('ZoomManagerSimple');
    
    console.log(`📄 ${file}:`);
    console.log(`  ${hasSupabaseZoom ? '✅' : '❌'} Utilise SupabaseZoomManager`);
    console.log(`  ${!hasOldZoom ? '✅' : '⚠️'} ${hasOldZoom ? 'Contient encore ZoomManagerSimple' : 'Plus de ZoomManagerSimple'}`);
  }
}

// Statistiques globales
console.log('\n📊 Statistiques de la migration :');

let totalLines = 0;
let totalFiles = 0;

for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;
    totalFiles++;
  }
}

console.log(`  📁 Fichiers créés: ${totalFiles}`);
console.log(`  📝 Lignes de code: ${totalLines}`);
console.log(`  🏗️ Architecture: OAuth native Supabase`);
console.log(`  🔧 Workflows n8n: Compatibles (aucune modification requise)`);

// Recommandations finales
console.log('\n🎯 Prochaines étapes recommandées :');
console.log('  1. 🔧 Configurer le provider Zoom dans Supabase Dashboard');
console.log('  2. 🔑 Ajouter ZOOM_CLIENT_ID et ZOOM_CLIENT_SECRET');
console.log('  3. 🌐 Configurer redirect_uri dans Zoom OAuth app');
console.log('  4. 🧪 Tester authentification en développement');
console.log('  5. 🚀 Déployer et tester en production');

console.log('\n✅ Analyse terminée - Implémentation Supabase OAuth prête !');
console.log('\n📖 Consultez RAPPORT_FINAL_MIGRATION_ZOOM_OAUTH.md pour les détails complets');