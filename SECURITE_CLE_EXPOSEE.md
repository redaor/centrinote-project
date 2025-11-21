# ⚠️ ALERTE SÉCURITÉ : Clé Service Role exposée

## 🚨 Problème

La vraie **Service Role Key** a été mise dans le fichier `fix_cron_401.sql`.

**Cette clé donne un accès complet à votre base de données Supabase !**

---

## ✅ Actions immédiates (FAIRE MAINTENANT)

### 1. Révoquer la clé exposée

1. **Aller dans** : Dashboard → Settings → API → **service_role key**
2. **Cliquer sur** : "Revoke" ou "Regenerate"
3. **Confirmer** la révocation

### 2. Générer une nouvelle clé

1. **Dashboard → Settings → API → service_role key**
2. **Cliquer sur** : "Generate new key"
3. **Copier** la nouvelle clé (elle ne sera affichée qu'une fois)

### 3. Mettre à jour les configurations

#### A. Secret Edge Function

1. **Dashboard → Settings → Edge Functions → Secrets**
2. **Modifier** `SUPABASE_SERVICE_ROLE_KEY`
3. **Coller** la nouvelle clé
4. **Sauvegarder**

#### B. Cron SQL (si besoin de le réexécuter)

1. **Ouvrir** `fix_cron_401.sql`
2. **Remplacer** `VOTRE_SERVICE_ROLE_KEY_ICI` par la nouvelle clé
3. **Exécuter** dans SQL Editor (si nécessaire)

---

## 🔒 Bonnes pratiques

### ✅ À FAIRE

- ✅ Utiliser des **placeholders** dans les fichiers du repo : `VOTRE_SERVICE_ROLE_KEY_ICI`
- ✅ Stocker les vraies clés dans les **secrets Edge Functions**
- ✅ Utiliser des **variables d'environnement** pour les scripts locaux
- ✅ Ajouter les fichiers sensibles au `.gitignore` si nécessaire

### ❌ À NE JAMAIS FAIRE

- ❌ Mettre des vraies clés dans les fichiers du repo Git
- ❌ Commiter des fichiers avec des secrets
- ❌ Partager les clés publiquement
- ❌ Laisser les clés dans l'historique Git

---

## 📋 Checklist de sécurité

- [ ] Clé ancienne révoquée dans Supabase Dashboard
- [ ] Nouvelle clé générée
- [ ] Secret Edge Function mis à jour avec la nouvelle clé
- [ ] Fichier `fix_cron_401.sql` contient un placeholder (pas la vraie clé)
- [ ] Fichier non commité dans Git (ou commité avec placeholder uniquement)

---

## 🎯 État actuel

✅ **J'ai déjà remplacé la clé par un placeholder dans le fichier**

Le fichier `fix_cron_401.sql` contient maintenant `VOTRE_SERVICE_ROLE_KEY_ICI` au lieu de la vraie clé.

**Mais vous devez quand même révoquer l'ancienne clé** car elle a été exposée.

---

## 🔍 Vérification

Pour vérifier que le fichier est sûr :

```bash
# Vérifier qu'il n'y a pas de vraie clé
grep -i "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" fix_cron_401.sql

# Si rien n'est trouvé, c'est bon ✅
```

---

## 📚 Ressources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Managing API Keys](https://supabase.com/docs/guides/platform/api-keys)

