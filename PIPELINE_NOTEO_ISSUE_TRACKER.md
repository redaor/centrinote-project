# 🔄 Pipeline Hybride Noteo - Gestion de Problèmes Utilisateurs

> **Date de création :** 1er Janvier 2026
> **Architecture :** Middleware en 3 étapes (chatbot-handler → issue-tracker → OpenAI)

---

## 📊 Vue d'ensemble

Le pipeline hybride Noteo combine **détection d'intention stricte**, **gestion d'état des problèmes**, et **assistance conversationnelle** pour offrir une expérience de support optimale.

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  chatbot-handler │ ───> │  issue-tracker   │ ───> │     OpenAI       │
│   (orchestrateur)│      │ (détection intent│      │   (réponse IA)   │
└──────────────────┘      │  + états)        │      └──────────────────┘
                          └──────────────────┘
                                   │
                                   ↓
                          ┌──────────────────┐
                          │ user_issue_states│
                          │    (PostgreSQL)  │
                          └──────────────────┘
```

---

## 🎯 Fonctionnalités clés

### 1. **Détection d'intention stricte**

| Intention | Déclencheurs | Réponse |
|-----------|--------------|---------|
| **Tutorial** | "comment créer une note" (sans blocage) | Étapes numérotées + boutons validation |
| **Diagnostic** | "bloqué sur création note", "erreur", "ne trouve pas" | Questions ciblées + diagnostic progressif |
| **Resolved** | "ça marche", "résolu", bouton ✅ | Marque résolu + génère astuce contextuelle |
| **Escalate** | 2-3 tentatives échouées, demande explicite | Création ticket support + contact humain |

### 2. **Gestion d'état des problèmes**

**Table `user_issue_states` :**

```sql
CREATE TABLE user_issue_states (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,              -- ex: "note_creation", "vocabulary_add"
  status TEXT CHECK (status IN ('reported', 'in_progress', 'resolved', 'escalated')),
  last_step TEXT,                     -- ex: "opened_notes_menu", "clicked_new_note"
  attempt_count INTEGER DEFAULT 0,    -- Escalade après 2-3
  blocking_point TEXT,                -- ex: "cannot_find_button", "error_on_save"
  original_message TEXT NOT NULL,
  interaction_history JSONB DEFAULT '[]'::jsonb,
  conversation_id UUID,
  ticket_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  escalated_at TIMESTAMP
);
```

**Transitions d'état :**

```
reported → in_progress → resolved
    ↓                        ↓
    └────────> escalated ←───┘
```

### 3. **Boutons de validation interactifs**

#### Tutoriel (intention simple) :
```json
{
  "buttons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" }
  ]
}
```

#### Diagnostic (problème détecté) :
```json
{
  "buttons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" },
    { "id": "cant_find_button", "label": "Je ne trouve pas le bouton", "action": "cant_find_button", "emoji": "🔍" },
    { "id": "save_error", "label": "Erreur lors de l'enregistrement", "action": "save_error", "emoji": "❌" }
  ]
}
```

---

## 🔧 Architecture détaillée

### **Étape 1 : chatbot-handler (Orchestrateur)**

**Fichier :** `supabase/functions/chatbot-handler/index.ts`

**Responsabilités :**
- ✅ Recevoir la requête utilisateur
- ✅ Appeler `issue-tracker` pour détecter l'intention
- ✅ Gérer les réponses directes (resolved, escalate)
- ✅ Construire le prompt système avec contexte Noteo
- ✅ Appeler OpenAI pour générer la réponse IA
- ✅ Retourner la réponse finale avec boutons de validation

**Flux :**

```typescript
async function handleChat(request: ChatbotRequest, supabase: any) {
  // 1. Appeler issue-tracker
  const issueTrackerResponse = await fetch(`${SUPABASE_URL}/functions/v1/issue-tracker`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: request.userId,
      message: request.message,
      button_clicked: request.button_clicked
    })
  });

  // 2. Si réponse directe, retourner immédiatement
  if (issueTrackerResponse.response_override) {
    return {
      message: issueTrackerResponse.response_override,
      requiresEscalation: issueTrackerResponse.intent === 'escalate',
      validationButtons: issueTrackerResponse.buttons
    };
  }

  // 3. Sinon, appeler OpenAI avec le prompt Noteo
  const aiResponse = await callOpenAI(promptMessages);

  // 4. Retourner avec les boutons de issue-tracker
  return {
    message: aiResponse,
    intent: issueTrackerResponse.intent,
    feature: issueTrackerResponse.feature,
    validationButtons: issueTrackerResponse.buttons
  };
}
```

---

### **Étape 2 : issue-tracker (Détection d'intention + États)**

**Fichier :** `supabase/functions/issue-tracker/index.ts`

**Responsabilités :**
- ✅ Détecter l'intention du message (tutorial, diagnostic, resolved, escalate)
- ✅ Identifier la fonctionnalité concernée (note_creation, vocabulary_add, etc.)
- ✅ Créer/mettre à jour l'état du problème dans `user_issue_states`
- ✅ Générer les boutons de validation appropriés
- ✅ Détecter l'escalade nécessaire (après 2-3 tentatives)

**Logique de détection :**

```typescript
function detectIntent(message: string, buttonClicked?: string) {
  const lowerMsg = message.toLowerCase();

  // 1. Résolution confirmée ?
  if (buttonClicked === 'works' || lowerMsg.includes('ça marche')) {
    return { intent: 'resolved', blockingSignal: false };
  }

  // 2. Demande explicite de support ?
  if (lowerMsg.includes('contact support') || lowerMsg.includes('parler à un humain')) {
    return { intent: 'escalate', blockingSignal: true };
  }

  // 3. Signaux de blocage ?
  const blockingKeywords = ['bloqué', 'ça ne marche pas', 'erreur', 'impossible', 'ne trouve pas'];
  const hasBlockingSignal = blockingKeywords.some(kw => lowerMsg.includes(kw));

  // 4. Identifier la fonctionnalité
  let feature: string | undefined;
  if (lowerMsg.includes('note') && lowerMsg.includes('créer')) {
    feature = 'note_creation';
  } else if (lowerMsg.includes('vocabulaire') && lowerMsg.includes('ajouter')) {
    feature = 'vocabulary_add';
  }
  // ... autres fonctionnalités

  // 5. Déterminer l'intention finale
  if (!feature) return { intent: 'unknown', blockingSignal: hasBlockingSignal };
  if (hasBlockingSignal) return { intent: 'diagnostic', feature, blockingSignal: true };
  return { intent: 'tutorial', feature, blockingSignal: false };
}
```

**Gestion des états :**

```typescript
// Créer un nouveau problème
if (!activeIssue && intent === 'diagnostic') {
  issue = await createIssue(user_id, feature, message, blockingPoint);
}

