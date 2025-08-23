#!/bin/bash

echo "🎯 Test OAuth Zoom PURE - Sans SDK"
echo "================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔍 Vérification configuration OAuth PURE..."

# Vérifier que les variables SDK sont supprimées
if grep -q "ZOOM_SDK" .env; then
    error "Variables SDK détectées dans .env - doivent être supprimées"
    grep "ZOOM_SDK" .env
    exit 1
else
    success "Variables SDK supprimées du .env"
fi

# Vérifier configuration OAuth
CLIENT_ID=$(grep "VITE_ZOOM_CLIENT_ID=" .env | cut -d'=' -f2)
REDIRECT_URI=$(grep "VITE_ZOOM_REDIRECT_URI=" .env | cut -d'=' -f2)

echo ""
echo "📋 Configuration OAuth détectée :"
echo "   Client ID: $CLIENT_ID"
echo "   Redirect URI: $REDIRECT_URI"

# Vérifications
if [[ "$CLIENT_ID" == "gRUJc8RvTgqjYZb1op3gNQ" ]]; then
    success "Client ID correct"
else
    error "Client ID incorrect : $CLIENT_ID"
fi

if [[ "$REDIRECT_URI" == "https://unified-suitably-caribou.ngrok-free.app/auth/callback" ]]; then
    success "Redirect URI correct"
else
    error "Redirect URI incorrect : $REDIRECT_URI"
fi

echo ""
echo "🌐 Test génération URL OAuth..."

# Tester backend
if curl -s http://localhost:5174/auth/zoom > /dev/null; then
    success "Backend accessible"
    
    # Tester génération URL
    OAUTH_RESPONSE=$(curl -s http://localhost:5174/auth/zoom)
    
    if echo "$OAUTH_RESPONSE" | grep -q "success"; then
        success "URL OAuth générée"
        
        # Extraire et vérifier URL
        AUTH_URL=$(echo "$OAUTH_RESPONSE" | grep -o 'https://zoom.us/oauth/authorize[^"]*' | head -1)
        echo ""
        echo "🎯 URL OAuth générée :"
        echo "$AUTH_URL"
        echo ""
        
        # Vérifications URL
        if echo "$AUTH_URL" | grep -q "client_id=gRUJc8RvTgqjYZb1op3gNQ"; then
            success "Client ID correct dans URL"
        else
            error "Client ID incorrect dans URL"
        fi
        
        if echo "$AUTH_URL" | grep -q "redirect_uri=.*unified-suitably-caribou"; then
            success "Redirect URI correct dans URL"
        else
            error "Redirect URI incorrect dans URL"
        fi
        
        if echo "$AUTH_URL" | grep -q "scope=meeting"; then
            success "Scopes OAuth présents"
        else
            warning "Scopes OAuth manquants ou différents"
        fi
        
    else
        error "Erreur génération URL OAuth"
        echo "Réponse: $OAUTH_RESPONSE"
    fi
    
else
    error "Backend non accessible sur port 5174"
    echo "💡 Démarrez le backend avec: cd server && npm start"
fi

echo ""
echo "📋 Configuration à vérifier dans Zoom Marketplace :"
echo "   🔗 OAuth App URL: https://marketplace.zoom.us/develop/create"
echo "   📱 App Type: OAuth"
echo "   🆔 Client ID: gRUJc8RvTgqjYZb1op3gNQ"
echo "   🔄 Redirect URI: https://unified-suitably-caribou.ngrok-free.app/auth/callback"
echo "   🎯 Scopes: meeting:read meeting:write user:read"
echo ""

echo "🎯 Test manuel OAuth :"
echo "   1. Ouvrez: https://unified-suitably-caribou.ngrok-free.app"
echo "   2. Cliquez 'Se connecter avec Zoom'"
echo "   3. Autorisez l'application"
echo "   4. Vérifiez la redirection réussie"
echo ""

echo "✅ Test OAuth PURE terminé !"