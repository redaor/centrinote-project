#!/usr/bin/env bash

# =====================================================
# 🚀 Script de Déploiement Complet (Version Avancée)
# Synchronise bac à sable → production avec gestion d'erreurs
# =====================================================

set -e

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_REF:-wjzlicokhxitmeoxkjzv}"
EDGE_DIR="supabase/functions"
MIGRATIONS_DIR="supabase/migrations"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour afficher les erreurs
error() {
  echo -e "${RED}❌ $1${NC}" >&2
  exit 1
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Déploiement Automatique Bac à Sable → Production${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Vérifications préalables
echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"

# Vérifier Supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  error "Supabase CLI requis. Installez-le avec : npm i -g supabase && supabase login"
fi

# Vérifier la connexion
if ! supabase projects list >/dev/null 2>&1; then
  error "Non connecté à Supabase CLI. Exécutez : supabase login"
fi

success "Prérequis OK"
echo ""

# 2. Lier le projet (si nécessaire)
echo -e "${YELLOW}🔗 Liaison du projet...${NC}"
if supabase link --project-ref "$PROJECT_REF" >/dev/null 2>&1; then
  success "Projet lié : $PROJECT_REF"
else
  warning "Projet déjà lié ou erreur de liaison (continuez...)"
fi
echo ""

# 3. Déployer les Edge Functions
echo -e "${YELLOW}📡 Déploiement des Edge Functions...${NC}"
FUNCTION_COUNT=0
FUNCTION_ERRORS=0

if [ -d "$EDGE_DIR" ]; then
  for fn_dir in "$EDGE_DIR"/*; do
    if [ -d "$fn_dir" ] && [ -f "$fn_dir/index.ts" ]; then
      name=$(basename "$fn_dir")
      echo -n "   ➜ $name... "
      
      if supabase functions deploy "$name" --project-ref "$PROJECT_REF" --no-verify-jwt >/dev/null 2>&1; then
        success "$name"
        FUNCTION_COUNT=$((FUNCTION_COUNT + 1))
      else
        error "Erreur lors du déploiement de $name"
        FUNCTION_ERRORS=$((FUNCTION_ERRORS + 1))
      fi
    fi
  done
  
  if [ $FUNCTION_COUNT -gt 0 ]; then
    success "$FUNCTION_COUNT fonction(s) déployée(s)"
  fi
  
  if [ $FUNCTION_ERRORS -gt 0 ]; then
    warning "$FUNCTION_ERRORS erreur(s) lors du déploiement"
  fi
else
  warning "Dossier $EDGE_DIR introuvable"
fi
echo ""

# 4. Afficher les instructions pour les migrations
echo -e "${YELLOW}📦 Migrations SQL...${NC}"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR/*.sql 2>/dev/null)" ]; then
  info "Migrations à appliquer manuellement via le Dashboard SQL Editor"
  echo "   Fichiers récents :"
  ls -1t "$MIGRATIONS_DIR"/*.sql 2>/dev/null | head -5 | while read file; do
    echo "      - $(basename "$file")"
  done
else
  warning "Aucune migration trouvée"
fi
echo ""

# 5. Instructions pour les secrets
echo -e "${YELLOW}🔐 Secrets SMTP...${NC}"
info "À configurer dans : Dashboard → Settings → Edge Functions → Secrets"
echo "   Secrets requis :"
echo "      - SMTP_HOST"
echo "      - SMTP_PORT"
echo "      - SMTP_USER"
echo "      - SMTP_PASSWORD"
echo "      - SMTP_FROM"
echo ""

# 6. Instructions pour le cron
echo -e "${YELLOW}⏰ Cron toutes les minutes...${NC}"
if [ -f "fix_cron_every_minute.sql" ]; then
  info "Exécutez fix_cron_every_minute.sql dans le Dashboard SQL Editor"
else
  warning "Fichier fix_cron_every_minute.sql introuvable"
fi
echo ""

# 7. Résumé final
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Déploiement automatique terminé${NC}"
echo ""
echo -e "${YELLOW}📋 Actions manuelles restantes :${NC}"
echo "   1. Migrations SQL → Dashboard → SQL Editor"
echo "   2. Secrets SMTP → Dashboard → Settings → Edge Functions → Secrets"
echo "   3. Cron → Dashboard → SQL Editor → fix_cron_every_minute.sql"
echo ""
echo -e "${BLUE}🔗 Dashboard : https://supabase.com/dashboard/project/$PROJECT_REF${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

