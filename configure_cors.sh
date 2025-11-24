#!/bin/bash

# Script pour configurer CORS via l'API Supabase Management
# Documentation: https://supabase.com/docs/guides/platform/api

set -e

echo "🔧 Configuration CORS pour Supabase..."
echo ""

# Variables
PROJECT_REF="wjzlicokhxitmeoxkjzv"

# Demander le token d'accès Supabase
echo "Pour configurer CORS, nous avons besoin d'un token d'accès Supabase."
echo ""
echo "📝 Comment obtenir votre token:"
echo "1. Va sur https://supabase.com/dashboard/account/tokens"
echo "2. Clique sur 'Generate new token'"
echo "3. Donne un nom au token (ex: 'CORS Config')"
echo "4. Copie le token généré"
echo ""
read -p "Colle ton token d'accès Supabase ici: " SUPABASE_ACCESS_TOKEN
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Token manquant. Abandon."
  exit 1
fi

echo "🔍 Récupération de la configuration actuelle..."
echo ""

# Récupérer la configuration actuelle du projet
CURRENT_CONFIG=$(curl -s -X GET \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "Configuration actuelle:"
echo "$CURRENT_CONFIG" | jq '.' || echo "$CURRENT_CONFIG"
echo ""

# Configuration CORS à appliquer
CORS_CONFIG='{
  "allowed_origins": [
    "http://localhost:5173",
    "https://centrinote.fr"
  ]
}'

echo "🚀 Application de la configuration CORS..."
echo "Origines autorisées:"
echo "  - http://localhost:5173"
echo "  - https://centrinote.fr"
echo ""

# Appliquer la configuration CORS
RESPONSE=$(curl -s -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/cors" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$CORS_CONFIG")

echo "Réponse de l'API:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Erreur lors de la configuration CORS"
  echo ""
  echo "⚠️  Solution alternative:"
  echo "Configure CORS manuellement dans le Dashboard Supabase:"
  echo "1. Va sur https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
  echo "2. Cherche la section 'Additional Configuration' ou 'CORS'"
  echo "3. Ajoute les origines:"
  echo "   - http://localhost:5173"
  echo "   - https://centrinote.fr"
  exit 1
else
  echo "✅ CORS configuré avec succès!"
  echo ""
  echo "🔄 Redémarrage du serveur de dev recommandé..."
  echo "Lance: npm run dev"
fi
