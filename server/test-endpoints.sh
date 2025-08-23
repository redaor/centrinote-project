#!/bin/bash

echo "🧪 Test des endpoints du serveur Zoom OAuth"
echo "==========================================="

BASE_URL="http://localhost:5173"

# Test 1: Health check
echo "1. Test endpoint /health"
curl -s "${BASE_URL}/health" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/health"
echo -e "\n"

# Test 2: Page principale
echo "2. Test page principale /"
RESPONSE=$(curl -s "${BASE_URL}/" | head -1)
echo "Page HTML: $RESPONSE"
echo ""

# Test 3: OAuth URL
echo "3. Test endpoint /auth/zoom" 
curl -s "${BASE_URL}/auth/zoom" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/auth/zoom"
echo -e "\n"

# Test 4: Auth status (non authentifié)
echo "4. Test endpoint /auth/me (non authentifié)"
curl -s "${BASE_URL}/auth/me" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/auth/me"
echo -e "\n"

echo "✅ Tests terminés"