// Mettre à jour un problème existant
if (activeIssue && buttonClicked === 'still_blocked') {
  issue = await updateIssue(activeIssue.id, {
    status: 'in_progress',
    blocking_point: 'cannot_find_button'
  }, {
    action: 'button_clicked',
    button: buttonClicked,
    message: message
  });
}

// Escalade automatique si 2+ tentatives
if (issue && issue.attempt_count >= 2) {
  return {
    intent: 'escalate',
    response_override: `Je vois que vous rencontrez des difficultés après ${issue.attempt_count} tentatives. Je vous recommande de contacter notre équipe de support.`
  };
}
```

---

### **Étape 3 : OpenAI (Génération de réponse)**

**Prompt système :** Noteo optimisé (60 lignes)

```typescript
const systemPrompt = `Tu es Noteo, l'assistant officiel de Centrinote.
Ton rôle est d'aider les utilisateurs à comprendre et utiliser toutes les fonctionnalités de Centrinote.

📚 **Connaissances disponibles :**
- **Gestion de documents et notes** : création (Menu "Notes" → "+ Nouvelle note"), édition...
- **Vocabulaire et flashcards** : ajout de mots, révision adaptative...
- **Automatisations** : règles "Si...Alors...", déclencheurs...

🎯 **Règles de réponse :**

1. **Toujours répondre dans le contexte Centrinote.**
   - ❌ Ne jamais répondre sur des sujets hors Centrinote.

2. **Détection d'intention :**
   - Si tutoriel → étapes numérotées + astuces
   - Si diagnostic → poser 2-3 questions AVANT solutions

3. **Formatage strict :**
   - Maximum 2 emojis par réponse
   - Marqueurs visuels : 🔍 diagnostic, ✅ solutions, ⚠️ avertissements, 💡 astuces

⚠️ **RESTRICTIONS STRICTES :**
- Ne JAMAIS répondre à des questions hors Centrinote
- Ne JAMAIS proposer l'escalation dès la première réponse
- Ne JAMAIS utiliser plus de 2 emojis par réponse
`;
```

---

## 🧪 Exemples de flux complets

### **Exemple 1 : Tutoriel simple**

**Requête utilisateur :**
```json
{
  "action": "chat",
  "message": "Comment créer une note ?",
  "userId": "user-123"
}
```

**Étape 1 : issue-tracker détecte `tutorial`**
```json
{
  "intent": "tutorial",
  "feature": "note_creation",
  "should_call_chat_memory": true,
  "buttons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" }
  ]
}
```

**Étape 2 : OpenAI génère la réponse**
```
📝 **Créer une note en 3 étapes**

1. Cliquez sur "Notes" dans le menu principal
2. Cliquez sur "+ Nouvelle note"
3. Donnez un titre et rédigez votre contenu

💡 Astuce : vos notes sont sauvegardées automatiquement !

