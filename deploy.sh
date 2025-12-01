#!/bin/sh
# deploy.sh – commit + build + déploiement manuel

echo "🔧 Commit des changements…"
git add .
git commit -m "$1"          # $1 = message passé en paramètre
git push origin main

echo "📦 Build local…"
npm run build

echo "🚀 Déploiement sur Netlify…"
netlify deploy --prod --dir=dist

echo "✅ Déploiement terminé"

