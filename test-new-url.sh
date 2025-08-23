#!/bin/bash

echo "🧪 Test de la nouvelle URL"
echo "========================="

URL="https://centrinote-reda-0817.loca.lt"

echo "📡 Test de la connexion..."
if curl -s "$URL" > /dev/null; then
    echo "✅ URL accessible : $URL"
else
    echo "❌ URL non accessible"
    echo "💡 Assurez-vous que LocalTunnel est démarré"
fi

echo ""
echo "🔍 Test endpoint OAuth..."
OAUTH_RESPONSE=$(curl -s "$URL/auth/zoom" 2>/dev/null)

if echo "$OAUTH_RESPONSE" | grep -q "success"; then
    echo "✅ Endpoint OAuth fonctionnel"
    echo "🎯 URL OAuth générée avec succès"
else
    echo "❌ Problème avec endpoint OAuth"
    echo "💡 Vérifiez que le backend est démarré"
fi

echo ""
echo "📋 Informations :"
echo "   URL Application: $URL"
echo "   OAuth Callback: $URL/auth/callback"
echo "   Backend Local: http://localhost:5174"
