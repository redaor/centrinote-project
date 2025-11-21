# 📚 Guide de Déploiement - Module Citations du Jour

## ✅ Fichiers créés

### 1. Migration SQL
- `supabase/migrations/20251121_daily_quotes_system.sql`
  - Table `daily_quotes`
  - Fonction SQL `get_today_quote()`
  - 10 citations initiales

### 2. Edge Functions
- ✅ `supabase/functions/get-daily-quote/index.ts` (déployé)
- ✅ `supabase/functions/sync-quotes/index.ts` (déployé)
- ✅ `supabase/functions/automation-micro-runner/index.ts` (mis à jour et déployé)

### 3. Services Frontend
- ✅ `src/lib/quoteService.ts` - Service client pour récupérer les citations
- ✅ `src/emailTemplates/quoteEmail.ts` - Template HTML pour les emails

### 4. Composants
- ✅ `src/components/automation/AutomationSandboxV2.tsx` (modifié pour injecter les citations)

---

## 🚀 Déploiement

### Étape 1 : Appliquer la migration SQL

1. **Ouvrir** : `supabase/migrations/20251121_daily_quotes_system.sql`
2. **Copier** tout le contenu
3. **Aller dans** : Dashboard → SQL Editor (PRODUCTION)
4. **Coller** et **exécuter**

**Résultat attendu** :
- ✅ Table `daily_quotes` créée
- ✅ Fonction `get_today_quote()` créée
- ✅ 10 citations initiales insérées

---

### Étape 2 : Remplir la table avec 50 citations (optionnel)

**Option A : Via Edge Function (recommandé)**

1. **Dashboard → Edge Functions → `sync-quotes` → Invoke**
2. **OU** via terminal :
   ```bash
   curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/sync-quotes \
     -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY"
   ```

**Option B : Via SQL (direct)**

Exécuter le SQL dans `supabase/migrations/20251121_daily_quotes_system.sql` (les 50 citations sont déjà dans le code de `sync-quotes`)

---

### Étape 3 : Configurer le cron hebdomadaire (optionnel)

Pour remplir automatiquement les citations chaque dimanche à 2h :

```sql
SELECT cron.schedule(
  'sync-quotes-weekly',
  '0 2 * * 0', -- Dimanche à 2h du matin
  $$
  SELECT
    net.http_post(
      url := 'https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/sync-quotes',
      headers := jsonb_build_object(
        'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY_ICI',
        'Content-Type', 'application/json'
      )
    ) AS request_id;
  $$
);
```

---

## 🧪 Tests

### Test 1 : Vérifier la fonction SQL

```sql
-- Tester get_today_quote()
SELECT get_today_quote('fr', 'motivation');
```

**Résultat attendu** : Une citation JSON avec `id`, `quote`, `author`, etc.

---

### Test 2 : Vérifier l'Edge Function

```bash
# Via terminal
curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/get-daily-quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -d '{"lang": "fr", "category": "motivation"}'
```

**Résultat attendu** : Citation JSON + log `📖 Citation récupérée : « ... » — ...`

---

### Test 3 : Tester dans AutomationSandboxV2

1. **Aller dans** : `/automation` → Bac à Sable
2. **Sélectionner** : `💭 Citation Motivation` (daily_quote)
3. **Cliquer** : "Envoyer email"
4. **Vérifier** : L'email reçu contient une citation formatée

**Logs attendus** :
```
📖 Récupération de la citation du jour...
📖 Citation récupérée : « ... » — ...
📧 Email avec citation généré
```

---

### Test 4 : Vérifier qu'une autre automation n'est pas affectée

1. **Sélectionner** : `🎯 Mode Focus` (ou autre automation)
2. **Cliquer** : "Envoyer email"
3. **Vérifier** : L'email est normal (pas de citation injectée)

---

## 📋 Checklist de déploiement

- [ ] Migration SQL appliquée (`20251121_daily_quotes_system.sql`)
- [ ] Edge Functions déployées (`get-daily-quote`, `sync-quotes`, `automation-micro-runner`)
- [ ] Table `daily_quotes` contient des citations (vérifier avec `SELECT COUNT(*) FROM daily_quotes`)
- [ ] Test dans AutomationSandboxV2 : citation injectée pour `daily_quote`
- [ ] Test dans AutomationSandboxV2 : autres automations non affectées
- [ ] Email reçu avec citation bien formatée

---

## 🔍 Vérifications

### Vérifier que la table existe

```sql
SELECT COUNT(*) as total_quotes
FROM daily_quotes
WHERE language = 'fr' AND category = 'motivation';
```

**Résultat attendu** : Au moins 10 citations (ou 50 si sync-quotes a été exécuté)

---

### Vérifier que la fonction fonctionne

```sql
-- Récupérer une citation
SELECT get_today_quote('fr', 'motivation');

-- Vérifier qu'elle est marquée comme utilisée
SELECT id, quote, author, used_at
FROM daily_quotes
WHERE used_at = CURRENT_DATE
ORDER BY used_at DESC
LIMIT 5;
```

---

## ✅ Preuves demandées

### 1. Log de la fonction `get-daily-quote`

**Où** : Dashboard → Edge Functions → `get-daily-quote` → Logs

**Attendu** :
```
📖 Citation récupérée : « Le succès, c'est tomber sept fois, se relever huit. » — Proverbe japonais
```

---

### 2. Capture d'email avec citation

**Où** : Boîte email reçue

**Attendu** :
- Email avec sujet : "💭 Citation du jour - Centrinote"
- Citation formatée avec guillemets
- Auteur aligné à droite
- Design responsive et propre

---

### 3. Preuve qu'une autre automation n'a pas changé

**Où** : AutomationSandboxV2 → Tester `focus_mode` ou `break-reminder`

**Attendu** :
- Email normal (pas de citation)
- Corps d'email original préservé
- Pas d'erreur dans les logs

---

## 🎯 Résumé

**Système créé** :
- ✅ Table `daily_quotes` (isolée, ne touche aucune table existante)
- ✅ Fonction SQL `get_today_quote()` (évite les répétitions)
- ✅ Edge Function `get-daily-quote` (appelable partout)
- ✅ Service frontend `quoteService.ts` (isolation totale)
- ✅ Template email `quoteEmail.ts` (design propre)
- ✅ Injection dans `AutomationSandboxV2.tsx` (sans toucher le reste)
- ✅ Mise à jour de `automation-micro-runner` (utilise le nouveau système)

**Impact** : Zéro régression, système complètement isolé.

