#!/bin/bash

echo "🚀 Configuration Cloudflare Tunnel - Remplacement ngrok"
echo "===================================================="
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

error() {
    echo -e "${RED}❌ $1${NC}"
}

section() {
    echo -e "${YELLOW}📋 $1${NC}"
}

section "ÉTAPE 1: INSTALLATION CLOUDFLARED"

echo ""
info "Installation du client Cloudflare Tunnel..."

# Détecter l'OS et installer cloudflared
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        info "Installation via Homebrew..."
        brew install cloudflared
    else
        warning "Homebrew non trouvé. Installation manuelle requise."
        echo "Téléchargez: https://github.com/cloudflare/cloudflared/releases"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    info "Installation pour Linux..."
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
else
    error "OS non supporté. Installation manuelle requise."
    exit 1
fi

# Vérifier l'installation
if command -v cloudflared &> /dev/null; then
    success "Cloudflared installé avec succès"
    cloudflared --version
else
    error "Échec de l'installation de cloudflared"
    exit 1
fi

echo ""
section "ÉTAPE 2: AUTHENTIFICATION CLOUDFLARE"

echo ""
info "Lancement de l'authentification Cloudflare..."
info "Ceci va ouvrir votre navigateur pour vous connecter à Cloudflare"
echo ""

cloudflared tunnel login

if [ $? -eq 0 ]; then
    success "Authentification réussie"
else
    error "Échec de l'authentification"
    exit 1
fi

echo ""
section "ÉTAPE 3: CRÉATION DU TUNNEL"

echo ""
TUNNEL_NAME="centrinote-zoom-stable"
info "Création du tunnel : $TUNNEL_NAME"

cloudflared tunnel create $TUNNEL_NAME

if [ $? -eq 0 ]; then
    success "Tunnel '$TUNNEL_NAME' créé avec succès"
else
    warning "Le tunnel existe peut-être déjà. Continuons..."
fi

# Obtenir l'UUID du tunnel
TUNNEL_UUID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')

if [ -z "$TUNNEL_UUID" ]; then
    error "Impossible de trouver l'UUID du tunnel"
    exit 1
fi

success "UUID du tunnel: $TUNNEL_UUID"

echo ""
section "ÉTAPE 4: CONFIGURATION DNS"

echo ""
info "Configuration DNS pour le tunnel..."

# Choisir un sous-domaine (vous devrez avoir un domaine sur Cloudflare)
info "IMPORTANT: Vous devez avoir un domaine configuré dans Cloudflare"
echo ""
echo "Exemples de domaines possibles:"
echo "  • centrinote-app.votre-domaine.com"
echo "  • zoom-app.votre-domaine.com"
echo "  • meetings.votre-domaine.com"
echo ""

read -p "Entrez votre domaine complet (ex: centrinote-app.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    error "Domaine requis"
    exit 1
fi

info "Configuration DNS pour : $DOMAIN"

cloudflared tunnel route dns $TUNNEL_NAME $DOMAIN

if [ $? -eq 0 ]; then
    success "DNS configuré pour : https://$DOMAIN"
else
    error "Échec de la configuration DNS"
    exit 1
fi

echo ""
section "ÉTAPE 5: FICHIER DE CONFIGURATION"

echo ""
info "Création du fichier de configuration..."

# Créer le répertoire de configuration
CONFIG_DIR="$HOME/.cloudflared"
mkdir -p $CONFIG_DIR

# Créer le fichier de configuration
cat > $CONFIG_DIR/config.yml << EOF
tunnel: $TUNNEL_UUID
credentials-file: $CONFIG_DIR/${TUNNEL_UUID}.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:5174
  - service: http_status:404
EOF

success "Fichier de configuration créé : $CONFIG_DIR/config.yml"

echo ""
section "ÉTAPE 6: MISE À JOUR CONFIGURATION PROJET"

echo ""
info "Mise à jour des fichiers de configuration du projet..."

# Sauvegarder l'ancienne config
cp .env .env.backup.ngrok.$(date +%Y%m%d_%H%M%S)
cp server/.env server/.env.backup.ngrok.$(date +%Y%m%d_%H%M%S)

success "Anciennes configurations sauvegardées"

# Mettre à jour .env principal
sed -i.bak "s|https://unified-suitably-caribou.ngrok-free.app|https://$DOMAIN|g" .env
sed -i.bak "s|unified-suitably-caribou.ngrok-free.app|$DOMAIN|g" .env

# Mettre à jour server/.env
sed -i.bak "s|https://unified-suitably-caribou.ngrok-free.app|https://$DOMAIN|g" server/.env
sed -i.bak "s|unified-suitably-caribou.ngrok-free.app|$DOMAIN|g" server/.env

# Nettoyer les fichiers de sauvegarde temporaires
rm -f .env.bak server/.env.bak

