# Guide de Test - Pipeline Issue Tracker Noteo

## Récapitulatif des modifications

### 1. Backend (Edge Functions Supabase)

✅ **Déployé par l'utilisateur** :
- `issue-tracker` : Détection d'intention et gestion d'état
- `chatbot-handler` : Orchestration du pipeline

### 2. Base de données

✅ **Migration exécutée** :
- Table `user_issue_states` créée
- Fonctions helper et triggers configurés
- RLS policies activées

### 3. Frontend

✅ **Modifications complétées** :

#### `src/components/chatbot/ChatbotWidget.tsx`
- ✅ Ajout de l'interface `ValidationButton`
- ✅ Mise à jour de l'interface `Message` avec `validationButtons`, `intent`, `feature`
- ✅ Création du composant `ValidationButtons` (lignes 296-351)
- ✅ Modification de `handleSend` pour accepter `button_clicked` (ligne 465)
- ✅ Création de `handleValidationButtonClick` (lignes 530-625)
- ✅ Modification du rendu pour afficher les boutons dynamiques (lignes 994-1019, 1064-1079)

#### `src/services/chatbotService.ts`
- ✅ Ajout de l'interface `ValidationButton`
- ✅ Mise à jour de `ChatbotRequest` avec `button_clicked`
- ✅ Mise à jour de `ChatbotResponse` avec `validationButtons`, `intent`, `feature`

---

## Comment tester le pipeline complet

### Scénario 1 : Tutoriel (Intent: tutorial)

**Action** : Envoyez un message demandant comment faire quelque chose

**Exemple** :
```
"Comment créer une note ?"
```

**Résultat attendu** :
1. Le chatbot répond avec des instructions étape par étape
2. Des boutons de validation apparaissent :
   - ✅ Ça marche !
   - ⚠️ Toujours bloqué

**Vérification backend** :
```sql
-- Vérifier qu'un issue_state a été créé avec intent='tutorial'
SELECT * FROM user_issue_states
WHERE feature = 'note_creation'
AND status = 'reported'
ORDER BY created_at DESC LIMIT 1;
```

---

### Scénario 2 : Diagnostic (Intent: diagnostic)

**Action** : Envoyez un message signalant un blocage

**Exemple** :
```
"Je suis bloqué, je n'arrive pas à créer une note"
```

**Résultat attendu** :
1. Le chatbot pose des questions de diagnostic
2. Des boutons de validation **détaillés** apparaissent :
   - ✅ Ça marche !
   - ⚠️ Toujours bloqué
   - 🔍 Je ne trouve pas le bouton
   - ❌ Erreur d'enregistrement

**Vérification backend** :
```sql
-- Vérifier qu'un issue_state a été créé avec intent='diagnostic'
SELECT * FROM user_issue_states
WHERE status = 'in_progress'
ORDER BY created_at DESC LIMIT 1;
```

---

### Scénario 3 : Résolution (Intent: resolved)

**Action** : Cliquez sur le bouton "✅ Ça marche !"

**Résultat attendu** :
1. Le message "✅ Ça marche !" apparaît côté utilisateur
2. Le chatbot félicite l'utilisateur
3. Les boutons de validation disparaissent
4. Pas de nouveaux boutons (problème résolu)

**Vérification backend** :
```sql
-- Vérifier que l'issue_state est passé en 'resolved'
SELECT status, resolved_at FROM user_issue_states
WHERE status = 'resolved'
ORDER BY resolved_at DESC LIMIT 1;
```

---

### Scénario 4 : Escalade après 2-3 tentatives

**Action** : Cliquez sur "⚠️ Toujours bloqué" **2 fois de suite**

**Résultat attendu** :
1. Première tentative : Le chatbot propose une nouvelle approche avec nouveaux boutons
2. Deuxième tentative : Le chatbot propose une approche alternative
3. Après 2-3 tentatives (selon la configuration) : Escalade automatique
   - Le chatbot propose de contacter le support
   - Carte d'escalation avec bouton "📧 Envoyer un email au support"

**Vérification backend** :
```sql
-- Vérifier que attempt_count augmente à chaque tentative
SELECT attempt_count, status FROM user_issue_states
ORDER BY updated_at DESC LIMIT 1;

-- Vérifier l'escalade si attempt_count >= 2
SELECT status, escalated_at, ticket_id FROM user_issue_states
WHERE status = 'escalated'
ORDER BY escalated_at DESC LIMIT 1;
```

---

### Scénario 5 : Bouton spécifique (cant_find_button)

**Action** : Cliquez sur "🔍 Je ne trouve pas le bouton"

**Résultat attendu** :
1. Le message "🔍 Je ne trouve pas le bouton" apparaît côté utilisateur
2. Le chatbot répond avec des indications visuelles plus précises
3. De nouveaux boutons de validation apparaissent
4. Le `blocking_point` est mis à jour dans la base

