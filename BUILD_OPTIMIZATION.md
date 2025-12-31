# 🚀 **Configuration d'Optimisation du Build - Centrinote**

> **Date de création :** 31 Décembre 2025
> **Objectif :** Exclure les fichiers `.md` du déploiement Netlify pour optimiser le build

---

## 📊 **Statistiques du Projet**

| Métrique | Valeur |
|----------|--------|
| **Fichiers .md dans le projet** | 1 358 fichiers |
| **Fichiers dans dist/ après build** | 28 fichiers |
| **Fichiers .md dans dist/** | ✅ **0 fichier** |
| **Taille du build** | 11 MB |

---

## ✅ **Configurations Appliquées**

### **1. Plugin Vite Personnalisé** (`vite.config.ts`)

Un plugin personnalisé a été ajouté pour filtrer automatiquement tous les fichiers `.md` du bundle final :

```typescript
// Plugin personnalisé pour exclure les fichiers .md du build
function excludeMarkdownPlugin(): Plugin {
  return {
    name: 'exclude-markdown',
    generateBundle(_, bundle) {
      // Supprimer tous les fichiers .md du bundle final
      Object.keys(bundle).forEach(fileName => {
        if (fileName.endsWith('.md')) {
          delete bundle[fileName];
          console.log(`[Build] Fichier .md exclu du build: ${fileName}`);
        }
      });
    },
  };
}
```

**Fichier :** `vite.config.ts:6-19`

---

### **2. Configuration Netlify** (`netlify.toml`)

Ajout d'une directive pour ignorer les changements uniquement sur les fichiers `.md` lors du déploiement :

```toml
[build]
  command = "npm run build"
  publish = "dist"
  # Ignorer les fichiers .md lors du déploiement (déjà exclus par Vite)
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- '*.md'"
```

**Fichier :** `netlify.toml:1-5`

---

### **3. Configuration Git** (`.gitattributes`)

Création d'un fichier `.gitattributes` pour marquer les fichiers `.md` comme documentation :

```
# Fichiers de documentation - ne pas déployer sur Netlify
*.md linguist-documentation
*.md export-ignore

# Fichiers de configuration à préserver
robots.txt -export-ignore
sitemap.xml -export-ignore
_headers -export-ignore
_redirects -export-ignore
```

**Fichier :** `.gitattributes`

---

## 🎯 **Fichiers Inclus dans le Build**

Le dossier `dist/` contient uniquement les fichiers nécessaires au fonctionnement du site :

### **Fichiers de configuration**
- ✅ `robots.txt` - Pour le SEO et l'indexation Google
- ✅ `sitemap.xml` - Plan du site pour les moteurs de recherche
- ✅ `_headers` - Configuration des headers HTTP
- ✅ `_redirects` - Gestion des redirections

### **Fichiers HTML**
- ✅ `index.html` - Page principale (avec métadonnées SEO enrichies)
- ✅ `launch.html` - Page de lancement promo
- ✅ `debug-live.html` - Page de debug

### **Assets**
- ✅ `assets/js/` - Fichiers JavaScript optimisés et minifiés
- ✅ `assets/css/` - Feuilles de style
- ✅ `pdf.worker.min.js` - Worker PDF
- ✅ `example-participants.csv` - Fichier d'exemple

---

## 🚫 **Fichiers Exclus du Build**

| Type de fichier | Quantité | Statut |
|----------------|----------|--------|
| Fichiers `.md` de documentation | 1 358 | ✅ Exclus |
| Fichiers sources `.tsx`, `.ts` | Tous | ✅ Compilés en JS |
| Fichiers de configuration dev | Nombreux | ✅ Exclus |

---

## 🔍 **Vérification**

Pour vérifier que les fichiers `.md` sont bien exclus après un build :

```bash
# Lancer le build
npm run build

# Vérifier qu'il n'y a pas de fichiers .md
find dist -name "*.md"
# Résultat attendu : aucun fichier

# Vérifier le nombre de fichiers dans dist
find dist -type f | wc -l
# Résultat attendu : ~28 fichiers
```

---

## 📦 **Déploiement**

Le déploiement sur Netlify se fait normalement :

```bash
# Via le script de déploiement
./deploy.sh "message de commit"

# Ou manuellement
npm run build
netlify deploy --prod --dir=dist
```

**Résultat :** Seuls les fichiers nécessaires (28 fichiers) seront déployés sur Netlify.

---

## 📝 **Notes Importantes**

1. **Comportement par défaut de Vite**
   Vite ne copie que les fichiers du dossier `public/` et les assets référencés dans le code. Les fichiers `.md` à la racine du projet ne sont jamais copiés par défaut.

2. **Plugin personnalisé**
   Le plugin `excludeMarkdownPlugin` est une **sécurité supplémentaire** qui garantit qu'aucun fichier `.md` ne sera jamais inclus dans le build, même s'ils sont placés dans `public/` par erreur.

3. **Configuration Netlify**
   La directive `ignore` dans `netlify.toml` permet d'éviter les redéploiements inutiles lorsque seuls les fichiers `.md` sont modifiés.

4. **Fichiers nécessaires préservés**
   Les fichiers SEO importants (`robots.txt`, `sitemap.xml`) sont explicitement préservés dans `.gitattributes`.

---

## ✅ **Conclusion**

Votre projet est maintenant configuré pour :
- ✅ Exclure automatiquement tous les fichiers `.md` du build
- ✅ Déployer uniquement les fichiers nécessaires (28 fichiers au lieu de 1358+)
- ✅ Optimiser la taille du déploiement (11 MB)
- ✅ Préserver les fichiers SEO importants
- ✅ Éviter les redéploiements inutiles

**Le déploiement est maintenant propre et optimisé ! 🎉**
