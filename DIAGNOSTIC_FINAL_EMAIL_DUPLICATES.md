# 🔍 Diagnostic Final : Emails en double

## Problème identifié

La table `email_sent_log` est vide, ce qui signifie que :
1. ❌ La fonction `check_and_log_email_send` n'insère pas dans la table
2. ❌ OU la fonction n'est pas appelée du tout
3. ❌ OU il y a une erreur silencieuse

## ✅ Corrections appliquées

### 1. Fonction RPC améliorée
- Meilleure gestion d'erreurs avec `BEGIN/EXCEPTION`
- Logs avec `RAISE NOTICE` pour le debugging
- Vérification explicite que l'insertion a réussi

### 2. Logs améliorés dans automation-email
- Logs détaillés de l'appel RPC
- Logs de la réponse RPC
- Logs des erreurs avec détails complets

## 🧪 Tests à faire

### Test 1 : Vérifier que la fonction existe et fonctionne

Exécuter dans Supabase Dashboard → SQL Editor :

```sql
-- Test simple de la fonction
SELECT check_and_log_email_send('test@example.com', 'Test Subject', 5) as result;

-- Vérifier que l'insertion a fonctionné
SELECT * FROM email_sent_log WHERE email_to = 'test@example.com';
```

**Résultat attendu :**
- `result` = `true`
- Une ligne dans `email_sent_log`

### Test 2 : Vérifier que la fonction bloque les doublons

```sql
-- Premier appel (devrait retourner true)
SELECT check_and_log_email_send('test2@example.com', 'Test Subject 2', 5) as first_call;

-- Deuxième appel immédiat (devrait retourner false)
SELECT check_and_log_email_send('test2@example.com', 'Test Subject 2', 5) as second_call;

-- Vérifier qu'il n'y a qu'une seule ligne
SELECT COUNT(*) FROM email_sent_log WHERE email_to = 'test2@example.com';
-- Devrait être 1
```

### Test 3 : Vérifier les logs dans automation-email

Après avoir redéployé `automation-email`, vérifier les logs dans Supabase Dashboard → Edge Functions → automation-email → Logs.

**Vous devriez voir :**
```
📨 [EMAIL] ===== REQUEST RECEIVED =====
🔍 [EMAIL] Calling check_and_log_email_send RPC function...
🔍 [EMAIL] RPC Response: { canSend: true, error: null }
✅ [EMAIL] ===== DUPLICATE CHECK PASSED =====
✅ [EMAIL] Email logged in email_sent_log
✅ [EMAIL] ===== EMAIL SENT SUCCESSFULLY =====
```

**Si vous voyez une erreur :**
```
❌ [EMAIL] ===== DEDUPLICATION ERROR =====
❌ [EMAIL] Error code: 42883
❌ [EMAIL] Error message: function check_and_log_email_send(text, text, integer) does not exist
```

Cela signifie que la migration n'est pas appliquée.

## 🔧 Actions à faire

### 1. Réappliquer la migration SQL (version corrigée)

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécuter le contenu de : supabase/migrations/20251202_email_deduplication.sql
```

**Vérifier que c'est bien appliqué :**
```sql
-- Doit retourner une ligne
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'check_and_log_email_send';
```

### 2. Tester la fonction manuellement

```sql
-- Exécuter le script de test
-- Fichier : supabase/migrations/20251202_test_email_deduplication.sql
```

### 3. Redéployer automation-email

```bash
supabase functions deploy automation-email
```

### 4. Vérifier les logs après le prochain email

Attendre le prochain email programmé et vérifier :
1. Les logs dans Supabase Dashboard → Edge Functions → automation-email → Logs
2. La table `email_sent_log` :
   ```sql
   SELECT * FROM email_sent_log ORDER BY sent_at DESC LIMIT 10;
   ```

## 🎯 Résultat attendu

Après ces corrections :

1. **Premier appel** :
   - Fonction retourne `true`
   - Ligne insérée dans `email_sent_log`
   - Email envoyé
   - Logs montrent `✅ [EMAIL] Email logged in email_sent_log`

2. **Deuxième appel (dans les 5 minutes)** :
   - Fonction retourne `false`
   - Aucune nouvelle ligne insérée
   - Email **PAS envoyé**
   - Logs montrent `🚫 [EMAIL] ===== DUPLICATE BLOCKED =====`

3. **Table `email_sent_log`** :
   - Contient une ligne par email envoyé
   - Pas de doublons pour le même email/sujet dans les 5 minutes

## 🆘 Si le problème persiste

1. **Vérifier que la fonction existe** :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'check_and_log_email_send';
   ```

2. **Tester la fonction manuellement** :
   ```sql
   SELECT check_and_log_email_send('test@example.com', 'Test', 5);
   SELECT * FROM email_sent_log;
   ```

3. **Vérifier les logs Supabase** pour voir les erreurs exactes

4. **Me fournir** :
   - Les logs de `automation-email` après le prochain email
   - Le résultat de `SELECT * FROM email_sent_log;`
   - Le résultat du test manuel de la fonction

