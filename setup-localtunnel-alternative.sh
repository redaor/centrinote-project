#!/bin/bash

echo "🚀 Configuration LocalTunnel - Alternative Simple"
echo "=============================================="
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

section() {
    echo -e "${YELLOW}📋 $1${NC}"
}

section "ALTERNATIVE RAPIDE : LOCALTUNNEL"

echo ""
info "LocalTunnel offre des URLs relativement stables avec subdomaines personnalisés"
echo "Avantages :"
echo "  ✅ URLs plus stables que ngrok"
echo "  ✅ Subdomain personnalisable"
echo "  ✅ Installation simple avec npm"
echo "  ✅ Gratuit et open source"
echo ""

section "ÉTAPE 1: INSTALLATION"

echo ""
info "Installation de LocalTunnel..."

npm install -g localtunnel

if [ $? -eq 0 ]; then
    success "LocalTunnel installé avec succès"
else
    echo "❌ Échec installation. Essayons avec sudo..."
    sudo npm install -g localtunnel
fi

# Vérifier l'installation
if command -v lt &> /dev/null; then
    success "LocalTunnel prêt"
    lt --version
else
    echo "❌ Échec de l'installation"
    exit 1
fi

echo ""
section "ÉTAPE 2: CHOIX DU SUBDOMAIN"

echo ""
info "Choisissez un subdomain stable pour votre application"
echo "Le subdomain sera : https://VOTRE-CHOIX.loca.lt"
echo ""
echo "Exemples suggérés :"
echo "  • centrinote-zoom-app.loca.lt"
echo "  • zoom-meetings-reda.loca.lt"
echo "  • stable-zoom-app.loca.lt"
echo ""

read -p "Entrez votre subdomain choisi (sans .loca.lt): " SUBDOMAIN

if [ -z "$SUBDOMAIN" ]; then
    echo "❌ Subdomain requis"
    exit 1
fi

FULL_URL="https://$SUBDOMAIN.loca.lt"

success "URL choisie : $FULL_URL"

echo ""
section "ÉTAPE 3: MISE À JOUR CONFIGURATION"

echo ""
info "Mise à jour des fichiers de configuration..."

# Sauvegarder l'ancienne config
cp .env .env.backup.localtunnel.$(date +%Y%m%d_%H%M%S)
cp server/.env server/.env.backup.localtunnel.$(date +%Y%m%d_%H%M%S)

success "Anciennes configurations sauvegardées"

# Mettre à jour .env principal
sed -i.bak "s|https://unified-suitably-caribou.ngrok-free.app|$FULL_URL|g" .env
sed -i.bak "s|unified-suitably-caribou.ngrok-free.app|$SUBDOMAIN.loca.lt|g" .env

# Mettre à jour server/.env
sed -i.bak "s|https://unified-suitably-caribou.ngrok-free.app|$FULL_URL|g" server/.env
sed -i.bak "s|unified-suitably-caribou.ngrok-free.app|$SUBDOMAIN.loca.lt|g" server/.env

# Nettoyer les fichiers de sauvegarde temporaires
rm -f .env.bak server/.env.bak

success "Configuration mise à jour avec : $FULL_URL"

echo ""
section "ÉTAPE 4: SCRIPTS DE DÉMARRAGE"

# Créer script de démarrage LocalTunnel
cat > start-localtunnel.sh << EOF
#!/bin/bash

echo "🚀 Démarrage LocalTunnel..."

# Vérifier que lt est installé
if ! command -v lt &> /dev/null; then
    echo "❌ LocalTunnel n'est pas installé"
    echo "Installez avec: npm install -g localtunnel"
    exit 1
fi

echo "📡 Connexion tunnel : $FULL_URL"
echo "⚠️  IMPORTANT: Si le subdomain est pris, LocalTunnel en proposera un autre"
echo ""

lt --port 5174 --subdomain $SUBDOMAIN

