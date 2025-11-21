#!/usr/bin/env bash

# =====================================================
# 🚀 Script de Déploiement Automatique
# Synchronise bac à sable → production en 1 commande
# =====================================================

set -e  # Arrête le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_REF:-wjzlicokhxitmeoxkjzv}"  # À adapter si différent
EDGE_DIR="supabase/functions"
MIGRATIONS_DIR="supabase/migrations"

echo -e "${BLUE}🚀 Déploiement vers PRODUCTION${NC}"
echo ""

# 1. Vérifier que le CLI Supabase est installé
echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"
command -v supabase >/dev/null 2>&1 || { 
  echo -e "${RED}❌ Supabase CLI requis. Installez-le avec :${NC}"
  echo "   npm i -g supabase"
  echo "   supabase login"
  exit 1
}

# Vérifier que l'utilisateur est connecté
if ! supabase projects list >/dev/null 2>&1; then
  echo -e "${RED}❌ Vous n'êtes pas connecté à Supabase CLI${NC}"
  echo "   Exécutez : supabase login"
  exit 1
fi

echo -e "${GREEN}✅ Supabase CLI détecté${NC}"
echo ""

# 2. Push les migrations SQL
echo -e "${YELLOW}📦 Déploiement des migrations SQL...${NC}"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR/*.sql 2>/dev/null)" ]; then
  # Utiliser supabase db push pour appliquer les migrations
  # Note: Cette commande nécessite que le projet soit lié
  if supabase link --project-ref "$PROJECT_REF" >/dev/null 2>&1 || true; then
    echo "   ➜ Application des migrations..."
    # Pour les migrations, on peut aussi utiliser l'API ou le dashboard
    echo -e "${YELLOW}   ⚠️  Les migrations doivent être appliquées manuellement via le Dashboard SQL Editor${NC}"
    echo "   📝 Fichiers de migration à appliquer :"
    ls -1 "$MIGRATIONS_DIR"/*.sql | tail -5 | while read file; do
      echo "      - $(basename "$file")"
    done
  else
    echo -e "${YELLOW}   ⚠️  Projet non lié. Migrations à appliquer manuellement${NC}"
  fi
else
  echo -e "${YELLOW}   ℹ️  Aucune migration trouvée${NC}"
fi
echo ""

# 3. Déployer toutes les Edge Functions
echo -e "${YELLOW}📡 Déploiement des Edge Functions...${NC}"
if [ -d "$EDGE_DIR" ]; then
  FUNCTION_COUNT=0
  for fn_dir in "$EDGE_DIR"/*; do
    if [ -d "$fn_dir" ] && [ -f "$fn_dir/index.ts" ]; then
      name=$(basename "$fn_dir")
      echo "   ➜ Déploiement de $name..."
      
      # Déployer la fonction
      if supabase functions deploy "$name" --project-ref "$PROJECT_REF" --no-verify-jwt 2>&1; then
        echo -e "   ${GREEN}✅ $name déployé${NC}"
        FUNCTION_COUNT=$((FUNCTION_COUNT + 1))
      else
        echo -e "   ${RED}❌ Erreur lors du déploiement de $name${NC}"
        echo -e "   ${YELLOW}   Vérifiez que le projet est lié : supabase link --project-ref $PROJECT_REF${NC}"
      fi
    fi
  done
  
  if [ $FUNCTION_COUNT -eq 0 ]; then
    echo -e "${YELLOW}   ℹ️  Aucune Edge Function trouvée${NC}"
  else
    echo -e "${GREEN}✅ $FUNCTION_COUNT fonction(s) déployée(s)${NC}"
  fi
else
  echo -e "${YELLOW}   ℹ️  Dossier $EDGE_DIR introuvable${NC}"
fi
echo ""

# 4. Copie des secrets SMTP (guide interactif)
echo -e "${YELLOW}🔐 Configuration des secrets SMTP...${NC}"
echo "   Les secrets doivent être configurés manuellement dans :"
echo "   ${BLUE}Dashboard → Settings → Edge Functions → Secrets${NC}"
echo ""
echo "   Secrets requis :"
echo "   - SMTP_HOST"
echo "   - SMTP_PORT"
echo "   - SMTP_USER"
echo "   - SMTP_PASSWORD"
echo "   - SMTP_FROM"
echo ""
read -p "   Voulez-vous configurer les secrets maintenant ? (o/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
  for key in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM; do
    read -p "   ➜ $key : " VAL
    if [ -n "$VAL" ]; then
      if supabase secrets set "$key=$VAL" --project-ref "$PROJECT_REF" 2>&1; then
        echo -e "   ${GREEN}✅ $key configuré${NC}"
      else
        echo -e "   ${RED}❌ Erreur lors de la configuration de $key${NC}"
        echo "   Configurez-le manuellement dans le Dashboard"
      fi
    fi
  done
else
  echo -e "${YELLOW}   ⚠️  Secrets à configurer manuellement${NC}"
fi
echo ""

# 5. Configuration du cron (toutes les minutes)
echo -e "${YELLOW}⏰ Configuration du cron toutes les minutes...${NC}"
echo "   Exécutez le script SQL suivant dans le Dashboard SQL Editor :"
echo ""
echo -e "${BLUE}   Fichier : fix_cron_every_minute.sql${NC}"
echo ""
read -p "   Voulez-vous voir le contenu du script SQL ? (o/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
  if [ -f "fix_cron_every_minute.sql" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    cat "fix_cron_every_minute.sql"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
  else
    echo -e "${YELLOW}   ⚠️  Fichier fix_cron_every_minute.sql introuvable${NC}"
  fi
fi
echo -e "${YELLOW}   ⚠️  Le cron doit être configuré manuellement via le SQL Editor${NC}"
echo ""

# 6. Résumé
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Déploiement terminé${NC}"
echo ""
echo "📋 Actions restantes (manuelles) :"
echo "   1. ✅ Migrations SQL → Dashboard → SQL Editor"
echo "   2. ✅ Secrets SMTP → Dashboard → Settings → Edge Functions → Secrets"
echo "   3. ✅ Cron toutes les minutes → Dashboard → SQL Editor → fix_cron_every_minute.sql"
echo ""
echo -e "${BLUE}🔗 Dashboard : https://supabase.com/dashboard/project/$PROJECT_REF${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

