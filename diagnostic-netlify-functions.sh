#!/bin/bash

# 🔍 Script de Diagnostic Netlify Functions
# Tests complets pour identifier les problèmes API
# =============================================

# Configuration
BASE_URL="https://centrinote.fr"
# BASE_URL="https://centrinote.netlify.app"  # Alternative

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables d'environnement (à définir avant d'exécuter)
MASTER_TOKEN="${MASTER_API_TOKEN:-your_master_token_here}"
TEST_API_KEY="${TEST_API_KEY:-}"

echo -e "${BLUE}🔍 DIAGNOSTIC NETLIFY FUNCTIONS${NC}"
echo -e "${BLUE}===============================${NC}"
echo "🎯 Base URL: $BASE_URL"
echo "🔑 Master Token: ${MASTER_TOKEN:0:10}..."
echo "🔧 Test API Key: ${TEST_API_KEY:0:15}..."
echo ""

# ===========================================
# TEST 1: Health Check (pas d'auth requise)
# ===========================================
echo -e "${YELLOW}🏥 TEST 1: Health Check${NC}"
echo "----------------------------"

health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Content-Type: application/json" \
  "$BASE_URL/.netlify/functions/health")

http_code=$(echo "$health_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$health_response" | sed 's/HTTPSTATUS:[0-9]*$//')

echo "📡 URL: $BASE_URL/.netlify/functions/health"
echo "📊 Status Code: $http_code"
echo "📄 Response: $response_body"

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Health Check: SUCCESS${NC}"
else
    echo -e "${RED}❌ Health Check: FAILED${NC}"
fi
echo ""

# ===========================================
# TEST 2: CORS Preflight
# ===========================================
echo -e "${YELLOW}🌐 TEST 2: CORS Preflight${NC}"
echo "--------------------------------"

cors_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X OPTIONS \
  -H "Content-Type: application/json" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization" \
  "$BASE_URL/.netlify/functions/reports")

