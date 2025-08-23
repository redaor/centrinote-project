#\!/bin/bash
echo "🚀 Démarrage des serveurs de test Zoom OAuth"

cleanup() {
    echo "🛑 Arrêt des serveurs..."
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f "node test-server.js" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "📋 Arrêt des serveurs existants..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node test-server.js" 2>/dev/null || true
sleep 2

echo "🔧 Démarrage du serveur backend (port 5174)..."
nohup node server.js > backend.log 2>&1 &

echo "⏳ Attente du démarrage..."
sleep 4

if curl -s http://localhost:5174/health > /dev/null; then
    echo "✅ Serveur backend opérationnel"
else
    echo "❌ Serveur backend ne répond pas"
    cleanup
fi

echo "🧪 Démarrage du serveur de test (port 8080)..."
nohup node test-server.js > test-server.log 2>&1 &
sleep 3

if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Serveur de test opérationnel"
else
    echo "❌ Serveur de test ne répond pas"
    cleanup
fi

echo ""
echo "🎉 Serveurs prêts \!"
echo "📖 URLs:"
echo "   • Test: http://localhost:8080"
echo "   • Backend: http://localhost:5174/test"
echo ""
echo "💡 Ouvrez http://localhost:8080 pour tester l'auth Zoom"
echo "⏹️  Ctrl+C pour arrêter"
wait
EOF < /dev/null