#!/usr/bin/env node

// 🔧 Script pour initialiser pg-boss dans Supabase
// Ce script crée les tables nécessaires pour pg-boss

// Charger les variables d'environnement manuellement depuis .env
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
  console.log('✅ [INIT-PGBOSS] Variables d\'environnement chargées depuis .env');
}

const { getBoss } = require('../jobs/queue');

async function initPgBoss() {
  console.log('🚀 [INIT-PGBOSS] Initialisation de pg-boss...');

  try {
    // Appeler getBoss() va automatiquement créer les tables via boss.start()
    const boss = await getBoss();
    console.log('✅ [INIT-PGBOSS] pg-boss initialisé avec succès !');
    console.log('✅ [INIT-PGBOSS] Les tables pgboss.* ont été créées dans Supabase');

    // Test: Créer un job de test
    const testJobId = await boss.send('test-job', { message: 'Hello pg-boss!' });
    console.log('✅ [INIT-PGBOSS] Job de test créé:', testJobId);

    // Vérifier que le job existe
    const job = await boss.fetch('test-job');
    if (job) {
      console.log('✅ [INIT-PGBOSS] Job de test récupéré:', job.id);
      await boss.complete(job.id);
      console.log('✅ [INIT-PGBOSS] Job de test complété');
    }

    // Arrêter proprement
    await boss.stop();
    console.log('✅ [INIT-PGBOSS] pg-boss arrêté proprement');

    console.log('\n🎉 [INIT-PGBOSS] Initialisation terminée avec succès !');
    console.log('📋 [INIT-PGBOSS] Vous pouvez maintenant vérifier les tables dans Supabase SQL Editor:');
    console.log('   SELECT * FROM pgboss.job LIMIT 5;');

    process.exit(0);
  } catch (error) {
    console.error('❌ [INIT-PGBOSS] Erreur lors de l\'initialisation:', error);
    console.error('❌ [INIT-PGBOSS] Stack:', error.stack);
    process.exit(1);
  }
}

initPgBoss();
