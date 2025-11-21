#!/usr/bin/env bash

# =====================================================
# 🔧 Script de Correction 401 sur automation-scheduler
# =====================================================

set -e

PROJECT_REF="wjzlicokhxitmeoxkjzv"

echo "🔍 Diagnostic du problème 401..."

# 1. Vérifier les secrets Edge Functions
echo ""
echo "1️⃣ Vérification des secrets Edge Functions..."
if supabase secrets list --project-ref "$PROJECT_REF" 2>/dev/null | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
  echo "   ✅ Secret SUPABASE_SERVICE_ROLE_KEY trouvé"
else
  echo "   ❌ Secret SUPABASE_SERVICE_ROLE_KEY MANQUANT"
  echo ""
  echo "   🔧 Pour corriger :"
  echo "   1. Allez dans Dashboard → Settings → API → service_role key"
  echo "   2. Copiez la clé"
  echo "   3. Exécutez :"
  echo "      supabase secrets set SUPABASE_SERVICE_ROLE_KEY=\"VOTRE_CLE_ICI\" --project-ref $PROJECT_REF"
fi

# 2. Vérifier les logs récents
echo ""
echo "2️⃣ Derniers logs automation-scheduler..."
supabase functions logs automation-scheduler --project-ref "$PROJECT_REF" --tail 5 2>/dev/null || echo "   ⚠️  Impossible de récupérer les logs"

# 3. Vérifier le code de l'Edge Function
echo ""
echo "3️⃣ Vérification du code automation-scheduler..."
if grep -q "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/automation-scheduler/index.ts 2>/dev/null; then
  echo "   ✅ Le code utilise SUPABASE_SERVICE_ROLE_KEY"
else
  echo "   ⚠️  Le code n'utilise pas SUPABASE_SERVICE_ROLE_KEY (peut utiliser Deno.env.get)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Actions à effectuer :"
echo ""
echo "1. Vérifier que le secret SUPABASE_SERVICE_ROLE_KEY est configuré"
echo "2. Vérifier que le cron SQL utilise la bonne clé"
echo "3. Redéployer l'Edge Function si nécessaire"
echo ""
echo "🔗 Dashboard : https://supabase.com/dashboard/project/$PROJECT_REF"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

