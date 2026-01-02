# 🔍 Analyse Complète du Système Noteo/Chatbot

## 📋 Table des Matières
1. [Pipeline Actuel](#pipeline-actuel)
2. [Problèmes Identifiés](#problèmes-identifiés)
3. [Problèmes UI/UX](#problèmes-uiux)
4. [Corrections Proposées](#corrections-proposées)
5. [Plan d'Implémentation](#plan-dimplémentation)

---

## 🔄 Pipeline Actuel

### **Flux de Données : UI → Backend → OpenAI → UI**

```
┌─────────────────┐
│  ChatbotWidget  │ (React Component)
│  - inputValue   │
│  - messages[]   │
└────────┬────────┘
         │
         │ POST /functions/v1/chatbot-handler
         │ {
         │   action: 'chat',
         │   message: string,
         │   userId, userEmail, userName,
         │   conversationHistory: messages.slice(-5),
         │   button_clicked?: string
         │ }
         ▼
┌─────────────────────────────────────┐
│  chatbot-handler (Edge Function)    │
│                                     │
│  1. Appelle issue-tracker           │
│     → Détecte l'intention           │
│     → Retourne validationButtons    │
│     → Détermine si diagnostic       │
│                                     │
│  2. Construit le systemPrompt       │
│     → Instructions pour Noteo       │
│     → Historique (5 derniers msgs)  │
│                                     │
│  3. Appelle OpenAI API              │
│     → model: gpt-4o-mini            │
│     → temperature: 0.8              │
│     → max_tokens: 800               │
│                                     │
│  4. Post-traitement                 │
│     → Détecte intention/escalade    │
│     → Ajoute validationButtons      │
│     → Retourne réponse complète     │
└────────────┬────────────────────────┘
             │
             │ JSON Response
             │ {
             │   message: string,
             │   requiresEscalation: boolean,
             │   validationButtons?: [...],
             │   intent?: string,
             │   feature?: string
             │ }
             ▼
┌─────────────────┐
│  ChatbotWidget  │
│  - addMessage() │
│  - setMessages()│
│  - Render UI    │
└─────────────────┘
```

### **Fichiers Clés**

1. **Frontend** :
   - `src/components/chatbot/ChatbotWidget.tsx` : Composant React principal
   - `src/services/chatbotService.ts` : Service HTTP vers edge function
   - `src/utils/noteoMessageDetector.ts` : Détection de format de message (non utilisé actuellement)

2. **Backend** :
   - `supabase/functions/chatbot-handler/index.ts` : Edge function principale
   - `supabase/functions/issue-tracker/index.ts` : Détection d'intention et boutons de validation
   - `supabase/functions/notify-support/index.ts` : Escalation vers email

---

## ❌ Problèmes Identifiés

### **1. Noteo Recommence un Diagnostic à Chaque Message**

**Problème** : Noteo ne conserve pas la mémoire du contexte de diagnostic entre les messages.

**Causes** :
- ✅ `issue-tracker` utilise déjà la table `user_issue_states` pour stocker l'état
- ❌ Mais le `conversation_id` n'est pas utilisé/persistant dans `ChatbotWidget`
- ❌ L'état récupéré de `issue-tracker` n'est PAS passé au `systemPrompt` dans `chatbot-handler`
- ❌ Le `systemPrompt` ne mentionne pas le contexte de diagnostic en cours
- ❌ L'historique de conversation (`conversationHistory`) est limité à 5 messages et ne contient que le texte brut

**Code Problématique** :
```typescript
// chatbot-handler/index.ts:300
const messages = [
  { role: 'system', content: systemPrompt },
  ...(request.conversationHistory || []).slice(-5), // ⚠️ Pas de contexte de diagnostic
  { role: 'user', content: request.message }
];
```

**Conséquence** : Chaque message est traité comme une nouvelle conversation, OpenAI recommence le diagnostic depuis zéro.

---

### **2. Changement de Style Entre les Messages**

**Problème** : L'interface change de style/format entre les messages.

**Causes** :
- ❌ `StructuredMessage` détecte les types de sections (question, solution, warning, tip) via des patterns regex/emoji
- ❌ Si le format de la réponse OpenAI change légèrement, le parsing échoue et affiche en "normal"
- ❌ Pas de formatage cohérent garanti dans le `systemPrompt`

**Code Problématique** :
```typescript
// ChatbotWidget.tsx:175-221
// Détection basée sur emoji et patterns
if (trimmedLine.startsWith('🔍')) {
  currentType = 'question';
} else if (trimmedLine.startsWith('✅')) {
  currentType = 'solution';
}
// ⚠️ Si OpenAI ne met pas les emojis exactement, le format change
```

**Conséquence** : Messages parfois avec encadrés colorés, parfois en texte normal, incohérence visuelle.

---

### **3. Zone de Texte Ne Passe Pas à la Ligne**

**Problème** : Le textarea "rentre" le texte au lieu de passer à la ligne.

**Causes** :
- ❌ Utilisation d'un `<input type="text">` au lieu d'un `<textarea>`
- ❌ Pas de gestion de la hauteur dynamique

**Code Problématique** :
```typescript
// ChatbotWidget.tsx:1067
<input
  type="text"  // ⚠️ Pas de retour à la ligne possible
  value={inputValue}
  // ...
/>
```

**Conséquence** : Texte long qui "rentre" horizontalement, mauvaise UX.

---

### **4. Problème d'Encodage ( dans les Titres)**

**Problème** : Caractères spéciaux mal encodés () dans les titres.

**Causes** :
- ❌ Probable problème d'encodage UTF-8 dans la réponse OpenAI
- ❌ Pas de sanitization/normalization des caractères spéciaux
- ❌ Possible problème de parsing JSON côté edge function

**Conséquence** : Titres avec caractères corrompus, texte illisible.

---

### **5. Pas de Gestion d'État de Diagnostic**

**Problème** : Aucun système pour suivre l'état du diagnostic (étape 1, étape 2, solution proposée, etc.).

**Causes** :
- ❌ Pas de `conversation_id` persistant
- ❌ Pas de stockage de `diagnostic_state` (initial, diagnosing, solution_proposed, resolved, escalated)
- ❌ `issue-tracker` est appelé à chaque message mais ne maintient pas d'état

**Conséquence** : Noteo ne sait pas où en est le diagnostic, recommence toujours depuis zéro.

---

## 🎨 Problèmes UI/UX

### **1. Input vs Textarea**

**Actuel** :
```tsx
<input type="text" ... />
```

**Problème** : Pas de retour à la ligne, texte qui "rentre".

**Solution** : Utiliser un `<textarea>` avec hauteur auto-ajustable.

---

### **2. Rendu Incohérent des Messages**

**Actuel** :
- `StructuredMessage` parse le texte avec regex/emoji
- Si le format change, le style change aussi

**Problème** : Incohérence visuelle entre messages.

**Solution** : 
- Forcer un format cohérent dans le `systemPrompt`
- Ou utiliser un format structuré (JSON) dans la réponse OpenAI

---

### **3. Gestion des Boutons de Validation**

**Actuel** :
- `validationButtons` sont retournés par `issue-tracker`
- Ajoutés au message après réception

**Problème** : Si `issue-tracker` ne retourne pas de boutons, pas de feedback possible.

**Solution** : Toujours ajouter des boutons par défaut si c'est une réponse de solution.

---

## ✅ Corrections Proposées

### **1. Ajouter un Système de Mémoire/État**

#### **A. Utiliser `conversation_id` Persistant**

```typescript
// ChatbotWidget.tsx
const [conversationId, setConversationId] = useState<string | null>(null);

// Au premier message, créer un conversation_id
useEffect(() => {
  if (!conversationId && messages.length === 0) {
    setConversationId(`conv-${Date.now()}-${user?.id || 'anon'}`);
  }
}, [messages.length]);

// Envoyer conversation_id à chaque appel
await chatbotService.sendMessage({
  ...request,
  conversation_id: conversationId
});
```

#### **B. Utiliser l'État de `issue-tracker` dans le Prompt**

**Note** : `issue-tracker` utilise déjà la table `user_issue_states`. Il faut simplement :
1. Passer le `conversation_id` depuis le frontend
2. Utiliser l'état retourné par `issue-tracker` dans le `systemPrompt`

```typescript
// chatbot-handler/index.ts (dans handleChat, après l'appel à issue-tracker)
const issueState = issueTrackerResponse.issue_state;

// Construire le prompt avec contexte
let contextualPrompt = systemPrompt;

if (issueState && issueState.status === 'in_progress') {
  contextualPrompt += `\n\n📋 **CONTEXTE DE DIAGNOSTIC EN COURS :**
- Fonctionnalité concernée : ${issueState.feature}
- État : ${issueState.status}
- Tentatives : ${issueState.attempt_count}/3
- Point de blocage : ${issueState.blocking_point || 'Non spécifié'}
- Dernière étape : ${issueState.last_step || 'Non spécifiée'}

⚠️ **IMPORTANT** : Continue le diagnostic depuis l'étape actuelle. Ne recommence PAS depuis le début.
Tu as déjà posé des questions, tu dois maintenant proposer des solutions basées sur les informations collectées.
`;
} else if (issueState && issueState.status === 'reported') {
  contextualPrompt += `\n\n📋 **NOUVEAU PROBLÈME DÉTECTÉ :**
- Fonctionnalité : ${issueState.feature}
- Message initial : ${issueState.original_message}

🎯 **ACTION** : Commence par poser 2-3 questions de diagnostic pour comprendre le problème exact.
`;
}
```

#### **C. Passer l'État de Diagnostic au SystemPrompt**

```typescript
// chatbot-handler/index.ts
const systemPrompt = `Tu es Noteo, l'assistant officiel de Centrinote.

${existingState ? `📋 **Contexte de diagnostic en cours :**
- État actuel : ${existingState.state}
- Étape : ${existingState.current_step}
- Fonctionnalité concernée : ${existingState.feature || 'Non spécifiée'}
- Résumé du problème : ${existingState.issue_summary || 'Non spécifié'}

⚠️ **IMPORTANT** : Continue le diagnostic depuis l'étape ${existingState.current_step}. Ne recommence pas depuis le début.
` : ''}

[... reste du prompt ...]
`;
```

---

### **2. Forcer un Format Cohérent dans le SystemPrompt**

```typescript
const systemPrompt = `[...]

📝 **Format de réponse STRICT :**

Pour les tutoriels :
\`\`\`
📝 **Titre du Tutoriel**

1. Étape 1
2. Étape 2
3. Étape 3

💡 Astuce : ...
\`\`\`

Pour les diagnostics :
\`\`\`
🔍 **Question de diagnostic**

[Question précise]

✅ **Solution proposée**

[Solution détaillée]
\`\`\`

⚠️ **RÈGLE STRICTE** : Toujours utiliser ce format exact. Ne pas varier.
`;
```

---

### **3. Remplacer `<input>` par `<textarea>` avec Auto-resize**

```tsx
// ChatbotWidget.tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }
}, [inputValue]);

<textarea
  ref={textareaRef}
  value={inputValue}
  onChange={(e) => {
    setInputValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }}
  onKeyPress={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }}
  rows={1}
  className="flex-1 px-4 py-2 rounded-lg border resize-none overflow-hidden min-h-[2.5rem] max-h-[8rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder={t('chatbot_placeholder') || 'Tapez votre message...'}
  disabled={isLoading}
/>
```

---

### **4. Corriger l'Encodage UTF-8**

```typescript
// chatbot-handler/index.ts
const aiMessage = openaiData.choices[0]?.message?.content || '';

// Normaliser les caractères UTF-8
const normalizedMessage = aiMessage
  .normalize('NFC') // Normaliser les caractères composés
  .replace(/[\u200B-\u200D\uFEFF]/g, '') // Supprimer les caractères invisibles
  .replace(/[\uFFFD]/g, ''); // Supprimer les caractères de remplacement

// Dans la réponse
const response: ChatbotResponse = {
  message: normalizedMessage,
  // ...
};
```

---

### **5. Implémenter le Système "Procédure → Diagnostic → Fix → Escalade"**

#### **A. États de Diagnostic**

```typescript
type DiagnosticState = 
  | 'initial'           // Pas encore de diagnostic
  | 'collecting_info'   // Collecte d'informations (questions de diagnostic)
  | 'solution_proposed' // Solution proposée, en attente de feedback
  | 'testing_solution'  // Utilisateur teste la solution
  | 'resolved'          // Problème résolu
  | 'escalated';        // Escalade vers support humain
```

#### **B. Logique de Transition d'État**

```typescript
// issue-tracker/index.ts
async function updateDiagnosticState(
  conversationId: string,
  userMessage: string,
  aiResponse: string,
  buttonClicked?: string
): Promise<DiagnosticState> {
  const currentState = await getCurrentState(conversationId);
  
  // Si bouton "works" cliqué
  if (buttonClicked === 'works') {
    return 'resolved';
  }
  
  // Si bouton "still_blocked" cliqué
  if (buttonClicked === 'still_blocked') {
    if (currentState.current_step >= 3) {
      return 'escalated'; // Après 3 tentatives, escalade
    }
    return 'solution_proposed'; // Proposer une nouvelle solution
  }
  
  // Si question de diagnostic
  if (isDiagnosticQuestion(aiResponse)) {
    return 'collecting_info';
  }
  
  // Si solution proposée
  if (isSolutionProposed(aiResponse)) {
    return 'solution_proposed';
  }
  
  return currentState.state;
}
```

#### **C. Prompt System Adaptatif**

```typescript
function buildSystemPrompt(diagnosticState: DiagnosticState, currentStep: number): string {
  const basePrompt = `Tu es Noteo, l'assistant officiel de Centrinote.`;
  
  if (diagnosticState === 'initial') {
    return `${basePrompt}

🎯 **Mode initial** : Commence par poser des questions de diagnostic pour comprendre le problème.
- Pose 2-3 questions précises
- Ne propose PAS de solution avant d'avoir les informations
`;
  }
  
  if (diagnosticState === 'collecting_info') {
    return `${basePrompt}

🔍 **Mode diagnostic (étape ${currentStep}/3)** : Continue à poser des questions pour comprendre le problème.
- Pose UNE question à la fois
- Ne propose PAS de solution avant l'étape 3
`;
  }
  
  if (diagnosticState === 'solution_proposed') {
    return `${basePrompt}

✅ **Mode solution proposée** : Une solution a été proposée.
- Attends le feedback de l'utilisateur
- Si ça ne marche pas, propose une solution alternative (étape ${currentStep}/3)
- Si ça marche, confirme et propose une astuce
`;
  }
  
  // ... autres états
}
```

---

## 📋 Plan d'Implémentation

### **Phase 1 : Corrections UI Immédiates (1-2h)**

1. ✅ Remplacer `<input>` par `<textarea>` avec auto-resize
2. ✅ Corriger l'encodage UTF-8 dans `chatbot-handler`
3. ✅ Ajouter CSS pour le textarea (min-height, max-height, resize-none)

**Fichiers à modifier** :
- `src/components/chatbot/ChatbotWidget.tsx`

---

### **Phase 2 : Format Cohérent des Messages (2-3h)**

1. ✅ Forcer un format strict dans le `systemPrompt`
2. ✅ Améliorer le parsing de `StructuredMessage` pour être plus tolérant
3. ✅ Tester avec différentes réponses OpenAI

**Fichiers à modifier** :
- `supabase/functions/chatbot-handler/index.ts` (systemPrompt)
- `src/components/chatbot/ChatbotWidget.tsx` (StructuredMessage)

---

### **Phase 3 : Système de Mémoire/État (4-6h)**

1. ✅ Créer la table `chatbot_diagnostic_states` dans Supabase
2. ✅ Modifier `ChatbotWidget` pour gérer `conversation_id`
3. ✅ Modifier `issue-tracker` pour stocker/restaurer l'état
4. ✅ Modifier `chatbot-handler` pour utiliser l'état dans le prompt

**Fichiers à créer** :
- Migration SQL pour `chatbot_diagnostic_states`

**Fichiers à modifier** :
- `src/components/chatbot/ChatbotWidget.tsx`
- `supabase/functions/issue-tracker/index.ts`
- `supabase/functions/chatbot-handler/index.ts`

---

### **Phase 4 : Logique de Diagnostic Progressive (3-4h)**

1. ✅ Implémenter les transitions d'état
2. ✅ Ajouter le compteur d'étapes
3. ✅ Logique d'escalade après 3 tentatives
4. ✅ Tests end-to-end

**Fichiers à modifier** :
- `supabase/functions/issue-tracker/index.ts`
- `supabase/functions/chatbot-handler/index.ts`

---

### **Phase 5 : Tests et Optimisations (2-3h)**

1. ✅ Tests avec différents scénarios
2. ✅ Optimisation des prompts
3. ✅ Documentation

---

## 🔧 Code de Correction Immédiate

### **1. Textarea avec Auto-resize**

```tsx
// ChatbotWidget.tsx (remplacer l'input)
const textareaRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }
}, [inputValue]);

