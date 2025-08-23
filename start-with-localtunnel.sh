#!/bin/bash

echo "🚀 Démarrage avec LocalTunnel Stable"
echo "=================================="

# Fonction de nettoyage
cleanup() {
    echo "🛑 Arrêt des services..."
    pkill -f "localtunnel"
    pkill -f "node.*server"
    pkill -f "vite"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer LocalTunnel
echo "📡 Démarrage LocalTunnel : https://centrinote-reda-0817.loca.lt"
npx localtunnel --port 5174 --subdomain centrinote-reda-0817 &
TUNNEL_PID=$!

echo "⏳ Attente activation tunnel..."
sleep 5

# Démarrer backend
echo "🖥️  Démarrage Backend..."
cd server && npm start &
BACKEND_PID=$!

echo "⏳ Attente backend..."
sleep 3

echo ""
echo "✅ Services démarrés !"
echo "🌐 Application : https://centrinote-reda-0817.loca.lt"
echo "🔧 Backend local : http://localhost:5174"
echo ""
echo "📋 ÉTAPES IMPORTANTES :"
echo "1. Mettez à jour Zoom Marketplace :"
echo "   → Redirect URI: https://centrinote-reda-0817.loca.lt/auth/callback"
echo "   → App URL: https://centrinote-reda-0817.loca.lt"
echo ""
echo "2. Testez l'authentification :"
echo "   → Ouvrir: https://centrinote-reda-0817.loca.lt"
echo "   → Se connecter avec Zoom"
echo ""
echo "🛑 Appuyez sur Ctrl+C pour arrêter tous les services"

# Attendre
wait
