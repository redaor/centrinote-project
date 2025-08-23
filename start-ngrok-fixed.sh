#!/bin/bash

# Script pour démarrer ngrok avec domaine fixe
echo "🚀 Démarrage de ngrok avec domaine fixe..."

# Vérifier que ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok n'est pas installé"
    echo "📦 Installez avec: brew install ngrok"
    exit 1
fi

# Vérifier le token d'authentification
if ! ngrok config check &> /dev/null; then
    echo "❌ Token ngrok manquant"
    echo "🔑 Obtenez votre token sur: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "🔧 Puis exécutez: ngrok authtoken VOTRE_TOKEN"
    exit 1
fi

echo "✅ ngrok configuré, démarrage des tunnels..."

# Démarrer ngrok avec configuration
ngrok start --all --config=ngrok.yml

echo "🎯 Vos URLs fixes seront :"
echo "   Backend:  https://centrinote-reda-dev.ngrok.io"  
echo "   Frontend: https://centrinote-reda-app.ngrok.io"
echo ""
echo "⚠️  Si 'centrinote-reda-dev' est pris, modifiez le subdomain dans ngrok.yml"