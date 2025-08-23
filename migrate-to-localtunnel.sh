#!/bin/bash

echo "🚀 Migration Immédiate vers LocalTunnel"
echo "====================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Générer un subdomain unique
SUBDOMAIN="centrinote-reda-$(date +%m%d)"
FULL_URL="https://$SUBDOMAIN.loca.lt"

info "URL générée : $FULL_URL"

echo ""
info "🔧 Mise à jour de la configuration..."

# Sauvegarder l'ancienne config
cp .env .env.backup.ngrok.$(date +%Y%m%d_%H%M%S)
cp server/.env server/.env.backup.ngrok.$(date +%Y%m%d_%H%M%S)

success "Anciennes configurations sauvegardées"

# Mise à jour .env principal
sed -i.bak "s|https://unified-suitably-caribou.ngrok-free.app|$FULL_URL|g" .env
sed -i.bak "s|unified-suitably-caribou.ngrok-free.app|$SUBDOMAIN.loca.lt|g" .env

# Mise à jour server/.env
sed -i.bak "s|https://unified-suitably-caribou.ngrok-free.app|$FULL_URL|g" server/.env
sed -i.bak "s|unified-suitably-caribou.ngrok-free.app|$SUBDOMAIN.loca.lt|g" server/.env

# Nettoyer les fichiers temporaires
rm -f .env.bak server/.env.bak

success "Configuration mise à jour avec : $FULL_URL"

# Créer script de démarrage complet
cat > start-with-localtunnel.sh << EOF
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
echo "📡 Démarrage LocalTunnel : $FULL_URL"
npx localtunnel --port 5174 --subdomain $SUBDOMAIN &
TUNNEL_PID=\$!

echo "⏳ Attente activation tunnel..."
sleep 5

# Démarrer backend
echo "🖥️  Démarrage Backend..."
cd server && npm start &
BACKEND_PID=\$!

echo "⏳ Attente backend..."
sleep 3

echo ""
echo "✅ Services démarrés !"
echo "🌐 Application : $FULL_URL"
echo "🔧 Backend local : http://localhost:5174"
echo ""
echo "📋 ÉTAPES IMPORTANTES :"
echo "1. Mettez à jour Zoom Marketplace :"
echo "   → Redirect URI: $FULL_URL/auth/callback"
echo "   → App URL: $FULL_URL"
echo ""
echo "2. Testez l'authentification :"
echo "   → Ouvrir: $FULL_URL"
echo "   → Se connecter avec Zoom"
echo ""
echo "🛑 Appuyez sur Ctrl+C pour arrêter tous les services"

# Attendre
wait
EOF

chmod +x start-with-localtunnel.sh

success "Script de démarrage créé : start-with-localtunnel.sh"

# Créer un fichier de test de la nouvelle URL
cat > test-new-url.sh << EOF
#!/bin/bash

echo "🧪 Test de la nouvelle URL"
echo "========================="

URL="$FULL_URL"

echo "📡 Test de la connexion..."
if curl -s "\$URL" > /dev/null; then
    echo "✅ URL accessible : \$URL"
else
    echo "❌ URL non accessible"
    echo "💡 Assurez-vous que LocalTunnel est démarré"
fi

echo ""
echo "🔍 Test endpoint OAuth..."
OAUTH_RESPONSE=\$(curl -s "\$URL/auth/zoom" 2>/dev/null)

if echo "\$OAUTH_RESPONSE" | grep -q "success"; then
    echo "✅ Endpoint OAuth fonctionnel"
    echo "🎯 URL OAuth générée avec succès"
else
    echo "❌ Problème avec endpoint OAuth"
    echo "💡 Vérifiez que le backend est démarré"
fi

echo ""
echo "📋 Informations :"
echo "   URL Application: \$URL"
echo "   OAuth Callback: \$URL/auth/callback"
echo "   Backend Local: http://localhost:5174"
EOF

chmod +x test-new-url.sh

success "Script de test créé : test-new-url.sh"

echo ""
success "🎯 MIGRATION TERMINÉE !"
echo ""
echo "📋 NOUVELLE CONFIGURATION :"
echo "   → URL Stable: $FULL_URL"
echo "   → Plus stable que ngrok"
echo "   → Prêt pour Zoom OAuth"
echo ""

warning "📝 ACTIONS REQUISES :"
echo ""
echo "1️⃣  Mettre à jour Zoom Marketplace :"
echo "   🔗 https://marketplace.zoom.us/"
echo "   📝 Redirect URI: $FULL_URL/auth/callback"
echo ""
echo "2️⃣  Démarrer l'environnement :"
echo "   ./start-with-localtunnel.sh"
echo ""
echo "3️⃣  Tester la configuration :"
echo "   ./test-new-url.sh"
echo ""

# Sauvegarder la nouvelle config
echo "LOCALTUNNEL_URL=$FULL_URL" > .migration-config
echo "SUBDOMAIN=$SUBDOMAIN" >> .migration-config
echo "MIGRATION_DATE=$(date)" >> .migration-config

info "Configuration sauvegardée dans .migration-config"

echo ""
success "🎉 FINI LES URLS QUI CHANGENT !"
success "🔒 URL LOCALTUNNEL PLUS STABLE QUE NGROK"
echo ""