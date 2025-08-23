#!/bin/bash

# Script d'arrêt des serveurs de test
echo "🛑 Arrêt des serveurs de test Zoom OAuth"

echo "📋 Recherche des processus serveur..."
pkill -f "node server.js" 2>/dev/null && echo "✅ Serveur backend arrêté" || echo "ℹ️  Aucun serveur backend en cours"
pkill -f "node test-server.js" 2>/dev/null && echo "✅ Serveur de test arrêté" || echo "ℹ️  Aucun serveur de test en cours"

echo "🧹 Nettoyage des fichiers de log..."
rm -f backend.log test-server.log 2>/dev/null

echo "✨ Arrêt terminé"