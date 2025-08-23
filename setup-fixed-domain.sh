#!/bin/bash

echo "🎯 Configuration Domaine Ngrok Fixe DÉFINITIF"
echo "=============================================="
echo ""

# Vérifications préliminaires
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok non installé. Exécutez: brew install ngrok"
    exit 1
fi

if ! ngrok config check &> /dev/null; then
    echo "❌ Token ngrok manquant. Configurez avec: ngrok authtoken VOTRE_TOKEN"
    exit 1
fi

echo "✅ ngrok configuré et authentifié"
echo ""

# Proposer les étapes pour un domaine fixe
echo "📋 ÉTAPES POUR DOMAINE FIXE GRATUIT :"
echo ""
echo "1. 🌐 Réservez un domaine gratuit sur ngrok dashboard"
echo "2. 🔧 Configuration automatique de votre projet"
echo "3. 🎉 URL fixe qui ne change JAMAIS"
echo ""

read -p "🤔 Voulez-vous réserver un domaine maintenant ? (y/n): " reserve_now

if [[ $reserve_now =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔗 Ouverture du dashboard ngrok..."
    open "https://dashboard.ngrok.com/cloud-edge/domains" 2>/dev/null || echo "Allez sur: https://dashboard.ngrok.com/cloud-edge/domains"
    echo ""
    echo "📋 INSTRUCTIONS SUR LE DASHBOARD :"
    echo "   1. Cliquez 'Create Domain' ou 'New Domain'"
    echo "   2. Choisissez un nom unique (ex: centrinote-reda-2025)"
    echo "   3. Cliquez 'Save'"
    echo "   4. Copiez le domaine complet (ex: centrinote-reda-2025.ngrok-free.app)"
    echo ""
    
    read -p "📝 Collez votre domaine réservé ici: " fixed_domain
    
    if [[ -n "$fixed_domain" && "$fixed_domain" == *".ngrok-free.app" ]]; then
        echo ""
        echo "✅ Domaine validé: $fixed_domain"
        echo "🔧 Configuration automatique en cours..."
        
        # Mettre à jour ngrok.yml avec le domaine fixe
        cat > ngrok.yml << EOF
version: "3"
agent:
  authtoken: 31EdyDZ7dMRQvIAB6dZSrWn2eea_3Y3Ayq2gWAbH7R6QskcC5
tunnels:
  backend:
    addr: 5174
    proto: http
    domain: $fixed_domain
EOF
        
        echo "✅ ngrok.yml mis à jour avec domaine fixe"
        
        # Mettre à jour tous les fichiers .env
        echo "🔄 Mise à jour des fichiers de configuration..."
        
        # Backup des fichiers existants
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
        cp server/.env server/.env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
        
        # Mise à jour .env principal
        sed -i.tmp "s|VITE_ZOOM_REDIRECT_URI=.*|VITE_ZOOM_REDIRECT_URI=https://${fixed_domain}/auth/callback|g" .env
        sed -i.tmp "s|APP_PUBLIC_URL=.*|APP_PUBLIC_URL=https://${fixed_domain}|g" .env
        sed -i.tmp "s|ZOOM_REDIRECT_URI=.*|ZOOM_REDIRECT_URI=https://${fixed_domain}/auth/callback|g" .env
        sed -i.tmp "s|CLIENT_URL=.*|CLIENT_URL=https://${fixed_domain}|g" .env
        sed -i.tmp "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=https://${fixed_domain}|g" .env
        
        # Mise à jour server/.env
        sed -i.tmp "s|ZOOM_REDIRECT_URI=.*|ZOOM_REDIRECT_URI=https://${fixed_domain}/auth/callback|g" server/.env
        sed -i.tmp "s|CLIENT_URL=.*|CLIENT_URL=https://${fixed_domain}|g" server/.env
        sed -i.tmp "s|APP_PUBLIC_URL=.*|APP_PUBLIC_URL=https://${fixed_domain}|g" server/.env
        
        # Nettoyer fichiers temporaires
        rm .env.tmp server/.env.tmp 2>/dev/null
        
        echo "✅ Tous les fichiers mis à jour !"
        echo ""
        echo "🎯 VOTRE URL FIXE PERMANENTE :"
        echo "   https://$fixed_domain"
        echo ""
        echo "📋 CONFIGURATION ZOOM MARKETPLACE :"
        echo "   https://$fixed_domain/auth/callback"
        echo ""
        echo "🚀 POUR DÉMARRER :"
        echo "   1. Terminal 1: ngrok start --config=ngrok.yml backend"
        echo "   2. Terminal 2: cd server && npm start"
        echo "   3. Terminal 3: npm run dev"
        echo ""
        echo "🎉 CETTE URL NE CHANGERA JAMAIS !"
        echo ""
        
        # Créer un script de démarrage personnalisé
        cat > start-fixed-domain.sh << EOF
#!/bin/bash
echo "🚀 Démarrage avec domaine fixe: $fixed_domain"
echo "============================================="
echo ""
echo "🌐 Démarrage ngrok..."
ngrok start --config=ngrok.yml backend &
echo ""
echo "⏳ Attente de la connexion..."
sleep 3
echo ""
echo "🎯 VOTRE URL FIXE :"
echo "   https://$fixed_domain"
echo ""
echo "📋 Prochaines étapes :"
echo "   Terminal 2: cd server && npm start"
echo "   Terminal 3: npm run dev"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
wait
EOF
        chmod +x start-fixed-domain.sh
        
        echo "✅ Script de démarrage créé: ./start-fixed-domain.sh"
        echo ""
        
        read -p "🤔 Voulez-vous démarrer maintenant ? (y/n): " start_now
        if [[ $start_now =~ ^[Yy]$ ]]; then
            echo ""
            echo "🚀 Démarrage de ngrok avec votre domaine fixe..."
            ./start-fixed-domain.sh
        fi
        
    else
        echo "❌ Domaine invalide. Format attendu: xxx.ngrok-free.app"
        exit 1
    fi
else
    echo ""
    echo "📋 Mode URLs dynamiques activé"
    echo "✅ Configuration ngrok.yml prête pour URLs changeantes"
    echo ""
    echo "🔄 Workflow URLs dynamiques :"
    echo "   1. Démarrez: ngrok start --config=ngrok.yml backend"
    echo "   2. Récupérez l'URL générée"
    echo "   3. Exécutez: ./update-ngrok-url.sh"
    echo ""
fi

echo ""
echo "✅ Configuration terminée !"