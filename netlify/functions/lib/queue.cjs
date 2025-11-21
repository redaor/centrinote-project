// 🚀 Queue pg-boss pour Netlify Functions (CommonJS)
const PgBoss = require('pg-boss');

let boss = null;

async function getBoss() {
  if (boss) {
    return boss;
  }

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL ou SUPABASE_DB_URL doit être configuré pour pg-boss');
  }

  boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    retryLimit: 3,
    retryDelay: 5000,
    deleteAfterHours: 24,
    maxConcurrency: 10,
  });

  await boss.start();
  console.log('✅ [QUEUE-NETLIFY] pg-boss démarré');

  return boss;
}

module.exports = { getBoss };
