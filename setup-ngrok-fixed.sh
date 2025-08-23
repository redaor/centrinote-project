#!/bin/bash

# Script pour configurer ngrok avec un domaine fixe
# Usage: ./setup-ngrok-fixed.sh

echo "🚀 Configuration ngrok avec domaine fixe..."

# Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok n'est pas installé"
    echo "📦 Installez ngrok avec: brew install ngrok"
    exit 1
fi

# Vérifier si l'utilisateur est connecté à ngrok
if ! ngrok config check &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à ngrok"
    echo "🔑 Connectez-vous avec: ngrok authtoken VOTRE_TOKEN"
    echo "🔗 Obtenez votre token sur: https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
fi

echo "✅ ngrok est installé et configuré"

# Créer un fichier de configuration ngrok
cat > ngrok.yml << EOF
version: "2"
authtoken_from_env: true
tunnels:
  centrinote-backend:
    addr: 5174
    proto: http
    subdomain: centrinote-dev
    bind_tls: true
  centrinote-frontend:
    addr: 5173
    proto: http
    subdomain: centrinote-app
    bind_tls: true
EOF

echo "📝 Configuration ngrok créée (ngrok.yml)"

# Afficher les instructions
echo ""
echo "🎯 Votre domaine fixe sera: https://centrinote-dev.ngrok.io"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Démarrez ngrok avec: ngrok start --all --config=ngrok.yml"
echo "2. Votre backend sera accessible via: https://centrinote-dev.ngrok.io"
echo "3. Mettez à jour votre .env avec cette URL fixe"
echo "4. Configurez Zoom Marketplace avec: https://centrinote-dev.ngrok.io/auth/callback"
echo ""
echo "⚠️  Note: Le sous-domaine 'centrinote-dev' doit être disponible"
echo "    Si pris, modifiez 'subdomain' dans ngrok.yml"
echo ""

# Demander si on doit mettre à jour le .env automatiquement
read -p "🤔 Voulez-vous mettre à jour automatiquement le .env ? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Mettre à jour le .env
    FIXED_URL="https://centrinote-dev.ngrok.io"
    
    # Backup de l'ancien .env
    cp .env .env.backup
    echo "💾 Backup créé: .env.backup"
    
    # Remplacer les URLs dans .env
    sed -i.bak "s|VITE_ZOOM_REDIRECT_URI=.*|VITE_ZOOM_REDIRECT_URI=${FIXED_URL}/auth/callback|g" .env
    sed -i.bak "s|APP_PUBLIC_URL=.*|APP_PUBLIC_URL=${FIXED_URL}|g" .env
    sed -i.bak "s|ZOOM_REDIRECT_URI=.*|ZOOM_REDIRECT_URI=${FIXED_URL}/auth/callback|g" .env
    sed -i.bak "s|CLIENT_URL=.*|CLIENT_URL=${FIXED_URL}|g" .env
    sed -i.bak "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=${FIXED_URL}|g" .env
    
    # Nettoyer les fichiers temporaires
    rm .env.bak 2>/dev/null
    
    echo "✅ .env mis à jour avec l'URL fixe: ${FIXED_URL}"
    echo ""
    echo "🔄 Redémarrez vos serveurs pour appliquer les changements"
fi

echo ""
echo "🚀 Pour démarrer ngrok avec domaine fixe:"
echo "   ngrok start --all --config=ngrok.yml"