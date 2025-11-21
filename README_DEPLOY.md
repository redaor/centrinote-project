# 🚀 Guide de Déploiement Automatique

## Problème résolu

**Avant** : Synchronisation manuelle entre bac à sable et production (15+ minutes, erreurs fréquentes)  
**Après** : Synchronisation automatique en 1 commande (~1 minute)

---

## 📋 Prérequis

### 1. Installer Supabase CLI

```bash
npm i -g supabase
```

### 2. Se connecter

```bash
supabase login
```

### 3. Rendre les scripts exécutables

```bash
chmod +x deploy-to-prod.sh
chmod +x deploy-to-prod-complete.sh
```

---

## 🎯 Utilisation

### Version Simple (Interactive)

```bash
./deploy-to-prod.sh
```

**Ce que fait le script** :
- ✅ Vérifie les prérequis
- ✅ Déploie toutes les Edge Functions
- ✅ Guide pour les migrations SQL
- ✅ Guide pour les secrets SMTP
- ✅ Guide pour le cron

### Version Complète (Avancée)

```bash
./deploy-to-prod-complete.sh
```

**Différences** :
- Gestion d'erreurs améliorée
- Messages colorés
- Compteurs de succès/erreurs
- Liaison automatique du projet

---

## 📦 Ce qui est automatique

| Élément | Automatique | Manuel |
|---------|------------|--------|
| Edge Functions | ✅ | ❌ |
| Migrations SQL | ❌ | ✅ (via Dashboard) |
| Secrets SMTP | ❌ | ✅ (via Dashboard) |
| Cron | ❌ | ✅ (via Dashboard) |

**Note** : Les migrations, secrets et cron nécessitent des accès admin que le CLI n'a pas toujours. Ils doivent être configurés via le Dashboard.

---

## 🔧 Configuration

### Modifier le PROJECT_REF

Éditez les scripts et changez :

```bash
PROJECT_REF="${SUPABASE_PROJECT_REF:-wjzlicokhxitmeoxkjzv}"
```

Ou définissez la variable d'environnement :

```bash
export SUPABASE_PROJECT_REF="votre-project-ref"
./deploy-to-prod.sh
```

---

## 📋 Checklist de Déploiement

### Après chaque mise à jour du code :

1. **Déployer les Edge Functions** (automatique)
   ```bash
   ./deploy-to-prod.sh
   ```

2. **Appliquer les migrations SQL** (manuel)
   - Dashboard → SQL Editor
   - Copier/coller le contenu des fichiers `.sql` de `supabase/migrations/`
   - Exécuter

3. **Vérifier les secrets SMTP** (manuel)
   - Dashboard → Settings → Edge Functions → Secrets
   - Vérifier que `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` sont présents

4. **Vérifier le cron** (manuel)
   - Dashboard → SQL Editor
   - Exécuter `fix_cron_every_minute.sql`

---

## 🐛 Dépannage

### Erreur : "Supabase CLI requis"

```bash
npm i -g supabase
supabase login
```

### Erreur : "Non connecté à Supabase CLI"

```bash
supabase login
```

### Erreur : "Projet non lié"

Le script essaie de lier automatiquement. Si ça échoue :

```bash
supabase link --project-ref wjzlicokhxitmeoxkjzv
```

### Les Edge Functions ne se déploient pas

1. Vérifiez que vous êtes connecté : `supabase projects list`
2. Vérifiez le PROJECT_REF dans le script
3. Vérifiez que les fonctions existent dans `supabase/functions/`

---

## 🔄 Automatisation avec GitHub Actions (Optionnel)

Créez `.github/workflows/deploy.yml` :

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: npm i -g supabase
      
      - name: Deploy
        run: ./deploy-to-prod-complete.sh
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
```

**Note** : Les migrations, secrets et cron devront toujours être configurés manuellement via le Dashboard.

---

## ✅ Résultat

**Avant** :
- ❌ Oubli des migrations
- ❌ Oubli des Edge Functions
- ❌ Oubli des secrets SMTP
- ❌ Oubli du cron
- ⏱️ ~15 minutes par déploiement

**Après** :
- ✅ Edge Functions déployées automatiquement
- ✅ Guide clair pour les actions manuelles
- ⏱️ ~1 minute pour la partie automatique
- ✅ Moins d'erreurs

---

## 📚 Documentation

- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [Edge Functions Deployment](https://supabase.com/docs/guides/functions)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

