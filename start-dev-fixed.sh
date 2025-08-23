#!/bin/bash

echo "🚀 Démarrage de Centrinote avec ngrok v3"
echo "========================================"
echo ""

# Vérifier que ngrok est prêt
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok non installé. Exécutez: brew install ngrok"
    exit 1
fi

if ! ngrok config check &> /dev/null; then
    echo "❌ Token ngrok manquant. Configurez avec: ngrok authtoken VOTRE_TOKEN"
    exit 1
fi

# Vérifier la version ngrok
NGROK_VERSION=$(ngrok version | head -1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
echo "📋 Version ngrok: $NGROK_VERSION"
echo "✅ ngrok configuré"
echo ""

# Vérifier si domaine réservé configuré
if grep -q "domain:" ngrok.yml 2>/dev/null; then
    RESERVED_DOMAIN=$(grep "domain:" ngrok.yml | awk '{print $2}' | head -1)
    echo "🎯 Domaine réservé détecté: $RESERVED_DOMAIN"
    echo ""
    
    # Démarrer ngrok avec domaine réservé
    echo "🌐 Démarrage tunnel avec domaine réservé..."
    ngrok start --all --config=ngrok.yml &
    NGROK_PID=$!
    
    # Attendre que ngrok soit prêt
    echo "⏳ Attente que ngrok se connecte..."
    sleep 5
    
    # Vérifier que ngrok fonctionne
    if curl -s http://localhost:4040/api/tunnels > /dev/null; then
        echo "✅ Ngrok démarré avec succès !"
        echo ""
        echo "🎯 VOTRE URL FIXE PERMANENTE :"
        echo "   🔗 Backend:  https://$RESERVED_DOMAIN"
        echo ""
        echo "📋 Prochaines étapes :"
        echo "   1. 🖥️  Démarrez vos serveurs dans d'autres terminaux :"
        echo "      cd server && npm start                    # Terminal 2"
        echo "      npm run dev                               # Terminal 3"
        echo ""
        echo "   2. 🌐 Configurez Zoom Marketplace DÉFINITIVEMENT avec :"
        echo "      https://$RESERVED_DOMAIN/auth/callback"
        echo ""
        echo "   3. 🧪 Testez via : https://$RESERVED_DOMAIN"
        echo ""
        echo "🎉 Cette URL ne changera JAMAIS ! Fini les mises à jour !"
        echo ""
        echo "Appuyez sur Ctrl+C pour arrêter ngrok"
        wait $NGROK_PID
    else
        echo "❌ Erreur démarrage ngrok avec domaine réservé"
        echo "💡 Vérifiez que le domaine est bien réservé sur ngrok dashboard"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi
else
    echo "📋 Aucun domaine réservé configuré"
    echo "🔄 Démarrage en mode URLs dynamiques..."
    echo ""
    
    # Démarrer ngrok sans domaine fixe
    ngrok start --all --config=ngrok.yml &
    NGROK_PID=$!
    
    # Attendre que ngrok soit prêt
    echo "⏳ Attente que ngrok se connecte..."
    sleep 5
    
    # Obtenir les URLs dynamiques
    if curl -s http://localhost:4040/api/tunnels > /dev/null; then
        echo "✅ Ngrok démarré avec succès !"
        echo ""
        
        # Extraire les URLs depuis l'API ngrok
        BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*' | grep -v inspect | head -1)
        
        if [[ -n "$BACKEND_URL" ]]; then
            echo "🎯 VOTRE URL ACTUELLE :"
            echo "   🔗 Backend: $BACKEND_URL"
            echo ""
            echo "⚠️  CETTE URL VA CHANGER au prochain redémarrage"
            echo ""
            echo "📋 Prochaines étapes :"
            echo "   1. 🔄 Exécutez dans un autre terminal :"
            echo "      ./update-ngrok-url.sh"
            echo ""
            echo "   2. 🖥️  Puis démarrez vos serveurs :"
            echo "      cd server && npm start                    # Terminal 3"
            echo "      npm run dev                               # Terminal 4"
            echo ""
            echo "💡 Pour une URL fixe, configurez un domaine réservé avec :"
            echo "   ./setup-ngrok-v3.sh"
        else
            echo "❌ Impossible de récupérer l'URL ngrok"
        fi
        
        echo ""
        echo "Appuyez sur Ctrl+C pour arrêter ngrok"
        wait $NGROK_PID
    else
        echo "❌ Erreur démarrage ngrok"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi
fi