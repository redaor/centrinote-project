#!/usr/bin/env bash

set -e

echo "🔍  Lint (refactor mode)"

npx eslint --config eslint.config.refactor.js src --max-warnings 100

echo "🔍  Type-check"

npx tsc --noEmit -p tsconfig.json

echo "🔍  Tests ai-chat (skip – non configuré)"

echo "🔍  Build feature isolé"

npx vite build --config vite.config.ai-chat.ts

echo "✅  OK pour passer à l'étape suivante"
