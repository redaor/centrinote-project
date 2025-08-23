#!/bin/bash

echo "🔄 Synchronisation des fichiers .env..."

# Sauvegarder l'ancien fichier serveur
if [ -f "server/.env" ]; then
    echo "💾 Sauvegarde de l'ancien server/.env"
    cp "server/.env" "server/.env.backup"
fi

# Créer un lien symbolique du fichier racine vers le serveur
echo "🔗 Création du lien symbolique..."
ln -sf "../.env" "server/.env"

echo "✅ Synchronisation terminée !"
echo "📁 server/.env -> ../.env (lien symbolique)"

# Vérifier que les variables sont identiques
echo ""
echo "🧪 Vérification des Client ID:"
echo "Fichier racine - VITE_ZOOM_CLIENT_ID: $(grep VITE_ZOOM_CLIENT_ID .env | cut -d'=' -f2)"
echo "Fichier racine - ZOOM_CLIENT_ID: $(grep ZOOM_CLIENT_ID .env | cut -d'=' -f2)"
echo "Serveur (lien) - ZOOM_CLIENT_ID: $(grep ZOOM_CLIENT_ID server/.env | cut -d'=' -f2)"