#!/bin/bash
echo "🚀 Démarrage avec domaine fixe: unified-suitably-caribou.ngrok-free.app"
echo "============================================="
echo ""
echo "🌐 Démarrage ngrok..."
ngrok start --config=ngrok.yml backend &
echo ""
echo "⏳ Attente de la connexion..."
sleep 3
echo ""
echo "🎯 VOTRE URL FIXE :"
echo "   https://unified-suitably-caribou.ngrok-free.app"
echo ""
echo "📋 Prochaines étapes :"
echo "   Terminal 2: cd server && npm start"
echo "   Terminal 3: npm run dev"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
wait
