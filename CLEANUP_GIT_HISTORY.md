# 🧹 Nettoyage de l'historique Git - Secret exposé

## Problème
Une **Service Role Key** Supabase a été exposée dans le commit `5988e248` et reste visible dans l'historique Git même si elle a été supprimée du code actuel.

## ⚠️ ACTIONS REQUISES

### 1. Révoquer la clé (FAIT IMMÉDIATEMENT)
✅ La clé doit être révoquée dans Supabase Dashboard → Settings → API

### 2. Nettoyer l'historique Git (Optionnel mais recommandé)

#### Option A : Utiliser git filter-repo (Recommandé)
```bash
# Installer git-filter-repo si nécessaire
# pip install git-filter-repo

# Nettoyer l'historique
git filter-repo --invert-paths --path trigger_scheduler_direct.sql
# Puis recréer le fichier proprement
```

#### Option B : Utiliser BFG Repo-Cleaner
```bash
# Télécharger BFG: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt
```

#### Option C : Créer une nouvelle branche orpheline (Plus simple)
```bash
# Créer une nouvelle branche sans historique
git checkout --orphan clean-main
git add -A
git commit -m "Initial commit - cleaned history"
git branch -D main
git branch -m main
git push -f origin main
```

⚠️ **ATTENTION** : Ces opérations réécrivent l'historique Git. Tous les collaborateurs devront re-cloner le dépôt.

## ✅ État actuel
- ✅ La clé a été supprimée du code actuel
- ✅ Tous les fichiers utilisent maintenant des placeholders
- ⚠️ La clé reste visible dans l'historique Git (commit 5988e248)
- ⚠️ La clé doit être révoquée dans Supabase

## 📝 Prévention future
1. Utiliser `.gitignore` pour exclure les fichiers sensibles
2. Utiliser des variables d'environnement
3. Utiliser Supabase Dashboard pour tester au lieu de scripts SQL
4. Vérifier avec `git-secrets` avant de commiter

