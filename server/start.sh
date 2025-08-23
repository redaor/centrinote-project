#!/bin/bash

echo "🚀 Démarrage du serveur Centrinote Zoom OAuth..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier le fichier .env
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant"
    exit 1
fi

# Vérifier les dépendances
if [ ! -d node_modules ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Démarrer le serveur
echo "🎯 Démarrage sur http://localhost:3001..."
node server.js