<textarea
  ref={textareaRef}
  value={inputValue}
  onChange={(e) => {
    setInputValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`; // Max 8rem (128px)
  }}
  onKeyPress={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }}
  rows={1}
  className={`
    flex-1 px-4 py-2 rounded-lg border resize-none overflow-y-auto
    min-h-[2.5rem] max-h-[8rem]
    focus:outline-none focus:ring-2 focus:ring-blue-500
    ${darkMode
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    }
    disabled:opacity-50 disabled:cursor-not-allowed
  `}
  placeholder={t('chatbot_placeholder') || 'Tapez votre message...'}
  disabled={isLoading}
/>
```

---

### **2. Normalisation UTF-8**

```typescript
// chatbot-handler/index.ts (dans handleChat)
const aiMessage = openaiData.choices[0]?.message?.content || '';

// Normaliser les caractères UTF-8
const normalizedMessage = aiMessage
  .normalize('NFC') // Normaliser les caractères composés
  .replace(/[\u200B-\u200D\uFEFF]/g, '') // Supprimer les caractères invisibles
  .replace(/[\uFFFD]/g, '') // Supprimer les caractères de remplacement
  .trim();
```

---

### **3. Format Strict dans SystemPrompt**

```typescript
// chatbot-handler/index.ts
const systemPrompt = `Tu es Noteo, l'assistant officiel de Centrinote.

[... connaissances ...]

📝 **FORMAT DE RÉPONSE STRICT :**

Pour les tutoriels :
\`\`\`
📝 **Titre du Tutoriel** (un seul emoji au début)

1. Étape 1 avec action précise
2. Étape 2 avec action précise
3. Étape 3 avec action précise

💡 Astuce : [une seule astuce pertinente]
\`\`\`

Pour les diagnostics :
\`\`\`
🔍 **Question de diagnostic** (un seul emoji au début)

[Question précise et concise]

✅ **Solution proposée** (un seul emoji au début)

[Solution détaillée avec étapes]
\`\`\`

⚠️ **RÈGLE ABSOLUE** :
- Maximum 2 emojis par réponse (un pour le titre, un pour l'astuce)
- Toujours utiliser ce format exact
- Ne pas varier les emojis ou la structure
- Encoder correctement tous les caractères UTF-8
`;
```

---

## 📊 Résumé des Corrections

| Problème | Priorité | Complexité | Temps Estimé |
|----------|----------|------------|--------------|
| Textarea auto-resize | 🔴 Haute | Faible | 30 min |
| Encodage UTF-8 | 🔴 Haute | Faible | 30 min |
| Format cohérent messages | 🟡 Moyenne | Moyenne | 2h |
| Système de mémoire/état | 🔴 Haute | Élevée | 4-6h |
| Logique diagnostic progressive | 🟡 Moyenne | Élevée | 3-4h |

**Temps Total Estimé** : 10-13h

---

## 🎯 Prochaines Étapes

1. **Immédiat** : Corriger le textarea et l'encodage UTF-8 (1h)
2. **Court terme** : Implémenter le format cohérent (2h)
3. **Moyen terme** : Système de mémoire/état (4-6h)
4. **Long terme** : Logique de diagnostic progressive (3-4h)

