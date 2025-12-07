#!/bin/bash
# ===================================================
# 🔐 SCRIPT DE SÉCURITÉ - DÉTECTION DE SECRETS
# ===================================================
# Ce script vérifie que AUCUNE clé secrète n'est exposée
# dans le dossier dist/ avant le déploiement
# ===================================================

echo "🔍 Scanning for exposed secrets in dist/..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteur d'erreurs
ERRORS=0

# Vérifier que dist/ existe
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ ERROR: dist/ folder not found!${NC}"
  echo "   Run 'npm run build' first"
  exit 1
fi

echo "📦 Checking dist/ folder..."

# ===================================================
# 1. OPENAI API KEY (CRITIQUE)
# ===================================================
echo ""
echo "1️⃣ Checking for OpenAI API keys..."
OPENAI_KEYS=$(grep -r "sk-proj-" dist/ 2>/dev/null || true)
if [ -n "$OPENAI_KEYS" ]; then
  echo -e "${RED}❌ CRITICAL: OpenAI API key found in build!${NC}"
  echo "$OPENAI_KEYS" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No OpenAI keys found${NC}"
fi

# ===================================================
# 2. STRIPE SECRET KEY (CRITIQUE)
# ===================================================
echo ""
echo "2️⃣ Checking for Stripe secret keys..."
STRIPE_SECRET=$(grep -r "sk_live_" dist/ 2>/dev/null || true)
if [ -n "$STRIPE_SECRET" ]; then
  echo -e "${RED}❌ CRITICAL: Stripe SECRET key found in build!${NC}"
  echo "$STRIPE_SECRET" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Stripe secret keys found${NC}"
fi

# ===================================================
# 3. GOOGLE CLIENT SECRET (CRITIQUE)
# ===================================================
echo ""
echo "3️⃣ Checking for Google Client Secret..."
GOOGLE_SECRET=$(grep -r "GOCSPX-" dist/ 2>/dev/null || true)
if [ -n "$GOOGLE_SECRET" ]; then
  echo -e "${RED}❌ CRITICAL: Google CLIENT_SECRET found in build!${NC}"
  echo "$GOOGLE_SECRET" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Google client secrets found${NC}"
fi

# ===================================================
# 4. DAILY API KEY (CRITIQUE)
# ===================================================
echo ""
echo "4️⃣ Checking for Daily.co API key..."
DAILY_KEY=$(grep -r "9e75426e2586b0d2178a7ebf76e9b474a08d78b261c357b890b79baa7d4fb711" dist/ 2>/dev/null || true)
if [ -n "$DAILY_KEY" ]; then
  echo -e "${RED}❌ CRITICAL: Daily.co API key found in build!${NC}"
  echo "$DAILY_KEY" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Daily.co API keys found${NC}"
fi

# ===================================================
# 5. SUPABASE SERVICE ROLE KEY (CRITIQUE)
# ===================================================
echo ""
echo "5️⃣ Checking for Supabase service_role key..."
SUPABASE_SERVICE=$(grep -r "service_role" dist/ 2>/dev/null | grep -v "VITE_SUPABASE_ANON_KEY" || true)
if [ -n "$SUPABASE_SERVICE" ]; then
  echo -e "${RED}❌ CRITICAL: Supabase SERVICE key found in build!${NC}"
  echo "$SUPABASE_SERVICE" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Supabase service keys found${NC}"
fi

# ===================================================
# 6. DATABASE URLs WITH PASSWORDS (CRITIQUE)
# ===================================================
echo ""
echo "6️⃣ Checking for database URLs..."
DB_URLS=$(grep -r "postgresql://.*:.*@" dist/ 2>/dev/null || true)
if [ -n "$DB_URLS" ]; then
  echo -e "${RED}❌ CRITICAL: Database URL with password found!${NC}"
  echo "$DB_URLS" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No database URLs found${NC}"
fi

# ===================================================
# 7. SMTP PASSWORDS (CRITIQUE)
# ===================================================
echo ""
echo "7️⃣ Checking for SMTP passwords..."
SMTP_PASS=$(grep -r "Qu2F6GS3vrTzrP6" dist/ 2>/dev/null || true)
if [ -n "$SMTP_PASS" ]; then
  echo -e "${RED}❌ CRITICAL: SMTP password found in build!${NC}"
  echo "$SMTP_PASS" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No SMTP passwords found${NC}"
fi

# ===================================================
# 8. JWT SECRET (CRITIQUE)
# ===================================================
echo ""
echo "8️⃣ Checking for JWT secrets..."
JWT_SECRET=$(grep -r "JWT_SECRET" dist/ 2>/dev/null || true)
if [ -n "$JWT_SECRET" ]; then
  echo -e "${RED}❌ CRITICAL: JWT_SECRET found in build!${NC}"
  echo "$JWT_SECRET" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No JWT secrets found${NC}"
fi

# ===================================================
# 9. WEBHOOK SECRETS (CRITIQUE)
# ===================================================
echo ""
echo "9️⃣ Checking for webhook secrets..."
WEBHOOK_SECRET=$(grep -r "whsec_" dist/ 2>/dev/null || true)
if [ -n "$WEBHOOK_SECRET" ]; then
  echo -e "${RED}❌ CRITICAL: Webhook secret found in build!${NC}"
  echo "$WEBHOOK_SECRET" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No webhook secrets found${NC}"
fi

# ===================================================
# 10. MASTER API TOKEN (CRITIQUE)
# ===================================================
echo ""
echo "🔟 Checking for master API token..."
MASTER_TOKEN=$(grep -r "centrinote_master_" dist/ 2>/dev/null || true)
if [ -n "$MASTER_TOKEN" ]; then
  echo -e "${RED}❌ CRITICAL: MASTER_API_TOKEN found in build!${NC}"
  echo "$MASTER_TOKEN" | head -3
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No master tokens found${NC}"
fi

# ===================================================
# RÉSULTAT FINAL
# ===================================================
echo ""
echo "============================================="
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ SECURITY CHECK FAILED!${NC}"
  echo -e "${RED}   Found $ERRORS critical security issue(s)${NC}"
  echo ""
  echo "🚨 DO NOT DEPLOY! Fix these issues first:"
  echo "   1. Remove ALL non-VITE_ secrets from .env"
  echo "   2. Use Edge Functions for server-side API calls"
  echo "   3. Run 'npm run build' again"
  echo "   4. Re-run this check"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ SECURITY CHECK PASSED!${NC}"
  echo -e "${GREEN}   No secrets found in build${NC}"
  echo ""
  echo "✅ Safe to deploy!"
  exit 0
fi
