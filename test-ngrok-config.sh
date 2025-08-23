#!/bin/bash

echo "🧪 Test Configuration Ngrok"
echo "==========================="
echo ""

# Vérifier authtoken
echo "🔑 Test authtoken..."
if ngrok config check &> /dev/null; then
    echo "✅ Authtoken configuré"
else
    echo "❌ Problème authtoken"
    exit 1
fi

# Test configuration locale
echo "📋 Test configuration locale..."
if [[ -f "ngrok.yml" ]]; then
    echo "✅ Fichier ngrok.yml trouvé"
    
    # Vérifier la version
    if grep -q 'version: "3"' ngrok.yml; then
        echo "✅ Version 3 configurée"
    else
        echo "❌ Version incorrecte dans ngrok.yml"
    fi
    
    # Vérifier authtoken dans config locale
    if grep -q "authtoken:" ngrok.yml; then
        echo "✅ Authtoken inclus dans config locale"
    else
        echo "⚠️  Authtoken manquant dans config locale"
    fi
    
    # Vérifier tunnel backend
    if grep -q "backend:" ngrok.yml; then
        echo "✅ Tunnel backend configuré"
    else
        echo "❌ Tunnel backend manquant"
    fi
    
else
    echo "❌ Fichier ngrok.yml non trouvé"
    exit 1
fi

echo ""
echo "🚀 Test de connexion ngrok..."

# Test démarrage ngrok (rapide)
ngrok start --config=ngrok.yml backend --log=stdout &
NGROK_PID=$!

sleep 3

# Vérifier si ngrok fonctionne
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "✅ Ngrok démarré avec succès !"
    
    # Récupérer l'URL
    URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)
    if [[ -n "$URL" ]]; then
        echo "🎯 URL générée: $URL"
        
        # Tester si c'est un domaine fixe
        if grep -q "domain:" ngrok.yml; then
            FIXED_DOMAIN=$(grep "domain:" ngrok.yml | awk '{print $2}')
            if [[ "$URL" == "https://$FIXED_DOMAIN" ]]; then
                echo "🎉 DOMAINE FIXE FONCTIONNEL !"
            else
                echo "⚠️  Domaine configuré: $FIXED_DOMAIN"
                echo "⚠️  Domaine obtenu: $URL"
            fi
        else
            echo "📋 Mode URLs dynamiques (normal)"
        fi
    else
        echo "❌ Impossible de récupérer l'URL"
    fi
else
    echo "❌ Ngrok n'a pas pu démarrer"
fi

# Nettoyer
kill $NGROK_PID 2>/dev/null
wait $NGROK_PID 2>/dev/null

echo ""
echo "🧪 Test terminé"
echo ""
echo "📋 Prochaines étapes :"
echo "   - Si domaine fixe: ./start-fixed-domain.sh"
echo "   - Si URLs dynamiques: ./update-ngrok-url.sh"