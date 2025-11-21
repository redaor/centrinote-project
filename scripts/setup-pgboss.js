// 🔧 Script pour initialiser pg-boss dans Supabase
// Usage: node scripts/setup-pgboss.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupPGBoss() {
  try {
    console.log('🔧 Création du schéma pgboss...');
    
    // Créer le schéma pgboss
    const { error: schemaError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE SCHEMA IF NOT EXISTS pgboss;'
    });

    if (schemaError) {
      console.warn('⚠️ Erreur création schéma (peut-être déjà créé):', schemaError.message);
    } else {
      console.log('✅ Schéma pgboss créé');
    }

    console.log('\n📋 IMPORTANT: Pour finaliser la configuration pg-boss,');
    console.log('   exécutez cette commande dans Supabase SQL Editor :');
    console.log('   CREATE SCHEMA IF NOT EXISTS pgboss;');
    console.log('\n   Ensuite, pg-boss créera automatiquement ses tables au premier démarrage.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n📋 Alternative: Exécutez manuellement dans Supabase SQL Editor :');
    console.log('   CREATE SCHEMA IF NOT EXISTS pgboss;');
  }
}

setupPGBoss();

