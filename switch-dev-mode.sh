#!/bin/bash

# Script pour basculer entre les modes de développement
# Usage: ./switch-dev-mode.sh [localhost|ngrok]

MODE="$1"

show_help() {
    echo "🔧 Script de basculement des modes de développement"
    echo ""
    echo "Usage: ./switch-dev-mode.sh [MODE]"
    echo ""
    echo "Modes disponibles:"
    echo "  localhost  - Utilise localhost (pas de Zoom OAuth)"
    echo "  ngrok      - Utilise ngrok (avec Zoom OAuth complet)"
    echo "  status     - Affiche le mode actuel"
    echo ""
    echo "Exemples:"
    echo "  ./switch-dev-mode.sh localhost"
    echo "  ./switch-dev-mode.sh ngrok"
    echo "  ./switch-dev-mode.sh status"
}

show_status() {
    echo "📊 Statut de la configuration actuelle:"
    echo ""
    
    if [[ -f .env ]]; then
        local backend_url=$(grep "VITE_BACKEND_URL=" .env | cut -d'=' -f2)
        local redirect_uri=$(grep "VITE_ZOOM_REDIRECT_URI=" .env | cut -d'=' -f2)
        
        echo "🔗 Backend URL: $backend_url"
        echo "📞 Zoom Redirect: $redirect_uri"
        echo ""
        
        if [[ "$backend_url" == *"localhost"* ]]; then
            echo "📍 Mode actuel: 🏠 LOCALHOST"
            echo "   ✅ Bon pour: Tests rapides, développement UI"
            echo "   ❌ Limitation: Pas d'OAuth Zoom complet"
        elif [[ "$backend_url" == *"ngrok"* ]]; then
            echo "📍 Mode actuel: 🌐 NGROK"
            echo "   ✅ Bon pour: OAuth Zoom complet, tests d'intégration"
            echo "   ⚠️  Requis: URL ngrok active et configurée dans Zoom"
        else
            echo "📍 Mode actuel: ❓ INCONNU"
        fi
    else
        echo "❌ Fichier .env non trouvé"
    fi
}

switch_to_localhost() {
    echo "🏠 Basculement vers le mode LOCALHOST..."
    
    # Backup du .env actuel
    if [[ -f .env ]]; then
        cp .env .env.backup.ngrok
        echo "💾 Backup ngrok sauvé: .env.backup.ngrok"
    fi
    
    # Copier la configuration localhost
    if [[ -f .env.local ]]; then
        cp .env.local .env
        echo "✅ Configuration localhost activée"
        echo ""
        echo "📋 Mode LOCALHOST activé:"
        echo "   🔗 Frontend: http://localhost:5173"
        echo "   🔗 Backend:  http://localhost:5174"
        echo "   ⚠️  Zoom OAuth: Limité (redirections localhost)"
        echo ""
        echo "🚀 Démarrez vos serveurs:"
        echo "   npm run dev                    # Frontend"
        echo "   cd server && npm start         # Backend"
    else
        echo "❌ Fichier .env.local non trouvé"
        exit 1
    fi
}

switch_to_ngrok() {
    echo "🌐 Basculement vers le mode NGROK..."
    
    # Restaurer la configuration ngrok si elle existe
    if [[ -f .env.backup.ngrok ]]; then
        cp .env.backup.ngrok .env
        echo "♻️  Configuration ngrok restaurée"
    else
        echo "❌ Pas de backup ngrok trouvé"
        echo "🔄 Exécutez ./update-ngrok-url.sh pour configurer ngrok"
        exit 1
    fi
    
    echo "✅ Configuration ngrok activée"
    echo ""
    echo "📋 Mode NGROK activé:"
    echo "   🌐 Vérifiez que ngrok est démarré"
    echo "   🔄 Utilisez ./update-ngrok-url.sh si l'URL a changé"
    echo "   ⚙️  Configurez Zoom Marketplace avec l'URL actuelle"
    echo ""
    
    # Afficher l'URL actuelle
    local current_url=$(grep "VITE_BACKEND_URL=" .env | cut -d'=' -f2)
    echo "🔗 URL configurée: $current_url"
}

# Traitement des arguments
case "$MODE" in
    "localhost")
        switch_to_localhost
        ;;
    "ngrok")
        switch_to_ngrok
        ;;
    "status"|"")
        show_status
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "❌ Mode inconnu: $MODE"
        echo ""
        show_help
        exit 1
        ;;
esac