success "Configuration du projet mise à jour avec : https://$DOMAIN"

echo ""
section "ÉTAPE 7: SCRIPTS DE DÉMARRAGE"

# Créer script de démarrage
cat > start-cloudflare-tunnel.sh << 'EOF'
#!/bin/bash

echo "🚀 Démarrage Cloudflare Tunnel..."

# Vérifier que cloudflared est installé
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared n'est pas installé"
    exit 1
fi

# Démarrer le tunnel
echo "📡 Connexion du tunnel..."
cloudflared tunnel run

echo "✅ Tunnel démarré avec succès"
EOF

chmod +x start-cloudflare-tunnel.sh

# Créer script complet de démarrage
cat > start-stable-dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Démarrage Environnement Stable (Cloudflare Tunnel)"
echo "=================================================="

# Fonction pour tuer les processus en cours
cleanup() {
    echo "🛑 Arrêt des services..."
    pkill -f "cloudflared"
    pkill -f "node.*server"
    pkill -f "vite"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer le tunnel Cloudflare en arrière-plan
echo "📡 Démarrage Cloudflare Tunnel..."
cloudflared tunnel run &
TUNNEL_PID=$!

# Attendre que le tunnel soit prêt
sleep 3

# Démarrer le backend
echo "🖥️  Démarrage Backend (port 5174)..."
cd server && npm start &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 3

# Démarrer le frontend
echo "🌐 Démarrage Frontend..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Tous les services sont démarrés !"
echo "📱 Application accessible sur votre domaine Cloudflare"
echo "🛑 Appuyez sur Ctrl+C pour arrêter tous les services"
echo ""

# Attendre que l'utilisateur arrête
wait
EOF

chmod +x start-stable-dev.sh

success "Scripts de démarrage créés :"
echo "   → start-cloudflare-tunnel.sh (tunnel seul)"
echo "   → start-stable-dev.sh (environnement complet)"

echo ""
section "CONFIGURATION ZOOM MARKETPLACE"

echo ""
warning "IMPORTANT : Mise à jour requise dans Zoom Marketplace"
echo ""
echo "📋 Connectez-vous à : https://marketplace.zoom.us/"
echo "📝 Modifiez votre OAuth App avec :"
echo ""
echo "   🔗 Redirect URI: https://$DOMAIN/auth/callback"
echo "   🌐 App URL: https://$DOMAIN"
echo "   📱 Domain: $DOMAIN"
echo ""

section "ÉTAPE 8: TEST DE LA CONFIGURATION"

echo ""
info "Test de la configuration..."

# Vérifier que les fichiers ont été mis à jour
if grep -q "$DOMAIN" .env; then
    success "Fichier .env mis à jour"
else
    error "Échec mise à jour .env"
fi

if grep -q "$DOMAIN" server/.env; then
    success "Fichier server/.env mis à jour"
else
    error "Échec mise à jour server/.env"
fi

echo ""
section "RÉSUMÉ DE LA CONFIGURATION"

echo ""
success "🎯 TUNNEL CLOUDFLARE CONFIGURÉ"
echo "   → Nom: $TUNNEL_NAME"
echo "   → UUID: $TUNNEL_UUID"
echo "   → Domaine: https://$DOMAIN"
echo ""

success "📁 FICHIERS MODIFIÉS"
echo "   → .env (URLs mises à jour)"
echo "   → server/.env (URLs mises à jour)"
echo "   → ~/.cloudflared/config.yml (configuration tunnel)"
echo ""

success "🚀 SCRIPTS CRÉÉS"
echo "   → start-cloudflare-tunnel.sh"
echo "   → start-stable-dev.sh"
echo ""

section "PROCHAINES ÉTAPES"

echo ""
echo "1️⃣  Mettre à jour Zoom Marketplace :"
echo "   https://marketplace.zoom.us/"
echo "   Redirect URI: https://$DOMAIN/auth/callback"
echo ""
echo "2️⃣  Démarrer l'environnement :"
echo "   ./start-stable-dev.sh"
echo ""
echo "3️⃣  Tester l'application :"
echo "   https://$DOMAIN"
echo ""

success "🎉 CONFIGURATION CLOUDFLARE TUNNEL TERMINÉE !"
echo "🔒 Votre URL est maintenant FIXE et ne changera JAMAIS !"
echo "✅ Fini les erreurs 4700 dues aux URLs qui changent !"

# Sauvegarder l'URL pour référence
echo "CLOUDFLARE_DOMAIN=https://$DOMAIN" > .cloudflare-config
echo "TUNNEL_NAME=$TUNNEL_NAME" >> .cloudflare-config
echo "TUNNEL_UUID=$TUNNEL_UUID" >> .cloudflare-config

info "Configuration sauvegardée dans .cloudflare-config"