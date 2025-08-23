#!/bin/bash

echo "🔧 Configuration ngrok v3 avec domaine réservé"
echo "=============================================="
echo ""

# Vérifier ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok non installé. Exécutez: brew install ngrok"
    exit 1
fi

# Vérifier la version
NGROK_VERSION=$(ngrok version | head -1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
echo "📋 Version ngrok détectée: $NGROK_VERSION"

# Vérifier l'authentification
if ! ngrok config check &> /dev/null; then
    echo "❌ Token ngrok manquant"
    echo "🔑 1. Allez sur: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "🔑 2. Copiez votre token"
    echo "🔑 3. Exécutez: ngrok authtoken VOTRE_TOKEN"
    exit 1
fi

echo "✅ ngrok authentifié"
echo ""

# Proposer deux options
echo "🎯 Options de configuration pour ngrok v3:"
echo ""
echo "Option 1: 🆓 Domaine réservé gratuit (RECOMMANDÉ)"
echo "   - Réservez un domaine gratuit sur ngrok dashboard"
echo "   - URL fixe pour toujours"
echo ""
echo "Option 2: 🔄 URLs dynamiques avec mise à jour auto"
echo "   - Utilise les scripts de mise à jour automatique"
echo "   - Fonctionne immédiatement"
echo ""

read -p "Choisissez (1 pour domaine réservé, 2 pour dynamique): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Configuration domaine réservé ngrok"
        echo "======================================"
        echo ""
        echo "📋 Étapes pour réserver un domaine gratuit:"
        echo "1. 🔗 Allez sur: https://dashboard.ngrok.com/cloud-edge/domains"
        echo "2. 🆕 Cliquez 'Create Domain' ou 'New Domain'"
        echo "3. 📝 Choisissez un nom (ex: centrinote-reda-dev)"
        echo "4. 💾 Sauvegardez le domaine"
        echo ""
        
        read -p "Avez-vous déjà réservé un domaine ? (y/n): " has_domain
        
        if [[ $has_domain =~ ^[Yy]$ ]]; then
            read -p "🔗 Entrez votre domaine réservé (ex: centrinote-reda-dev.ngrok-free.app): " reserved_domain
            
            # Créer ngrok.yml avec domaine réservé
            cat > ngrok.yml << EOF
version: 2
tunnels:
  backend:
    addr: 5174
    proto: http
    domain: $reserved_domain
EOF
            
            echo "✅ Configuration créée avec domaine réservé: $reserved_domain"
            
            # Mettre à jour les .env avec le domaine réservé
            echo "🔄 Mise à jour des fichiers .env..."
            
            # Mise à jour .env principal
            sed -i.bak "s|VITE_ZOOM_REDIRECT_URI=.*|VITE_ZOOM_REDIRECT_URI=https://${reserved_domain}/auth/callback|g" .env
            sed -i.bak "s|APP_PUBLIC_URL=.*|APP_PUBLIC_URL=https://${reserved_domain}|g" .env
            sed -i.bak "s|ZOOM_REDIRECT_URI=.*|ZOOM_REDIRECT_URI=https://${reserved_domain}/auth/callback|g" .env
            sed -i.bak "s|CLIENT_URL=.*|CLIENT_URL=https://${reserved_domain}|g" .env
            sed -i.bak "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=https://${reserved_domain}|g" .env
            
            # Mise à jour server/.env
            sed -i.bak "s|ZOOM_REDIRECT_URI=.*|ZOOM_REDIRECT_URI=https://${reserved_domain}/auth/callback|g" server/.env
            sed -i.bak "s|CLIENT_URL=.*|CLIENT_URL=https://${reserved_domain}|g" server/.env
            sed -i.bak "s|APP_PUBLIC_URL=.*|APP_PUBLIC_URL=https://${reserved_domain}|g" server/.env
            
            # Nettoyer fichiers backup
            rm .env.bak server/.env.bak 2>/dev/null
            
            echo "✅ Fichiers .env mis à jour avec: https://${reserved_domain}"
            echo ""
            echo "🎯 VOTRE URL FIXE PERMANENTE:"
            echo "   https://${reserved_domain}"
            echo ""
            echo "📋 Configuration Zoom Marketplace:"
            echo "   https://${reserved_domain}/auth/callback"
            echo ""
            echo "🚀 Pour démarrer:"
            echo "   ngrok start --all --config=ngrok.yml"
            
        else
            echo ""
            echo "🔗 Ouvrez le dashboard ngrok pour réserver un domaine:"
            open "https://dashboard.ngrok.com/cloud-edge/domains" 2>/dev/null || echo "https://dashboard.ngrok.com/cloud-edge/domains"
            echo ""
            echo "Une fois le domaine réservé, relancez ce script !"
        fi
        ;;
    2)
        echo ""
        echo "🔄 Configuration URLs dynamiques"
        echo "================================"
        echo ""
        echo "✅ Utilisation du système de mise à jour automatique"
        echo "📋 Workflow:"
        echo "   1. Démarrez ngrok: ngrok start --all --config=ngrok.yml"
        echo "   2. Récupérez la nouvelle URL"
        echo "   3. Exécutez: ./update-ngrok-url.sh"
        echo ""
        echo "🎯 Configuration ngrok.yml créée pour mode dynamique"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

echo ""
echo "✅ Configuration terminée !"