**Vérification backend** :
```sql
-- Vérifier que blocking_point est enregistré
SELECT blocking_point, last_step FROM user_issue_states
ORDER BY updated_at DESC LIMIT 1;
```

---

## Vérifications techniques

### 1. Vérifier que button_clicked est envoyé au backend

**Console du navigateur** :
```javascript
// Dans ChatbotWidget.tsx, la ligne 583 envoie :
button_clicked: action // 'works' | 'still_blocked' | 'cant_find_button' | etc.
```

**Logs du backend** (dans Supabase Edge Functions) :
```bash
# Dans issue-tracker
console.log('[issue-tracker] button_clicked:', request.button_clicked);

# Dans chatbot-handler
console.log('[chatbot-handler] Pipeline request:', { button_clicked: request.button_clicked });
```

### 2. Vérifier que validationButtons sont retournés

**Console du navigateur** :
```javascript
// La réponse du chatbot doit contenir :
{
  message: "...",
  validationButtons: [
    { id: 'works', label: 'Ça marche !', action: 'works', emoji: '✅' },
    { id: 'still_blocked', label: 'Toujours bloqué', action: 'still_blocked', emoji: '⚠️' },
    // ...
  ],
  intent: 'tutorial' | 'diagnostic' | 'resolved' | 'escalate',
  feature: 'note_creation'
}
```

### 3. Vérifier l'historique des interactions

**Base de données** :
```sql
-- Voir l'historique complet d'un problème
SELECT
  id,
  feature,
  status,
  attempt_count,
  blocking_point,
  interaction_history,
  created_at,
  updated_at
FROM user_issue_states
WHERE user_id = 'VOTRE_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Métriques à surveiller

### Tableau de bord SQL (cf. PIPELINE_NOTEO_ISSUE_TRACKER.md)

```sql
-- Taux de résolution
SELECT
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) * 100.0 / COUNT(*) AS taux_resolution_pct
FROM user_issue_states;

-- Problèmes actifs par feature
SELECT feature, COUNT(*)
FROM user_issue_states
WHERE status IN ('reported', 'in_progress')
GROUP BY feature;

-- Temps moyen de résolution
SELECT
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) AS avg_minutes
FROM user_issue_states
WHERE status = 'resolved';
```

---

## Problèmes connus et solutions

### 1. Les boutons ne s'affichent pas

**Vérifier** :
- La réponse du backend contient bien `validationButtons`
- Les logs de la console dans `ChatbotWidget.tsx` (ligne 597)
- Que le serveur Vite est bien redémarré après les modifications

### 2. button_clicked n'est pas envoyé au backend

**Vérifier** :
- `chatbotService.ts` accepte bien le paramètre `button_clicked`
- `handleValidationButtonClick` est bien appelé au clic (ligne 530)
- Les logs réseau (Network tab) montrent que `button_clicked` est dans le payload

### 3. L'escalade ne se déclenche pas automatiquement

**Vérifier** :
- La logique dans `issue-tracker/index.ts` (lignes 205-240)
- Que `attempt_count` augmente bien à chaque tentative infructueuse
- Les logs de `issue-tracker` dans Supabase

---

## Checklist de test complète

- [ ] **Test 1** : Message tutoriel → Boutons simples (✅ / ⚠️)
- [ ] **Test 2** : Message diagnostic → Boutons détaillés (✅ / ⚠️ / 🔍 / ❌)
- [ ] **Test 3** : Clic sur "✅ Ça marche !" → Résolution + félicitations
- [ ] **Test 4** : Clic sur "⚠️ Toujours bloqué" → Nouvelle tentative avec boutons
- [ ] **Test 5** : 2-3 clics "⚠️ Toujours bloqué" → Escalade automatique
- [ ] **Test 6** : Clic sur "🔍 Je ne trouve pas le bouton" → Indications visuelles
- [ ] **Test 7** : Vérifier l'enregistrement en base (user_issue_states)
- [ ] **Test 8** : Vérifier les logs Supabase (issue-tracker + chatbot-handler)
- [ ] **Test 9** : Vérifier l'historique des interactions (JSONB)
- [ ] **Test 10** : Tester sur mobile (boutons flex-wrap)

---

## Prochaines étapes (après validation)

1. ✅ Ajouter des analytics pour suivre les métriques
2. ✅ Créer un dashboard admin pour visualiser les problèmes actifs
3. ✅ Ajouter des notifications Slack pour les escalations
4. ✅ Affiner les règles de détection d'intention avec plus de keywords
5. ✅ Ajouter des screenshots dans les réponses pour aider visuellement

---

**Bonne chance pour les tests ! 🚀**
