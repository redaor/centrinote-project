#!/bin/bash

echo "🔍 Vérification Configuration Zoom OAuth"
echo "========================================"
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour extraire variable d'un fichier .env
get_env_var() {
    local file=$1
    local var=$2
    if [[ -f "$file" ]]; then
        grep "^$var=" "$file" 2>/dev/null | cut -d'=' -f2- | head -1
    fi
}

echo "📋 Vérification des fichiers de configuration..."

# Vérifier existence des fichiers
if [[ -f ".env" ]]; then
    success "Fichier .env principal trouvé"
else
    error "Fichier .env principal manquant"
    exit 1
fi

if [[ -f "server/.env" ]]; then
    success "Fichier server/.env trouvé"
else
    error "Fichier server/.env manquant"
    exit 1
fi

echo ""
echo "🔑 Vérification des credentials Zoom..."

# Extraire credentials du fichier principal
MAIN_CLIENT_ID=$(get_env_var ".env" "VITE_ZOOM_CLIENT_ID")
MAIN_SDK_KEY=$(get_env_var ".env" "VITE_ZOOM_SDK_KEY")
MAIN_SDK_SECRET=$(get_env_var ".env" "VITE_ZOOM_SDK_SECRET")
MAIN_BACKEND_CLIENT_ID=$(get_env_var ".env" "ZOOM_CLIENT_ID")
MAIN_BACKEND_SECRET=$(get_env_var ".env" "ZOOM_CLIENT_SECRET")

# Extraire credentials du serveur
SERVER_CLIENT_ID=$(get_env_var "server/.env" "ZOOM_CLIENT_ID")
SERVER_SECRET=$(get_env_var "server/.env" "ZOOM_CLIENT_SECRET")

echo "📊 Credentials détectées :"
echo "   Frontend Client ID: $MAIN_CLIENT_ID"
echo "   Frontend SDK Key:   $MAIN_SDK_KEY"
echo "   Backend Client ID:  $MAIN_BACKEND_CLIENT_ID"
echo "   Server Client ID:   $SERVER_CLIENT_ID"
echo ""

# Vérifications de cohérence
echo "🔍 Vérifications de cohérence..."

# Vérifier que toutes les credentials sont présentes
if [[ -n "$MAIN_CLIENT_ID" ]]; then
    success "Frontend Client ID configuré"
else
    error "Frontend Client ID manquant (VITE_ZOOM_CLIENT_ID)"
fi

if [[ -n "$MAIN_SDK_SECRET" ]]; then
    success "Frontend SDK Secret configuré"
else
    error "Frontend SDK Secret manquant (VITE_ZOOM_SDK_SECRET)"
fi

if [[ -n "$SERVER_CLIENT_ID" ]]; then
    success "Server Client ID configuré"
else
    error "Server Client ID manquant"
fi

if [[ -n "$SERVER_SECRET" ]]; then
    success "Server Client Secret configuré"
else
    error "Server Client Secret manquant"
fi

# Vérifier cohérence entre fichiers
if [[ "$MAIN_CLIENT_ID" == "$MAIN_SDK_KEY" ]]; then
    success "Frontend: Client ID et SDK Key cohérents"
else
    warning "Frontend: Client ID ($MAIN_CLIENT_ID) != SDK Key ($MAIN_SDK_KEY)"
fi

if [[ "$MAIN_CLIENT_ID" == "$MAIN_BACKEND_CLIENT_ID" ]]; then
    success "Client ID cohérent entre frontend et backend (.env)"
else
    error "Client ID incohérent: Frontend=$MAIN_CLIENT_ID, Backend=$MAIN_BACKEND_CLIENT_ID"
fi

if [[ "$MAIN_BACKEND_CLIENT_ID" == "$SERVER_CLIENT_ID" ]]; then
    success "Client ID cohérent entre .env et server/.env"
else
    error "Client ID incohérent: .env=$MAIN_BACKEND_CLIENT_ID, server/.env=$SERVER_CLIENT_ID"
fi

if [[ "$MAIN_BACKEND_SECRET" == "$SERVER_SECRET" ]]; then
    success "Client Secret cohérent entre .env et server/.env"
else
    error "Client Secret incohérent entre fichiers"
fi

echo ""
echo "🌐 Vérification des URLs..."

# Vérifier URLs
MAIN_REDIRECT=$(get_env_var ".env" "VITE_ZOOM_REDIRECT_URI")
BACKEND_REDIRECT=$(get_env_var ".env" "ZOOM_REDIRECT_URI")
SERVER_REDIRECT=$(get_env_var "server/.env" "ZOOM_REDIRECT_URI")

echo "   Frontend Redirect: $MAIN_REDIRECT"
echo "   Backend Redirect:  $BACKEND_REDIRECT"
echo "   Server Redirect:   $SERVER_REDIRECT"

if [[ "$MAIN_REDIRECT" == "$BACKEND_REDIRECT" && "$BACKEND_REDIRECT" == "$SERVER_REDIRECT" ]]; then
    success "URLs de redirection cohérentes"
else
    error "URLs de redirection incohérentes"
fi

# Vérifier format URL
if [[ "$MAIN_REDIRECT" == *"/auth/callback" ]]; then
    success "Format URL de redirection correct"
else
    error "Format URL de redirection incorrect (doit finir par /auth/callback)"
fi

echo ""
echo "📋 Nouvelles credentials configurées :"
echo "   Client ID: gRUJc8RvTgqjYZb1op3gNQ"
echo "   Client Secret: eP8pbyKRyZrHMekAIRwL3iEfW0qLiyOL"
echo "   Redirect URI: https://unified-suitably-caribou.ngrok-free.app/auth/callback"
echo ""

# Test de validation format
if [[ "$MAIN_CLIENT_ID" == "gRUJc8RvTgqjYZb1op3gNQ" ]]; then
    success "Nouvelles credentials correctement configurées"
else
    error "Credentials pas à jour (trouvé: $MAIN_CLIENT_ID)"
fi

echo ""
echo "🚀 Prochaines étapes pour tester :"
echo "   1. Redémarrez vos serveurs :"
echo "      cd server && npm start                    # Terminal 1"
echo "      npm run dev                               # Terminal 2"
echo ""
echo "   2. Testez l'authentification :"
echo "      https://unified-suitably-caribou.ngrok-free.app"
echo ""
echo "   3. Vérifiez dans Zoom Marketplace que :"
echo "      - Client ID: gRUJc8RvTgqjYZb1op3gNQ"
echo "      - Redirect URI: https://unified-suitably-caribou.ngrok-free.app/auth/callback"
echo ""

echo "✅ Vérification terminée !"