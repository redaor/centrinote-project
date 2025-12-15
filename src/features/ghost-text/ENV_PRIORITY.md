# Ordre de priorité des variables d'environnement (Vite)

## 📋 Ordre de chargement (du plus prioritaire au moins prioritaire)

1. **`.env.local`** ← **PRIORITÉ MAXIMALE** (toujours chargé, jamais versionné)
2. **`.env.[mode].local`** (ex: `.env.development.local`)
3. **`.env.[mode]`** (ex: `.env.development` ou `.env.production`)
4. **`.env`** ← Priorité la plus basse

## 🔍 Pour l'autocomplétion IA

### En localhost (développement)
- ✅ **Utilise `.env.local`** avec `VITE_OPENAI_AUTO_COMPLETION`
- Si non trouvé, essaie `VITE_OPENAI_API_KEY` (fallback)

### En production
- ✅ **Utilise `OPENAI_AUTO_COMPLETION`** (sans préfixe VITE_)
- Si non trouvé, essaie `VITE_OPENAI_AUTO_COMPLETION` (fallback)
- Si non trouvé, essaie `VITE_OPENAI_API_KEY` (fallback)

## 📝 Configuration recommandée

### `.env.local` (local, jamais versionné)
```bash
VITE_OPENAI_AUTO_COMPLETION=sk-xxx
```

### `.env` (peut être versionné, valeurs par défaut)
```bash
# Variables partagées (sans valeurs sensibles)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## ⚠️ Important

- **`.env.local`** est dans `.gitignore` → **jamais versionné**
- **`.env`** peut être versionné (sans valeurs sensibles)
- Les variables avec préfixe `VITE_` sont exposées côté client
- Les variables sans préfixe `VITE_` ne sont **pas** accessibles côté client (sauf en production avec configuration spéciale)

## 🔄 Redémarrage requis

Après modification de `.env.local` ou `.env`, **redémarrer le serveur Vite** :
```bash
# Arrêter (Ctrl+C)
# Puis redémarrer
npm run dev
```

