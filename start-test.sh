#!/bin/bash

# Script de démarrage des tests d'authentification Zoom
echo "🚀 Démarrage des serveurs de test Zoom OAuth"

# Fonction pour tuer les processus existants
cleanup() {
    echo "🛑 Arrêt des serveurs..."
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f "node test-server.js" 2>/dev/null || true
    exit 0
}

# Gérer l'interruption (Ctrl+C)
trap cleanup SIGINT SIGTERM

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

echo "📋 Arrêt des serveurs existants..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node test-server.js" 2>/dev/null || true

sleep 2

echo "🔧 Démarrage du serveur backend Zoom OAuth (port 5174)..."
cd server
nohup node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "⏳ Attente du démarrage du backend..."
sleep 4

# Vérifier que le backend fonctionne
if curl -s http://localhost:5174/health > /dev/null; then
    echo "✅ Serveur backend opérationnel"
else
    echo "❌ Erreur: Le serveur backend ne répond pas"
    cleanup
fi

echo "🧪 Démarrage du serveur de test (port 8080)..."
nohup node test-server.js > test-server.log 2>&1 &
TEST_PID=$!

echo "⏳ Attente du démarrage du serveur de test..."
sleep 3

# Vérifier que le serveur de test fonctionne
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Serveur de test opérationnel"
else
    echo "❌ Erreur: Le serveur de test ne répond pas"
    cleanup
fi

echo ""
echo "🎉 Serveurs démarrés avec succès !"
echo ""
echo "📖 URLs disponibles:"
echo "   • Interface de test:     http://localhost:8080"
echo "   • Via serveur backend:   http://localhost:5174/test"
echo "   • API Backend:          http://localhost:5174"
echo "   • Health check:         http://localhost:5174/health"
echo ""
echo "🔗 Instructions:"
echo "   1. Ouvrir http://localhost:8080 dans votre navigateur"
echo "   2. Cliquer 'Démarrer Connexion Zoom' pour tester l'OAuth"
echo "   3. Suivre la redirection Zoom et revenir pour vérifier l'auth"
echo ""
echo "📝 Logs:"
echo "   • Backend: tail -f backend.log"
echo "   • Test: tail -f test-server.log"
echo ""
echo "⏹️  Pour arrêter: Ctrl+C ou ./stop-test.sh"
echo ""

# Ouvrir automatiquement le navigateur (si possible)
if command -v open &> /dev/null; then
    echo "🌐 Ouverture automatique du navigateur..."
    sleep 2
    open http://localhost:8080
elif command -v xdg-open &> /dev/null; then
    echo "🌐 Ouverture automatique du navigateur..."
    sleep 2
    xdg-open http://localhost:8080
else
    echo "💡 Ouvrez manuellement http://localhost:8080 dans votre navigateur"
fi

# Attendre jusqu'à interruption
echo "✨ Serveurs en cours d'exécution... (Ctrl+C pour arrêter)"
wait