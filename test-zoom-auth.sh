#!/bin/bash

echo "🧪 Test Authentification Zoom OAuth"
echo "==================================="
echo ""

# Vérifier que les serveurs sont en cours d'exécution
echo "🔍 Vérification des serveurs..."

# Tester le backend
if curl -s http://localhost:5174/health > /dev/null; then
    echo "✅ Backend server (port 5174) en fonctionnement"
else
    echo "❌ Backend server non accessible sur port 5174"
    echo "💡 Démarrez le backend avec: cd server && npm start"
    exit 1
fi

# Tester ngrok
if curl -s http://localhost:4040/api/tunnels > /dev/null; then
    echo "✅ Ngrok en fonctionnement"
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)
    echo "🔗 URL ngrok détectée: $NGROK_URL"
else
    echo "❌ Ngrok non accessible"
    echo "💡 Démarrez ngrok avec: ngrok start --config=ngrok.yml backend"
    exit 1
fi

echo ""
echo "🔑 Test génération URL OAuth..."

# Tester la génération d'URL OAuth
AUTH_RESPONSE=$(curl -s http://localhost:5174/auth/zoom)

if echo "$AUTH_RESPONSE" | grep -q "success"; then
    echo "✅ Endpoint /auth/zoom fonctionne"
    
    # Extraire l'URL d'autorisation
    AUTH_URL=$(echo "$AUTH_RESPONSE" | grep -o 'https://zoom.us/oauth/authorize[^"]*' | head -1)
    
    if [[ -n "$AUTH_URL" ]]; then
        echo "✅ URL OAuth générée avec succès"
        echo ""
        echo "🎯 URL d'authentification Zoom :"
        echo "$AUTH_URL"
        echo ""
        
        # Vérifier que l'URL contient les bons paramètres
        if echo "$AUTH_URL" | grep -q "client_id=gRUJc8RvTgqjYZb1op3gNQ"; then
            echo "✅ Client ID correct dans l'URL OAuth"
        else
            echo "❌ Client ID incorrect dans l'URL OAuth"
        fi
        
        if echo "$AUTH_URL" | grep -q "redirect_uri=.*unified-suitably-caribou"; then
            echo "✅ Redirect URI correct dans l'URL OAuth"
        else
            echo "❌ Redirect URI incorrect dans l'URL OAuth"
        fi
        
        if echo "$AUTH_URL" | grep -q "scope="; then
            echo "✅ Scopes présents dans l'URL OAuth"
            SCOPES=$(echo "$AUTH_URL" | grep -o 'scope=[^&]*' | cut -d'=' -f2 | sed 's/%20/ /g')
            echo "📋 Scopes configurés: $SCOPES"
        else
            echo "❌ Scopes manquants dans l'URL OAuth"
        fi
        
    else
        echo "❌ Impossible d'extraire l'URL OAuth"
    fi
else
    echo "❌ Erreur lors de la génération URL OAuth"
    echo "📋 Réponse serveur: $AUTH_RESPONSE"
fi

echo ""
echo "🌐 Test accès via ngrok..."

# Tester l'accès via ngrok
if [[ -n "$NGROK_URL" ]]; then
    NGROK_HEALTH=$(curl -s "$NGROK_URL/health" 2>/dev/null)
    if echo "$NGROK_HEALTH" | grep -q "OK"; then
        echo "✅ Backend accessible via ngrok"
        
        # Tester l'endpoint OAuth via ngrok
        NGROK_AUTH=$(curl -s "$NGROK_URL/auth/zoom" 2>/dev/null)
        if echo "$NGROK_AUTH" | grep -q "success"; then
            echo "✅ Endpoint OAuth accessible via ngrok"
        else
            echo "❌ Endpoint OAuth non accessible via ngrok"
        fi
    else
        echo "❌ Backend non accessible via ngrok"
        echo "💡 Vérifiez que ngrok pointe vers le port 5174"
    fi
fi

echo ""
echo "📋 Résumé de la configuration :"
echo "   🆔 Client ID: gRUJc8RvTgqjYZb1op3gNQ"
echo "   🔗 Redirect URI: https://unified-suitably-caribou.ngrok-free.app/auth/callback"
echo "   🌐 URL Application: https://unified-suitably-caribou.ngrok-free.app"
echo ""

echo "🎯 Instructions pour test manuel :"
echo "   1. Ouvrez: https://unified-suitably-caribou.ngrok-free.app"
echo "   2. Cliquez sur 'Se connecter avec Zoom'"
echo "   3. Vérifiez que vous êtes redirigé vers Zoom OAuth"
echo "   4. Autorisez l'application"
echo "   5. Vérifiez le retour vers votre application"
echo ""

echo "⚠️  Vérifications à faire dans Zoom Marketplace :"
echo "   • Client ID: gRUJc8RvTgqjYZb1op3gNQ"
echo "   • Redirect URI: https://unified-suitably-caribou.ngrok-free.app/auth/callback"
echo "   • Scopes: meeting:read meeting:write user:read recording:read"
echo "   • App Type: OAuth"
echo ""

echo "✅ Test terminé !"