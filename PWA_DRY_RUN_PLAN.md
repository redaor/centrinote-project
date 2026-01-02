# 📋 PLAN DRY-RUN - Transformation React+Vite en PWA

## 🔍 ANALYSE ACTUELLE

### Fichiers existants (checksums SHA256)
- `vite.config.ts`: `20544f9ecfe90d8b1ef1ba3419e5b12afc11f80d21ca9b1f7fb1c415f18c17d1`
- `package.json`: `53c237269569e245074dd4f5124fdb39c452bc77619b8b18a3b2e6befca476fb`
- `netlify.toml`: `af75c2a67365ec4e3efc7f588e846643ff2b9b4365b750345cc9af8e74f6528e`
- `index.html`: `5ac85d9095e0eec73d809d67c1e66019ba431cef3218c008cc8ab312bf532aa0`

### Environnement détecté
- Package manager: `pnpm` (v10.11.0)
- Build tool: `vite` (v5.4.2)
- Framework: `React` (v18.3.1)
- Output directory: `dist`

### Configuration Supabase
- Domaine: `*.supabase.co` (détecté dans le code)
- Endpoints: `/rest/v1/*`, `/auth/v1/*`, `/storage/v1/*`
- Stratégie requise: Network-first (pas de cache pour auth/db/storage)

---

## 📦 ÉTAPE 1: INSTALLATION (DRY-RUN)

### Commande à exécuter
```bash
pnpm add -D vite-plugin-pwa
```

### Dépendances qui seront ajoutées
- `vite-plugin-pwa` (dernière version)
- `workbox-window` (peer dependency, automatique)
- `workbox-precaching` (peer dependency, automatique)
- `workbox-routing` (peer dependency, automatique)
- `workbox-strategies` (peer dependency, automatique)

**Impact**: Seulement `devDependencies` (pas de runtime)

---

## 📝 ÉTAPE 2: MODIFICATIONS DE FICHIERS

### 2.1 `vite.config.ts` → `vite.config.ts.bak` (SAUVEGARDE)

**AVANT** (ligne 24-27):
```typescript
plugins: [
  react(),
  excludeMarkdownPlugin(),
],
```

**APRÈS** (ajout après import):
```typescript
import { VitePWA } from 'vite-plugin-pwa';

// ... existing code ...

plugins: [
  react(),
  excludeMarkdownPlugin(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml'],
    manifest: {
      name: 'centrinote',
      short_name: 'centrinote',
      description: 'Prenez vos notes rapidement, partout, même offline.',
      theme_color: '#2563eb',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait-primary',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.(co|in)\/.*$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60, // 1 hour
            },
            networkTimeoutSeconds: 10,
          },
        },
      ],
    },
  }),
],
```

**Lignes modifiées**: 
- Ligne 2: Ajout import
- Lignes 24-27: Ajout plugin dans array

**Impact**: Aucun impact sur le code métier (uniquement configuration build)

---

### 2.2 `package.json` → `package.json.bak` (SAUVEGARDE)

**AJOUT dans `devDependencies`**:
```json
"vite-plugin-pwa": "^0.21.0"
```

**Impact**: Seulement dev dependency, aucun impact runtime

---

### 2.3 `netlify.toml` → MODIFICATION (pas de backup nécessaire, ajout)

**AJOUT après ligne 3**:
```toml
[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "public, max-age=0, must-revalidate"
```

**Impact**: Headers HTTP seulement, aucun impact code

---

### 2.4 `index.html` → MODIFICATION AUTOMATIQUE (par le plugin)

**AJOUT dans `<head>`** (automatique par plugin):
```html
<link rel="manifest" href="/manifest.webmanifest">
```

**Impact**: Référence manifest seulement, aucun impact fonctionnel

---

## 📁 ÉTAPE 3: FICHIERS CRÉÉS (par le build)

### 3.1 `dist/manifest.webmanifest` (généré automatiquement)
```json
{
  "name": "centrinote",
  "short_name": "centrinote",
  "description": "Prenez vos notes rapidement, partout, même offline.",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/",
  "icons": [...]
}
```

### 3.2 `dist/sw.js` (service worker généré par Workbox)
- Généré automatiquement
- Contient la logique de cache
- Network-first pour Supabase

### 3.3 `dist/workbox-*.js` (runtime Workbox)
- Généré automatiquement
- Gestion du cache offline

---

## 🔧 ÉTAPE 4: ICÔNES REQUISES

**À CRÉER MANUELLEMENT** (optionnel, sinon plugin générera des placeholders):
- `public/pwa-192x192.png` (192x192px)
- `public/pwa-512x512.png` (512x512px)

**Note**: Si absentes, le plugin générera des icônes basiques. Vous pouvez les remplacer après.

---

## ✅ ÉTAPE 5: VÉRIFICATIONS POST-INSTALLATION

### Tests à effectuer:
1. ✅ `pnpm build` → doit passer sans erreur
2. ✅ `dist/manifest.webmanifest` → doit exister
3. ✅ `dist/sw.js` → doit exister
4. ✅ Lighthouse PWA score → doit être 100
5. ✅ Appels Supabase → doivent fonctionner (network-first)
6. ✅ Mode offline → doit fonctionner (cache fallback)
7. ✅ Install prompt → doit apparaître (navigateurs compatibles)

---

## 🚨 GARANTIES

### ❌ AUCUN IMPACT sur:
- ✅ Tous les fichiers dans `src/` (composants, hooks, pages, services)
- ✅ Routes existantes
- ✅ Logique métier
- ✅ Appels API Supabase (stratégie network-first = toujours frais)
- ✅ Authentification (pas de cache auth)
- ✅ Variables d'environnement
- ✅ Configuration Supabase

### ✅ SEULEMENT AJOUTÉ:
- Plugin de build (dev dependency)
- Manifest (métadonnées PWA)
- Service worker (cache offline)
- Headers Netlify (configuration serveur)

---

## 🔄 COMMANDES DE ROLLBACK

Si validation refusée, annuler avec:
```bash
# Restaurer vite.config.ts
cp vite.config.ts.bak vite.config.ts

# Restaurer package.json
cp package.json.bak package.json

# Désinstaller le plugin
pnpm remove vite-plugin-pwa
```

---

## 📊 RÉSUMÉ DES MODIFICATIONS

| Fichier | Action | Impact Code Métier |
|---------|--------|-------------------|
| `vite.config.ts` | MODIFIÉ | ❌ Aucun |
| `package.json` | MODIFIÉ | ❌ Aucun |
| `netlify.toml` | MODIFIÉ | ❌ Aucun |
| `index.html` | MODIFIÉ (auto) | ❌ Aucun |
| `dist/manifest.webmanifest` | CRÉÉ (build) | ❌ Aucun |
| `dist/sw.js` | CRÉÉ (build) | ❌ Aucun |

**Total fichiers modifiés dans src/**: **0**

---

## ⏭️ PROCHAINES ÉTAPES

1. ✅ Validation du plan (vous êtes ici)
2. ⏳ Sauvegarde des fichiers (`*.bak`)
3. ⏳ Installation du plugin (`pnpm add -D vite-plugin-pwa`)
4. ⏳ Modification `vite.config.ts`
5. ⏳ Modification `netlify.toml`
6. ⏳ Test build (`pnpm build`)
7. ⏳ Vérification Lighthouse
8. ⏳ Génération des checksums après

---

**STATUT**: 🔍 DRY-RUN TERMINÉ - EN ATTENTE VALIDATION