echo "✅ Tunnel démarré"
EOF

chmod +x start-localtunnel.sh

# Créer script complet
cat > start-stable-localtunnel.sh << EOF
#!/bin/bash

echo "🚀 Démarrage Environnement Stable (LocalTunnel)"
echo "============================================="

# Fonction pour tuer les processus
cleanup() {
    echo "🛑 Arrêt des services..."
    pkill -f "lt --port"
    pkill -f "node.*server"
    pkill -f "vite"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer LocalTunnel en arrière-plan
echo "📡 Démarrage LocalTunnel..."
lt --port 5174 --subdomain $SUBDOMAIN &
TUNNEL_PID=\$!

# Attendre que le tunnel soit prêt
sleep 3

# Démarrer le backend
echo "🖥️  Démarrage Backend (port 5174)..."
cd server && npm start &
BACKEND_PID=\$!

# Attendre que le backend soit prêt
sleep 3

# Démarrer le frontend
echo "🌐 Démarrage Frontend..."
cd .. && npm run dev &
FRONTEND_PID=\$!

echo ""
echo "✅ Tous les services démarrés !"
echo "📱 Application accessible sur : $FULL_URL"
echo "🛑 Appuyez sur Ctrl+C pour arrêter"
echo ""

# Attendre
wait
EOF

chmod +x start-stable-localtunnel.sh

success "Scripts LocalTunnel créés :"
echo "   → start-localtunnel.sh (tunnel seul)"
echo "   → start-stable-localtunnel.sh (environnement complet)"

echo ""
section "CONFIGURATION ZOOM MARKETPLACE"

echo ""
warning "IMPORTANT : Mise à jour Zoom Marketplace"
echo ""
echo "📋 Connectez-vous à : https://marketplace.zoom.us/"
echo "📝 Modifiez votre OAuth App :"
echo ""
echo "   🔗 Redirect URI: $FULL_URL/auth/callback"
echo "   🌐 App URL: $FULL_URL"
echo "   📱 Domain: $SUBDOMAIN.loca.lt"
echo ""

section "VÉRIFICATION CONFIGURATION"

# Vérifier les mises à jour
if grep -q "$SUBDOMAIN.loca.lt" .env; then
    success "Fichier .env mis à jour"
else
    echo "❌ Problème mise à jour .env"
fi

if grep -q "$SUBDOMAIN.loca.lt" server/.env; then
    success "Fichier server/.env mis à jour"
else
    echo "❌ Problème mise à jour server/.env"
fi

echo ""
section "RÉSUMÉ LOCALTUNNEL"

echo ""
success "🎯 LOCALTUNNEL CONFIGURÉ"
echo "   → Subdomain: $SUBDOMAIN"
echo "   → URL: $FULL_URL"
echo "   → Plus stable que ngrok"
echo ""

success "📁 FICHIERS MODIFIÉS"
echo "   → .env (URLs mises à jour)"
echo "   → server/.env (URLs mises à jour)"
echo ""

section "PROCHAINES ÉTAPES"

echo ""
echo "1️⃣  Mettre à jour Zoom Marketplace :"
echo "   Redirect URI: $FULL_URL/auth/callback"
echo ""
echo "2️⃣  Démarrer l'environnement :"
echo "   ./start-stable-localtunnel.sh"
echo ""
echo "3️⃣  Tester l'application :"
echo "   $FULL_URL"
echo ""

warning "IMPORTANT : LocalTunnel peut parfois changer de subdomain"
echo "Si c'est le cas, relancez le script avec un autre nom"

# Sauvegarder la config
echo "LOCALTUNNEL_URL=$FULL_URL" > .localtunnel-config
echo "SUBDOMAIN=$SUBDOMAIN" >> .localtunnel-config

success "🎉 CONFIGURATION LOCALTUNNEL TERMINÉE !"
info "Configuration sauvegardée dans .localtunnel-config"