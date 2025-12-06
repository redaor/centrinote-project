# ✅ Corrections Appliquées : Emails et Notifications en Double

## 📋 Résumé des Corrections

### 1. ✅ Fenêtre d'Exécution Réduite (2 minutes → 30 secondes)

**Fichier :** `supabase/functions/automation-scheduler/index.ts`

**Modification :**
- Avant : Fenêtre de 2 minutes (`diffMinutes >= 0 && diffMinutes <= 2`)
- Après : Fenêtre de 30 secondes (`diffSeconds >= 0 && diffSeconds <= 30`)

**Impact :** Réduit drastiquement le risque de déclenchements multiples si le scheduler s'exécute plusieurs fois.

---

### 2. ✅ Calcul de `next_execution_at` AVANT `checkExecutionTime`

**Fichier :** `supabase/functions/automation-scheduler/index.ts`

**Modification :**
- Avant : `checkExecutionTime` était appelé AVANT le calcul de `next_execution_at`
- Après : `next_execution_at` est calculé et mis à jour AVANT `checkExecutionTime`

**Impact :** Garantit que `checkExecutionTime` utilise toujours `next_execution_at` (plus fiable) au lieu de la comparaison directe avec `user_local_time`.

**Code ajouté :**
```typescript
// ✅ Si next_execution_at est NULL, le mettre à jour IMMÉDIATEMENT
if (!automation.next_execution_at && nextExecution) {
  // Mise à jour avec verrou optimiste
  // ...
  automation.next_execution_at = nextExecution;
}

// Maintenant vérifier si c'est l'heure d'exécuter (toujours avec next_execution_at)
const shouldExecute = await checkExecutionTime(automation, now);
```

---

### 3. ✅ Avertissement pour la Branche Fallback

**Fichier :** `supabase/functions/automation-scheduler/index.ts`

**Modification :**
- Ajout d'un `console.warn` si la branche fallback (comparaison directe avec `user_local_time`) est utilisée
- Cette branche ne devrait plus être utilisée car `next_execution_at` est maintenant toujours calculé

**Impact :** Permet de détecter si le problème persiste et d'identifier les cas où `next_execution_at` n'est pas calculé.

---

## 🎯 Résultats Attendus

Après ces corrections :

1. **Fenêtre d'exécution réduite :** 
   - Automation programmée pour 20h00 → déclenchée entre 20h00:00 et 20h00:30 uniquement
   - Pas de déclenchement à 20h01 ou 20h02

2. **Toujours utiliser `next_execution_at` :**
   - Plus de comparaison directe avec `user_local_time` (sauf fallback)
   - `next_execution_at` est toujours calculé et mis à jour avant la vérification

3. **Moins de déclenchements multiples :**
   - Si le scheduler s'exécute plusieurs fois dans la même minute, seule la première instance passera la vérification
   - Les autres instances verront `next_execution_at` déjà mis à jour et seront ignorées

---

## 🔧 Actions Requises

### 1. Redéployer `automation-scheduler`

```bash
supabase functions deploy automation-scheduler
```

### 2. Vérifier les Logs

Après le déploiement, vérifier les logs dans Supabase Dashboard → Edge Functions → automation-scheduler → Logs.

**Vous devriez voir :**
- `✅ next_execution_at atteint pour [automation] (diff: X sec)` - avec `diff` en secondes (0-30)
- `🔧 [SCHEDULER] Setting next_execution_at for [automation] (was NULL)` - si `next_execution_at` était NULL
- `⚠️ [SCHEDULER] [automation] has user_local_time but no next_execution_at` - ne devrait plus apparaître

### 3. Tester avec une Automation

1. Créer une automation avec `user_local_time = "20:00"` (ou l'heure actuelle + 2 minutes)
2. Attendre le déclenchement
3. Vérifier :
   - Un seul email reçu
   - Un seul appel à `automation-micro-runner` dans les logs
   - `next_execution_at` mis à jour correctement

---

## 📊 Comparaison Avant/Après

### Avant

| Heure | diffMinutes | shouldExecute | Résultat |
|-------|-------------|---------------|----------|
| 19h58 | -2 | ❌ false | ✅ Correct |
| 19h59 | -1 | ❌ false | ✅ Correct |
| 20h00 | 0 | ✅ true | ✅ Correct |
| 20h01 | 1 | ✅ true | ❌ **PROBLÈME** |
| 20h02 | 2 | ✅ true | ❌ **PROBLÈME** |

### Après

| Heure | diffSeconds | shouldExecute | Résultat |
|-------|-------------|---------------|----------|
| 19h59:30 | -30 | ❌ false | ✅ Correct |
| 20h00:00 | 0 | ✅ true | ✅ Correct |
| 20h00:15 | 15 | ✅ true | ✅ Correct (mais `next_execution_at` déjà mis à jour) |
| 20h00:30 | 30 | ✅ true | ✅ Correct (mais `next_execution_at` déjà mis à jour) |
| 20h00:31 | 31 | ❌ false | ✅ Correct |
| 20h01:00 | 60 | ❌ false | ✅ Correct |

**Note :** Même si `shouldExecute = true` à 20h00:15 ou 20h00:30, la mise à jour optimiste de `next_execution_at` empêchera les déclenchements multiples.

---

## ⚠️ Points d'Attention

1. **Migration SQL :** Assurez-vous que la migration `20251202_email_deduplication.sql` est appliquée pour la déduplication des emails.

2. **Logs :** Surveillez les logs pour détecter si la branche fallback est encore utilisée (ne devrait plus arriver).

3. **Test :** Testez avec une automation programmée pour l'heure actuelle + 2 minutes pour vérifier le comportement.

---

## 🔄 Prochaines Étapes (si le problème persiste)

Si les emails sont toujours envoyés en triple après ces corrections :

1. **Vérifier la déduplication email :**
   - Vérifier que `check_and_log_email_send` est appelée
   - Vérifier que la table `email_sent_log` contient des entrées
   - Vérifier les logs de `automation-email` pour voir les messages `🚫 [EMAIL] ===== DUPLICATE BLOCKED =====`

2. **Vérifier les logs du scheduler :**
   - Vérifier combien de fois `automation-micro-runner` est appelé pour la même automation
   - Vérifier si `next_execution_at` est correctement mis à jour

3. **Vérifier les verrous :**
   - Vérifier que `try_lock_and_update_automation` fonctionne correctement
   - Vérifier que les verrous sont bien libérés après l'exécution

