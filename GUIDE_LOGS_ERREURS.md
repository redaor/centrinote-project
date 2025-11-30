# 📊 Guide - Système de Logs d'Erreurs

## 🎯 Comment fonctionne l'onglet "Logs d'erreurs" ?

### ✅ Oui, toutes les erreurs sont remontées automatiquement

Le système fonctionne de la manière suivante :

1. **Logger sécurisé** (`src/utils/logger.ts`) :
   - Intercepte toutes les erreurs dans l'application
   - Sanitise les données sensibles (emails, UUIDs, tokens)
   - Envoie automatiquement à la table `error_logs` dans Supabase

2. **Envoi automatique** :
   - ✅ **En production** : Toutes les erreurs sont automatiquement envoyées
   - ⚙️ **En développement** : Seulement si `VITE_ENABLE_ERROR_LOGGING=true` dans `.env.local`

3. **Temps réel** :
   - Le dashboard utilise Supabase Realtime pour afficher les nouvelles erreurs instantanément
   - Pas besoin de rafraîchir la page

---

## 🔍 Comment vérifier les erreurs ?

### Méthode 1 : Dashboard Admin (Recommandé)

1. **Aller sur** : `https://centrinote.fr/admin/support`
2. **Cliquer sur** l'onglet **"Logs d'erreurs"**
3. **Voir** :
   - Statistiques (total, error, warn, info, debug)
   - Liste des erreurs avec filtres
   - Détails complets en cliquant sur une erreur

### Méthode 2 : Requête SQL directe

```sql
-- Voir toutes les erreurs récentes
SELECT 
  id,
  level,
  message,
  source,
  created_at,
  user_id
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
```

### Méthode 3 : Statistiques par niveau

```sql
SELECT 
  level,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY level
ORDER BY count DESC;
```

---

## 🧪 Tester le système

### Étape 1 : Insérer des erreurs de test

Exécutez le script SQL : `supabase/migrations/20251201_test_error_log.sql`

**Dans Supabase Dashboard → SQL Editor :**
1. Ouvrir le fichier `supabase/migrations/20251201_test_error_log.sql`
2. Copier-coller le contenu
3. Exécuter la requête

**Ce script crée :**
- ✅ 1 erreur frontend (Dashboard)
- ✅ 1 erreur backend (Edge Function)
- ✅ 1 warning frontend (Requête lente)
- ✅ 1 info frontend (Connexion)

### Étape 2 : Vérifier dans le dashboard

1. Aller sur `/admin/support`
2. Cliquer sur **"Logs d'erreurs"**
3. Vous devriez voir les 4 erreurs de test

### Étape 3 : Tester en temps réel

1. Ouvrir la console du navigateur
2. Exécuter :
   ```javascript
   import { logger } from './src/utils/logger';
   logger.error('Test erreur temps réel', new Error('Erreur de test'));
   ```
3. L'erreur devrait apparaître **instantanément** dans le dashboard

### Étape 4 : Nettoyer les tests

```sql
DELETE FROM error_logs WHERE message LIKE 'Test%';
```

---

## 📝 Types d'erreurs loggées

### Frontend (source: 'frontend')
- Erreurs JavaScript
- Erreurs de fetch/API
- Erreurs de composants React
- Warnings de performance

### Backend (source: 'edge-function')
- Erreurs dans les Edge Functions Supabase
- Erreurs d'authentification
- Erreurs de validation

### Automatique
- Toutes les erreurs capturées par `logger.error()`
- Toutes les erreurs capturées par `logger.warn()`
- Toutes les erreurs capturées par `logger.info()`

---

## 🔒 Sécurité

### Données sanitaires
- ✅ Emails → `[REDACTED_EMAIL]`
- ✅ UUIDs → `[REDACTED_UUID]`
- ✅ Tokens JWT → `[REDACTED_TOKEN]`
- ✅ Mots de passe → `[REDACTED]`

### RLS (Row Level Security)
- ✅ Utilisateurs voient uniquement leurs erreurs
- ✅ Admin voit toutes les erreurs (via service role)
- ✅ Pas d'accès aux erreurs d'autres utilisateurs

---

## 🎨 Interface du Dashboard

### Statistiques
- **Total** : Nombre total de logs
- **Erreurs** : Logs de niveau `error`
- **Avertissements** : Logs de niveau `warn`
- **Infos** : Logs de niveau `info`
- **Debug** : Logs de niveau `debug`

### Filtres
- **Tous** : Affiche tous les logs
- **Error** : Affiche uniquement les erreurs
- **Warn** : Affiche uniquement les avertissements
- **Info** : Affiche uniquement les infos
- **Debug** : Affiche uniquement les logs de debug

### Recherche
- Recherche dans le message
- Recherche dans la source
- Recherche dans l'URL

### Détails
- Cliquer sur un log pour voir :
  - Message complet
  - Stack trace (si disponible)
  - Métadonnées (JSON)
  - URL de la page
  - User-Agent
  - Date et heure

---

## ⚙️ Configuration

### Activer le logging en développement

**Dans `.env.local` :**
```env
VITE_ENABLE_ERROR_LOGGING=true
```

**Par défaut :**
- ✅ Production : Logging activé automatiquement
- ❌ Développement : Logging désactivé (sauf si variable activée)

---

## 🧹 Nettoyage automatique

Les logs sont automatiquement nettoyés après **30 jours** via un cron job.

**Nettoyage manuel :**
```sql
-- Supprimer les logs plus anciens que 7 jours
SELECT cleanup_old_error_logs(7);
```

---

## 📊 Exemples de requêtes utiles

### Erreurs par utilisateur
```sql
SELECT 
  user_id,
  COUNT(*) as error_count,
  MAX(created_at) as last_error
FROM error_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY error_count DESC;
```

### Erreurs par source
```sql
SELECT 
  source,
  level,
  COUNT(*) as count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, level
ORDER BY count DESC;
```

### Erreurs les plus fréquentes
```sql
SELECT 
  message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence
FROM error_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY message
ORDER BY occurrences DESC
LIMIT 10;
```

---

## ✅ Checklist de vérification

- [x] Table `error_logs` créée
- [x] Logger sécurisé fonctionnel
- [x] Dashboard admin accessible
- [x] Erreurs de test insérées
- [x] Temps réel fonctionnel
- [x] Filtres fonctionnels
- [x] Recherche fonctionnelle
- [x] Détails complets affichés

---

## 🆘 Dépannage

### Les erreurs n'apparaissent pas dans le dashboard

1. **Vérifier** que `VITE_ENABLE_ERROR_LOGGING=true` en dev
2. **Vérifier** que la table `error_logs` existe
3. **Vérifier** les permissions RLS
4. **Vérifier** la console du navigateur pour les erreurs

### Les erreurs ne sont pas en temps réel

1. **Vérifier** que Supabase Realtime est activé
2. **Vérifier** la connexion WebSocket
3. **Rafraîchir** la page

### Trop d'erreurs dans le dashboard

1. **Filtrer** par niveau (error uniquement)
2. **Rechercher** un terme spécifique
3. **Nettoyer** les vieux logs

