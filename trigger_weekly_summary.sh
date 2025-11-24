#!/bin/bash

# Script pour tester l'automatisation weekly-summary manuellement

set -e

echo "🧪 Test de l'automatisation weekly-summary"
echo ""

# Récupérer la service key depuis les secrets Supabase
SERVICE_KEY=$(supabase secrets list | grep SUPABASE_SERVICE_ROLE_KEY | awk '{print $1}')

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY non trouvé dans les secrets"
  echo "ℹ️  Récupère-le depuis le Dashboard Supabase → Settings → API"
  exit 1
fi

echo "1️⃣ Mise à jour de next_execution_at pour forcer l'exécution..."
echo ""

# Note: Tu devras exécuter ce SQL manuellement dans le Dashboard Supabase
cat << 'EOF'
-- Exécute ce SQL dans le Dashboard Supabase (SQL Editor):

UPDATE automations
SET
  next_execution_at = NOW() - INTERVAL '1 minute',
  updated_at = NOW()
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND name = 'weekly-summary';

SELECT
  name,
  is_active,
  next_execution_at,
  NOW() as current_time,
  (next_execution_at <= NOW()) as should_execute
FROM automations
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND name = 'weekly-summary';
EOF

echo ""
echo "2️⃣ Appuie sur Entrée après avoir exécuté le SQL ci-dessus..."
read

echo ""
echo "3️⃣ Déclenchement du scheduler..."
echo ""

# Déclencher le scheduler
curl -X POST \
  "https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/automation-scheduler" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "4️⃣ Vérification des logs..."
echo ""

# Afficher les logs récents
supabase functions logs automation-scheduler --limit 50

echo ""
echo "✅ Test terminé ! Vérifie ton email reda_sahraoui@outlook.fr pour le résumé hebdomadaire."
