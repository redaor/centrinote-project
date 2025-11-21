// 🔧 Script de vérification des variables d'environnement pour Daily.co
// Compatible avec développement local (VITE_) et production Netlify (REACT_APP_)

const requiredEnvVars = [
  // Daily.co
  'VITE_DAILY_API_KEY',
  'VITE_DAILY_DOMAIN',
  
  // Webhooks n8n
  'VITE_N8N_DAILY_RECORDING',
  'VITE_N8N_DAILY_EVENTS',
  
  // Supabase
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  
  // Application
  'VITE_APP_URL'
];

// Variables alternatives pour Netlify
const netlifyVars = {
  'VITE_DAILY_API_KEY': 'DAILY_API_KEY',
  'VITE_DAILY_DOMAIN': 'REACT_APP_DAILY_DOMAIN',
  'VITE_N8N_DAILY_RECORDING': 'REACT_APP_N8N_RECORDING_WEBHOOK',
  'VITE_N8N_DAILY_EVENTS': 'REACT_APP_N8N_EVENTS_WEBHOOK',
  'VITE_SUPABASE_URL': 'REACT_APP_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY': 'REACT_APP_SUPABASE_ANON_KEY'
};

console.log('🔍 Vérification des variables d\'environnement...\n');

// Fonction pour obtenir une variable avec fallback
function getEnvVar(primaryKey) {
  return process.env[primaryKey] || process.env[netlifyVars[primaryKey]] || null;
}

// Vérifier les variables avec fallback
console.log('📱 Variables de configuration:');
const missingVars = [];

requiredEnvVars.forEach(key => {
  const value = getEnvVar(key);
  const status = value ? '✅' : '❌';
  const display = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'NON CONFIGURÉE';
  
  // Afficher quelle variable est utilisée
  const usedKey = process.env[key] ? key : (process.env[netlifyVars[key]] ? netlifyVars[key] : 'MANQUANTE');
  
  console.log(`  ${status} ${key}: ${display} ${usedKey !== key && usedKey !== 'MANQUANTE' ? `(via ${usedKey})` : ''}`);
  
  if (!value) {
    missingVars.push(key);
  }
});

// Résumé
if (missingVars.length > 0) {
  console.log('\n⚠️ Variables manquantes:');
  missingVars.forEach(key => {
    console.log(`   - ${key} (ou ${netlifyVars[key]})`);
  });
  
  console.log('\n💡 Solutions:');
  console.log('   • Développement local: Ajouter VITE_* à .env.local');
  console.log('   • Production Netlify: Configurer REACT_APP_* et DAILY_API_KEY sur le dashboard');
} else {
  console.log('\n✅ Toutes les variables sont configurées');
}

// Mode non-bloquant pour Netlify
const isNetlifyBuild = process.env.NETLIFY === 'true';
if (isNetlifyBuild) {
  console.log('\n🏗️ Build Netlify détecté - Mode non-bloquant activé');
  console.log('Les variables manquantes seront vérifiées au runtime.');
  process.exit(0); // Toujours succès sur Netlify
}

// Vérification détaillée pour développement local
const dailyKey = getEnvVar('VITE_DAILY_API_KEY');
const dailyDomain = getEnvVar('VITE_DAILY_DOMAIN');

if (dailyKey && dailyDomain) {
  console.log('\n🎥 Configuration Daily.co:');
  console.log(`   Domaine: ${dailyDomain}`);
  console.log(`   API Key: ${dailyKey.substring(0, 8)}...`);
} else {
  console.log('\n❌ Configuration Daily.co incomplète');
}

// Exit code pour développement local
if (missingVars.length > 0) {
  console.log('\n🔧 Redémarrez après avoir ajouté les variables manquantes');
  process.exit(1);
} else {
  console.log('\n🚀 Configuration prête!');
  process.exit(0);
}