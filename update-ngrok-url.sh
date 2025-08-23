#!/bin/bash

# Script pour détecter et mettre à jour automatiquement l'URL ngrok
# Usage: ./update-ngrok-url.sh

echo "🔍 Détection de l'URL ngrok actuelle..."

# Fonction pour détecter l'URL ngrok
get_ngrok_url() {
    # Essayer d'obtenir l'URL depuis l'API ngrok locale
    local ngrok_api="http://localhost:4040/api/tunnels"
    
    if curl -s "$ngrok_api" > /dev/null 2>&1; then
        # ngrok est en cours d'exécution, récupérer l'URL HTTPS
        local url=$(curl -s "$ngrok_api" | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)
        if [[ -n "$url" ]]; then
            echo "$url"
            return 0
        fi
    fi
    
    # Fallback: demander à l'utilisateur
    echo ""
    echo "❌ Impossible de détecter automatiquement l'URL ngrok"
    echo "📋 Vérifiez votre terminal ngrok pour l'URL HTTPS"
    echo "💡 Exemple: https://abc123def456.ngrok-free.app"
    echo ""
    read -p "🔗 Entrez l'URL ngrok actuelle: " manual_url
    echo "$manual_url"
}

# Obtenir l'URL ngrok
NGROK_URL=$(get_ngrok_url)

# Valider l'URL
if [[ ! "$NGROK_URL" =~ ^https://.*\.ngrok.*$ ]]; then
    echo "❌ URL ngrok invalide: $NGROK_URL"
    echo "🔗 Format attendu: https://xxxxx.ngrok-free.app"
    exit 1
fi

echo "✅ URL ngrok détectée: $NGROK_URL"

# Backup de l'ancien .env
if [[ -f .env ]]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "💾 Backup créé: .env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Mettre à jour toutes les URLs dans .env
echo "🔄 Mise à jour du fichier .env..."

# Variables à mettre à jour
declare -A vars=(
    ["VITE_ZOOM_REDIRECT_URI"]="${NGROK_URL}/auth/callback"
    ["APP_PUBLIC_URL"]="${NGROK_URL}"
    ["ZOOM_REDIRECT_URI"]="${NGROK_URL}/auth/callback"
    ["CLIENT_URL"]="${NGROK_URL}"
    ["VITE_BACKEND_URL"]="${NGROK_URL}"
)

# Créer un nouveau .env si il n'existe pas
if [[ ! -f .env ]]; then
    touch .env
fi

# Mettre à jour chaque variable
for var in "${!vars[@]}"; do
    value="${vars[$var]}"
    
    if grep -q "^${var}=" .env; then
        # Variable existe, la remplacer
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${var}=.*|${var}=${value}|g" .env
        else
            # Linux
            sed -i "s|^${var}=.*|${var}=${value}|g" .env
        fi
        echo "✅ Mis à jour: ${var}=${value}"
    else
        # Variable n'existe pas, l'ajouter
        echo "${var}=${value}" >> .env
        echo "➕ Ajouté: ${var}=${value}"
    fi
done

echo ""
echo "🎯 URLs mises à jour avec: $NGROK_URL"
echo ""
echo "📋 Actions suivantes:"
echo "1. 🔄 Redémarrez vos serveurs (frontend et backend)"
echo "2. 🌐 Mettez à jour Zoom Marketplace avec:"
echo "   └── ${NGROK_URL}/auth/callback"
echo "3. 🧪 Testez l'authentification Zoom"
echo ""

# Proposer d'ouvrir Zoom Marketplace
read -p "🤔 Voulez-vous ouvrir Zoom Marketplace maintenant ? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌐 Ouverture de Zoom Marketplace..."
    open "https://marketplace.zoom.us/"
    echo ""
    echo "📋 Dans Zoom Marketplace:"
    echo "   1. Manage → Built Apps → Votre app OAuth"
    echo "   2. Onglet 'OAuth'"
    echo "   3. Redirect URL for OAuth:"
    echo "      └── ${NGROK_URL}/auth/callback"
    echo "   4. Save et attendre 2-3 minutes"
fi

echo ""
echo "✅ Mise à jour terminée !"