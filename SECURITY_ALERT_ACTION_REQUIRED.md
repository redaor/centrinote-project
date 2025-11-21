# 🚨 ALERTE SÉCURITÉ - ACTION REQUISE IMMÉDIATEMENT

## Problème
Une **Service Role Key** Supabase a été accidentellement exposée dans le commit `5988e248` dans le fichier `trigger_scheduler_direct.sql`.

## ⚠️ ACTIONS URGENTES À FAIRE MAINTENANT

### 1. Révoquer l'ancienne clé (CRITIQUE)
1. Aller dans **Supabase Dashboard** → **PRODUCTION**
2. **Settings** → **API** → **Project API keys**
3. Trouver la **service_role** key qui a été exposée
4. Cliquer sur **"Revoke"** ou **"Regenerate"**
5. ⚠️ **Générer une nouvelle clé** immédiatement

### 2. Mettre à jour tous les secrets
Après avoir généré la nouvelle clé :
- Mettre à jour les secrets dans **Settings → Edge Functions → Secrets**
- Mettre à jour les scripts SQL locaux (ne jamais les commiter)
- Mettre à jour les variables d'environnement

### 3. Vérifier l'accès
- Vérifier les logs d'accès dans Supabase Dashboard
- Vérifier s'il y a eu des accès non autorisés
- Surveiller les activités suspectes

## ✅ Correction appliquée
- Le secret a été supprimé du fichier `trigger_scheduler_direct.sql`
- Remplacé par un placeholder `VOTRE_SERVICE_ROLE_KEY_ICI`
- Nouveau commit créé pour supprimer le secret

## 📝 Bonnes pratiques pour l'avenir

1. **JAMAIS** commiter de secrets dans le code
2. Utiliser des placeholders : `VOTRE_SERVICE_ROLE_KEY_ICI`
3. Utiliser des variables d'environnement
4. Ajouter les fichiers sensibles au `.gitignore`
5. Utiliser Supabase Dashboard pour tester au lieu de scripts SQL avec secrets

## 🔒 Fichiers à surveiller
- `trigger_scheduler_direct.sql`
- `fix_cron_every_minute.sql`
- `trigger_scheduler_now_fixed.sql`
- Tous les fichiers `.sql` qui contiennent des URLs ou clés