cors_code=$(echo "$cors_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
cors_body=$(echo "$cors_response" | sed 's/HTTPSTATUS:[0-9]*$//')

echo "📡 URL: $BASE_URL/.netlify/functions/reports (OPTIONS)"
echo "📊 Status Code: $cors_code"
echo "📄 Response: $cors_body"

if [ "$cors_code" = "200" ]; then
    echo -e "${GREEN}✅ CORS Preflight: SUCCESS${NC}"
else
    echo -e "${RED}❌ CORS Preflight: FAILED${NC}"
fi
echo ""

# ===========================================
# TEST 3: Generate Key (sans auth)
# ===========================================
echo -e "${YELLOW}🔑 TEST 3: Generate Key - Sans Auth${NC}"
echo "-------------------------------------"

gen_noauth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key"}' \
  "$BASE_URL/.netlify/functions/generate-key")

gen_noauth_code=$(echo "$gen_noauth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
gen_noauth_body=$(echo "$gen_noauth_response" | sed 's/HTTPSTATUS:[0-9]*$//')

echo "📡 URL: $BASE_URL/.netlify/functions/generate-key (POST sans Bearer)"
echo "📊 Status Code: $gen_noauth_code"
echo "📄 Response: $gen_noauth_body"

if [ "$gen_noauth_code" = "401" ]; then
    echo -e "${GREEN}✅ Generate Key Sans Auth: SUCCESS (401 attendu)${NC}"
else
    echo -e "${RED}❌ Generate Key Sans Auth: FAILED (devrait retourner 401)${NC}"
fi
echo ""

# ===========================================
# TEST 4: Generate Key (avec master token)
# ===========================================
echo -e "${YELLOW}🔑 TEST 4: Generate Key - Avec Master Token${NC}"
echo "----------------------------------------------"

if [ "$MASTER_TOKEN" != "your_master_token_here" ]; then
    gen_auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $MASTER_TOKEN" \
      -d '{
        "name": "Test Key Diagnostic",
        "permissions": ["reports:write"],
        "expiresIn": 30,
        "metadata": {
          "purpose": "diagnostic_test",
          "created_by": "diagnostic_script"
        }
      }' \
      "$BASE_URL/.netlify/functions/generate-key")

    gen_auth_code=$(echo "$gen_auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    gen_auth_body=$(echo "$gen_auth_response" | sed 's/HTTPSTATUS:[0-9]*$//')

    echo "📡 URL: $BASE_URL/.netlify/functions/generate-key (POST avec Bearer)"
    echo "📊 Status Code: $gen_auth_code"
    echo "📄 Response: $gen_auth_body"

    if [ "$gen_auth_code" = "201" ]; then
        echo -e "${GREEN}✅ Generate Key Avec Auth: SUCCESS${NC}"
        
        # Extraire la clé générée pour les tests suivants
        NEW_API_KEY=$(echo "$gen_auth_body" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
        if [ ! -z "$NEW_API_KEY" ]; then
            echo -e "${GREEN}🔑 Nouvelle clé générée: ${NEW_API_KEY:0:20}...${NC}"
            TEST_API_KEY="$NEW_API_KEY"
        fi
    else
        echo -e "${RED}❌ Generate Key Avec Auth: FAILED${NC}"
        echo -e "${RED}💡 Vérifiez MASTER_API_TOKEN dans les variables Netlify${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  MASTER_TOKEN non défini - Test ignoré${NC}"
    echo -e "${YELLOW}💡 Définissez MASTER_API_TOKEN pour ce test${NC}"
fi
echo ""

# ===========================================
# TEST 5: Reports - Sans Auth
# ===========================================
echo -e "${YELLOW}📥 TEST 5: Reports - Sans Auth${NC}"
echo "------------------------------------"

reports_noauth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "test-report-123",
    "roomName": "test-room-456",
    "reportData": "{\"transcript\": \"Test content\"}"
  }' \
  "$BASE_URL/.netlify/functions/reports")

reports_noauth_code=$(echo "$reports_noauth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
reports_noauth_body=$(echo "$reports_noauth_response" | sed 's/HTTPSTATUS:[0-9]*$//')

echo "📡 URL: $BASE_URL/.netlify/functions/reports (POST sans Bearer)"
echo "📊 Status Code: $reports_noauth_code"
echo "📄 Response: $reports_noauth_body"

if [ "$reports_noauth_code" = "401" ]; then
    echo -e "${GREEN}✅ Reports Sans Auth: SUCCESS (401 attendu)${NC}"
else
    echo -e "${RED}❌ Reports Sans Auth: FAILED (devrait retourner 401)${NC}"
fi
echo ""

# ===========================================
# TEST 6: Reports - Avec API Key
# ===========================================
echo -e "${YELLOW}📥 TEST 6: Reports - Avec API Key${NC}"
echo "------------------------------------"

if [ ! -z "$TEST_API_KEY" ] && [ "$TEST_API_KEY" != "" ]; then
    reports_auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TEST_API_KEY" \
      -d '{
        "reportId": "diagnostic-test-'$(date +%s)'",
        "roomName": "diagnostic-room-'$(date +%s)'",
        "reportData": "{\"transcript\": \"Diagnostic test content\", \"summary\": \"Test summary\"}",
        "participantEmails": "test@example.com,test2@example.com",
        "reportType": "meeting_report",
        "metadata": {
          "test": true,
          "source": "diagnostic_script"
        }
      }' \
      "$BASE_URL/.netlify/functions/reports")

    reports_auth_code=$(echo "$reports_auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    reports_auth_body=$(echo "$reports_auth_response" | sed 's/HTTPSTATUS:[0-9]*$//')

    echo "📡 URL: $BASE_URL/.netlify/functions/reports (POST avec Bearer)"
    echo "🔑 API Key: ${TEST_API_KEY:0:20}..."
    echo "📊 Status Code: $reports_auth_code"
    echo "📄 Response: $reports_auth_body"

    if [ "$reports_auth_code" = "201" ]; then
        echo -e "${GREEN}✅ Reports Avec Auth: SUCCESS${NC}"
    else
        echo -e "${RED}❌ Reports Avec Auth: FAILED${NC}"
        echo -e "${RED}💡 Problème possible: Table Supabase manquante ou clé invalide${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  TEST_API_KEY non disponible - Test ignoré${NC}"
    echo -e "${YELLOW}💡 Générez d'abord une clé API via le test précédent${NC}"
fi
echo ""

# ===========================================
# TEST 7: GET Reports - Avec API Key
# ===========================================
echo -e "${YELLOW}📋 TEST 7: GET Reports - Avec API Key${NC}"
echo "---------------------------------------"

if [ ! -z "$TEST_API_KEY" ] && [ "$TEST_API_KEY" != "" ]; then
    get_reports_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
      -H "Authorization: Bearer $TEST_API_KEY" \
      "$BASE_URL/.netlify/functions/reports?limit=5")

    get_reports_code=$(echo "$get_reports_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    get_reports_body=$(echo "$get_reports_response" | sed 's/HTTPSTATUS:[0-9]*$//')

    echo "📡 URL: $BASE_URL/.netlify/functions/reports (GET avec Bearer)"
    echo "📊 Status Code: $get_reports_code"
    echo "📄 Response: $get_reports_body"

    if [ "$get_reports_code" = "200" ]; then
        echo -e "${GREEN}✅ GET Reports: SUCCESS${NC}"
    else
        echo -e "${RED}❌ GET Reports: FAILED${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  TEST_API_KEY non disponible - Test ignoré${NC}"
fi
echo ""

# ===========================================
# RÉSUMÉ DIAGNOSTIC
# ===========================================
echo -e "${BLUE}📊 RÉSUMÉ DIAGNOSTIC${NC}"
echo -e "${BLUE}===================${NC}"
echo ""

echo -e "${YELLOW}🔍 PROBLÈMES IDENTIFIÉS:${NC}"
echo ""

echo -e "${RED}1. 'Invalid API key' (Supabase) - generate-key.js:${NC}"
echo "   💡 Cause probable: Table 'api_keys' n'existe pas dans Supabase"
echo "   🔧 Solution: Créer la table avec le SQL fourni"
echo ""

echo -e "${RED}2. 'API key not found' - reports.js:${NC}"
echo "   💡 Cause probable: "
echo "   - Table 'api_keys' manquante OU"
echo "   - Clé API générée mais pas stockée OU" 
echo "   - Validation échoue sur format 'cnt_' vs 'cnt_live_'"
echo "   🔧 Solution: Vérifier/créer tables + corriger validation"
echo ""

echo -e "${YELLOW}🛠️  ACTIONS RECOMMANDÉES:${NC}"
echo "1. Vérifier variables d'environnement Netlify:"
echo "   - MASTER_API_TOKEN"
echo "   - VITE_SUPABASE_URL" 
echo "   - SUPABASE_SERVICE_KEY (Service Role, pas Anon)"
echo ""
echo "2. Créer tables Supabase manquantes (SQL dans documentation)"
echo ""
echo "3. Corriger validation format clés API (cnt_ vs cnt_live_)"
echo ""
echo "4. Tester avec ce script après corrections:"
echo "   MASTER_API_TOKEN=your_token ./diagnostic-netlify-functions.sh"
echo ""

echo -e "${GREEN}💡 Ce script identifie les problèmes exacts !${NC}"