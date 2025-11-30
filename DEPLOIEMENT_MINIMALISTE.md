# 🚀 Guide de Déploiement Minimaliste Netlify

> ⚠️ **IMPORTANT** : L'utilisateur a épuisé ses crédits Netlify. Ce guide permet un déploiement **ultra-frugal** avec **0 crédit consommé** tant qu'on ne déploie pas en prod.

## 📋 Objectif

- **0 crédit consommé** tant que pas de déploiement en prod
- **1 seul déploiement = ~15 crédits/mois max** (uniquement sur tag `release`)
- **Pas de build automatique** sur Netlify
- **Pas de Deploy Previews** ni branch builds

## 🔧 Configuration Netlify Dashboard

### 1. Désactiver les builds automatiques

1. Allez sur : https://app.netlify.com/sites/[VOTRE_SITE]/settings/build
2. **Décochez** :
   - ✅ "Stop auto publishing" → **ACTIVER** (cochez cette case)
   - ❌ "Build hooks" → Désactiver tous les hooks automatiques
   - ❌ "Deploy notifications" → Désactiver

### 2. Désactiver les Deploy Previews

1. Allez sur : https://app.netlify.com/sites/[VOTRE_SITE]/settings/deploys
2. **Décochez** :
   - ❌ "Deploy previews" → **DÉSACTIVER**
   - ❌ "Branch deploys" → **DÉSACTIVER**
   - ❌ "Automatic builds" → **DÉSACTIVER**

### 3. Configuration Build Settings

1. Allez sur : https://app.netlify.com/sites/[VOTRE_SITE]/settings/build
2. **Modifiez** :
   - **Build command** : `echo "Build désactivé - déploiement manuel uniquement"`
   - **Publish directory** : `dist` (ou `build` selon votre config)
   - **Base directory** : (laisser vide)

## 🚀 Méthode 1 : Déploiement via CLI (Recommandé)

### Installation Netlify CLI

```bash
npm install -g netlify-cli
```

### Authentification

```bash
netlify login
```

### Déploiement manuel (après build local)

```bash
# 1. Build en local
npm run build

# 2. Déployer uniquement le dossier dist/
netlify deploy --prod --dir=dist
```

**Coût** : ~15 crédits Netlify par déploiement

### Déploiement en preview (gratuit, pour tester)

```bash
# Build + déploiement preview (gratuit)
npm run build
netlify deploy --dir=dist
```

## 🚀 Méthode 2 : Déploiement via GitHub Actions (Automatique sur tag)

### Configuration

1. **Créer les secrets GitHub** :
   - Allez sur : https://github.com/[USER]/[REPO]/settings/secrets/actions
   - Ajoutez :
     - `NETLIFY_AUTH_TOKEN` : Token Netlify (https://app.netlify.com/user/applications)
     - `NETLIFY_SITE_ID` : ID du site Netlify (dans Settings → General → Site details)

2. **Le workflow est déjà créé** : `.github/workflows/manual-deploy.yml`

### Utilisation

```bash
# 1. Build en local (optionnel, pour vérifier)
npm run build

# 2. Créer un tag release
git tag release-v1.0.0

# 3. Pousser le tag
git push origin release-v1.0.0
```

**Résultat** : GitHub Actions build + déploie automatiquement sur Netlify

**Coût** : ~15 crédits Netlify par déploiement

## 🚀 Méthode 3 : Drag & Drop (Le plus simple)

1. **Build en local** :
   ```bash
   npm run build
   ```

2. **Allez sur** : https://app.netlify.com/drop

3. **Glissez-déposez** le dossier `dist/` (ou `build/`)

4. **Attendez** le déploiement (gratuit en preview, ~15 crédits en prod)

## 🛑 Ignorer un push (skip Netlify)

Si vous voulez pousser du code sans déclencher de build :

```bash
git commit -m "[skip netlify] Fix typo"
git push
```

Netlify ignore automatiquement les commits avec `[skip netlify]` dans le message.

## 📊 Résumé des coûts

| Action | Coût Netlify | Fréquence |
|--------|--------------|-----------|
| Build automatique | ~15 crédits | ❌ Désactivé |
| Deploy Preview | ~15 crédits | ❌ Désactivé |
| Branch Deploy | ~15 crédits | ❌ Désactivé |
| **Déploiement manuel (CLI)** | **~15 crédits** | ✅ Sur demande |
| **Déploiement via tag `release`** | **~15 crédits** | ✅ Sur demande |
| **Drag & Drop** | **~15 crédits** | ✅ Sur demande |

**Total mensuel estimé** : 0-15 crédits (selon vos déploiements)

## ✅ Checklist de configuration

- [ ] Build automatique désactivé dans Netlify Dashboard
- [ ] Deploy Previews désactivés
- [ ] Branch deploys désactivés
- [ ] Netlify CLI installé et authentifié
- [ ] Secrets GitHub configurés (si utilisation GitHub Actions)
- [ ] Workflow `.github/workflows/manual-deploy.yml` créé
- [ ] Test de déploiement manuel réussi

## 🔍 Vérification

Pour vérifier qu'aucun build automatique ne se déclenche :

1. Faites un commit normal (sans `[skip netlify]`)
2. Poussez sur `main`
3. **Vérifiez** : Aucun build ne doit apparaître dans Netlify Dashboard

## 📝 Notes importantes

- **Ne touchez pas** aux fonctions serverless, forms, ou bandwidth
- **Déploiement statique uniquement** (dossier `dist/`)
- **Build en local** avant chaque déploiement
- **Utilisez les tags `release`** pour les déploiements importants uniquement

---

**Dernière mise à jour** : 2025-01-02  
**Objectif** : 0 crédit consommé tant que pas de déploiement en prod

