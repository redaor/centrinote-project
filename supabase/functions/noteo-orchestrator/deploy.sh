#!/bin/bash

# Script de déploiement pour noteo-orchestrator
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement de noteo-orchestrator..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Déployer la fonction
echo "📤 Déploiement de la fonction..."
supabase functions deploy noteo-orchestrator

echo "✅ Déploiement terminé !"
echo ""
echo "📝 N'oubliez pas de configurer les secrets :"
echo "   supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx..."
echo "   supabase secrets set OPENAI_CHAT_KEY=sk-proj-yyy..."
echo "   supabase secrets set OPENAI_AIDE_KEY=sk-proj-zzz..."
echo ""
echo "🔗 URL de la fonction :"
supabase functions list | grep noteo-orchestrator || echo "   https://[project-ref].supabase.co/functions/v1/noteo-orchestrator"