Voulez-vous essayer maintenant ?
```

**Réponse finale :**
```json
{
  "message": "📝 **Créer une note en 3 étapes**\n\n1. Cliquez sur...",
  "requiresEscalation": false,
  "intent": "tutorial",
  "feature": "note_creation",
  "validationButtons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" }
  ]
}
```

---

### **Exemple 2 : Diagnostic progressif**

**Requête 1 : Problème signalé**
```json
{
  "message": "Je suis bloqué pour créer une note",
  "userId": "user-123"
}
```

**issue-tracker :** Crée un problème (`status: reported`)
```json
{
  "intent": "diagnostic",
  "feature": "note_creation",
  "issue_state": {
    "id": "issue-456",
    "status": "reported",
    "attempt_count": 0,
    "original_message": "Je suis bloqué pour créer une note"
  },
  "buttons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" },
    { "id": "cant_find_button", "label": "Je ne trouve pas le bouton", "action": "cant_find_button", "emoji": "🔍" },
    { "id": "save_error", "label": "Erreur d'enregistrement", "action": "save_error", "emoji": "❌" }
  ]
}
```

**OpenAI :** Pose des questions de diagnostic
```
🔍 **Diagnostic du problème**

À quelle étape rencontrez-vous le blocage ?

1. Voyez-vous le menu "Notes" ?
2. Trouvez-vous le bouton "+ Nouvelle note" ?
3. Quel message d'erreur apparaît ?
```

---

**Requête 2 : Bouton cliqué "cant_find_button"**
```json
{
  "message": "Je clique sur 'Je ne trouve pas le bouton'",
  "userId": "user-123",
  "button_clicked": "cant_find_button"
}
```

**issue-tracker :** Met à jour (`status: in_progress`, `blocking_point: cannot_find_button`, `attempt_count: 1`)

**OpenAI :** Solution ciblée
```
✅ **Localisation du bouton "+ Nouvelle note"**

Le bouton se trouve :
- En haut à droite de la page "Notes"
- Avec une icône "+"
- Couleur bleue

💡 Astuce : Assurez-vous d'être bien sur la page "Notes" (menu de gauche).

Est-ce que vous le voyez maintenant ?
```

---

**Requête 3 : Bouton cliqué "still_blocked"**
```json
{
  "message": "Toujours bloqué",
  "userId": "user-123",
  "button_clicked": "still_blocked"
}
```

**issue-tracker :** Met à jour (`attempt_count: 2`)

**ESCALADE AUTOMATIQUE** (après 2 tentatives)
```json
{
  "intent": "escalate",
  "response_override": "Je vois que vous rencontrez des difficultés après 2 tentatives. Je vous recommande de contacter notre équipe de support pour une aide personnalisée.",
  "issue_state": {
    "status": "escalated",
    "ticket_id": "ticket-789"
  }
}
```

---

## 📋 Checklist de déploiement

### 1. **Migration SQL**

```bash
# Option 1 : Via Dashboard Supabase
# Ouvrir https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/editor
# Coller le contenu de supabase/migrations/20260101_create_user_issue_states.sql

# Option 2 : Via CLI (si docker installé)
supabase db push
```

### 2. **Déployer les edge functions**

```bash
# Déployer issue-tracker
supabase functions deploy issue-tracker

# Déployer chatbot-handler (modifié)
supabase functions deploy chatbot-handler
```

### 3. **Variables d'environnement**

Vérifier que ces variables existent :
- ✅ `OPENAI_API_KEY`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### 4. **Tests**

```bash
# Tester issue-tracker
curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/issue-tracker \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "message": "Comment créer une note ?"}'

# Résultat attendu :
# {
#   "intent": "tutorial",
#   "feature": "note_creation",
#   "buttons": [...]
# }
```

---

## 📊 Métriques de succès

**KPIs à suivre :**

| Métrique | Requête SQL | Cible |
|----------|-------------|-------|
| **Taux de résolution auto** | `SELECT COUNT(*) FROM user_issue_states WHERE status = 'resolved' AND attempt_count <= 1` | > 70% |
| **Taux d'escalade** | `SELECT COUNT(*) FROM user_issue_states WHERE status = 'escalated'` | < 15% |
| **Temps moyen de résolution** | `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FROM user_issue_states WHERE status = 'resolved'` | < 5 min |
| **Problèmes les plus fréquents** | `SELECT feature, COUNT(*) FROM user_issue_states GROUP BY feature ORDER BY COUNT(*) DESC LIMIT 10` | - |

---

## 🔍 Troubleshooting

### **Problème : issue-tracker ne répond pas**

**Vérifier les logs :**
```bash
supabase functions logs issue-tracker --tail
```

**Vérifier que la table existe :**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'user_issue_states';
```

### **Problème : Boutons ne s'affichent pas**

**Vérifier la réponse de chatbot-handler :**
```json
{
  "message": "...",
  "validationButtons": [ // ← Doit être présent
    { "id": "works", "label": "Ça marche !", ... }
  ]
}
```

**Vérifier le frontend :**
- Le widget chatbot doit gérer `validationButtons`
- Ajouter un handler pour `button_clicked`

---

## 📚 Ressources

- **Migration SQL :** `supabase/migrations/20260101_create_user_issue_states.sql`
- **Edge function issue-tracker :** `supabase/functions/issue-tracker/index.ts`
- **Edge function chatbot-handler :** `supabase/functions/chatbot-handler/index.ts`
- **Rapport d'architecture chatbot :** `ARCHITECTURE_CHATBOT_NOTEO.md`

---

**🎉 Le pipeline hybride Noteo est maintenant opérationnel !**
