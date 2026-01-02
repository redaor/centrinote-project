# Résumé des Modifications Frontend - Pipeline Issue Tracker

## ✅ Modifications effectuées

### 1. ChatbotWidget.tsx (`src/components/chatbot/ChatbotWidget.tsx`)

#### Nouvelles interfaces (lignes 15-36)

```typescript
interface ValidationButton {
  id: string;
  label: string;
  action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other';
  emoji: string;
}

interface Message {
  // ... (champs existants)
  validationButtons?: ValidationButton[];  // NOUVEAU
  intent?: 'tutorial' | 'diagnostic' | 'resolved' | 'escalate';  // NOUVEAU
  feature?: string;  // NOUVEAU
}
```

#### Nouveau composant ValidationButtons (lignes 296-351)

**Fonctionnalité** : Affiche dynamiquement les boutons de validation basés sur l'intention et le contexte

**Caractéristiques** :
- Boutons colorés selon l'action (vert pour "works", orange pour "still_blocked", gris pour les autres)
- Disposition flex-wrap pour s'adapter aux petits écrans
- Support des emojis pour chaque bouton
- Styles adaptés au mode sombre/clair

**Code** :
```typescript
function ValidationButtons({
  buttons,
  onButtonClick,
  darkMode
}: {
  buttons: ValidationButton[];
  onButtonClick: (action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other') => void;
  darkMode: boolean;
}) {
  // Affiche les boutons dynamiquement
  return (
    <div>
      {buttons.map((button) => (
        <button key={button.id} onClick={() => onButtonClick(button.action)}>
          {button.emoji} {button.label}
        </button>
      ))}
    </div>
  );
}
```

#### Modification de handleSend (ligne 465)

**Avant** :
```typescript
const handleSend = async () => {
  // ...
  const response = await chatbotService.sendMessage({
    message: userMessage,
    userId: user?.id || 'anonymous',
    // ...
  });
}
```

**Après** :
```typescript
const handleSend = async (buttonClicked?: 'works' | 'still_blocked' | ...) => {
  // ...
  const response = await chatbotService.sendMessage({
    message: userMessage,
    userId: user?.id || 'anonymous',
    // ...
    button_clicked: buttonClicked  // NOUVEAU : envoie l'action du bouton cliqué
  });

  // NOUVEAU : Gestion des validationButtons dans la réponse
  if (response.validationButtons && response.validationButtons.length > 0) {
    setMessages(prev => prev.map(msg =>
      msg.id === newMessage.id
        ? { ...msg, validationButtons: response.validationButtons, intent: response.intent, feature: response.feature }
        : msg
    ));
  }
}
```

#### Nouvelle fonction handleValidationButtonClick (lignes 530-625)

**Fonctionnalité** : Gère les clics sur les boutons de validation et déclenche un nouveau cycle d'interaction

**Logique** :
1. Retire les boutons du message précédent
2. Détermine le message utilisateur basé sur l'action (ex: "works" → "ça marche maintenant, merci !")
3. Affiche un message emoji côté utilisateur (ex: "✅ Ça marche !")
4. Envoie la requête au backend avec `button_clicked`
5. Affiche la nouvelle réponse du bot avec les nouveaux boutons

**Code simplifié** :
```typescript
const handleValidationButtonClick = async (action: 'works' | 'still_blocked' | ...) => {
  // Retirer les boutons
  setMessages(prev => prev.map(msg =>
    msg.validationButtons ? { ...msg, validationButtons: undefined } : msg
  ));

  // Déterminer le message
  let userMessage = '';
  switch (action) {
    case 'works':
      userMessage = 'ça marche maintenant, merci !';
      setFailureCount(0);
      break;
    case 'still_blocked':
      userMessage = 'toujours bloqué, j\'ai essayé mais ça ne fonctionne pas';
      setFailureCount(prev => prev + 1);
      break;
    // ...
  }

  // Envoyer au backend
  const response = await chatbotService.sendMessage({
    message: userMessage,
    button_clicked: action  // IMPORTANT
  });

  // Afficher la nouvelle réponse avec les nouveaux boutons
}
```

#### Modification du rendu (lignes 994-1019, 1064-1079)

**Logique** : Affiche ValidationButtons si présents, sinon fallback sur ConfirmationButtons

**Avant** :
```typescript
{message.showConfirmationButtons && (
  <ConfirmationButtons
    onResolved={handleProblemResolved}
    onNotResolved={handleProblemNotResolved}
    darkMode={darkMode}
  />
)}
```

**Après** :
```typescript
{/* NOUVEAU : Boutons de validation dynamiques */}
{message.validationButtons && message.validationButtons.length > 0 && (
  <ValidationButtons
    buttons={message.validationButtons}
    onButtonClick={handleValidationButtonClick}
    darkMode={darkMode}
  />
)}

{/* ANCIEN : Fallback sur les boutons de confirmation classiques */}
{!message.validationButtons && message.showConfirmationButtons && (
  <ConfirmationButtons
    onResolved={handleProblemResolved}
    onNotResolved={handleProblemNotResolved}
    darkMode={darkMode}
  />
)}
```

---

### 2. chatbotService.ts (`src/services/chatbotService.ts`)

#### Nouvelles interfaces

**ValidationButton** (lignes 11-16) :
```typescript
interface ValidationButton {
  id: string;
  label: string;
  action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other';
  emoji: string;
}
```

**Mise à jour de ChatbotRequest** (lignes 18-25) :
```typescript
interface ChatbotRequest {
  // ... (champs existants)
  button_clicked?: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other';  // NOUVEAU
}
```

**Mise à jour de ChatbotResponse** (lignes 27-37) :
```typescript
interface ChatbotResponse {
  // ... (champs existants)
  validationButtons?: ValidationButton[];  // NOUVEAU
  intent?: 'tutorial' | 'diagnostic' | 'resolved' | 'escalate';  // NOUVEAU
  feature?: string;  // NOUVEAU
}
```

---

## 🔄 Flux complet du pipeline

### 1. Utilisateur envoie un message

```
User: "Je suis bloqué, je n'arrive pas à créer une note"
```

### 2. Frontend → chatbot-handler

```json
{
  "action": "chat",
  "message": "Je suis bloqué, je n'arrive pas à créer une note",
  "userId": "xxx",
  "userEmail": "xxx",
  "userName": "xxx",
  "conversationHistory": [...],
  "button_clicked": undefined  // Premier message, pas de bouton cliqué
}
```

### 3. chatbot-handler → issue-tracker

```json
{
  "user_id": "xxx",
  "message": "Je suis bloqué, je n'arrive pas à créer une note",
  "conversation_id": null,
  "button_clicked": undefined
}
```

### 4. issue-tracker détecte l'intention

**Détection** :
- Mots-clés de blocage : "bloqué", "n'arrive pas"
- Feature détectée : "note_creation" (car "créer une note")
- Intent : `diagnostic` (car l'utilisateur signale un blocage)

**Base de données** :
```sql
INSERT INTO user_issue_states (user_id, feature, status, original_message, ...)
VALUES ('xxx', 'note_creation', 'in_progress', 'Je suis bloqué...', ...);
```

### 5. issue-tracker → chatbot-handler

```json
{
  "intent": "diagnostic",
  "feature": "note_creation",
  "buttons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" },
    { "id": "cant_find_button", "label": "Je ne trouve pas le bouton", "action": "cant_find_button", "emoji": "🔍" },
    { "id": "save_error", "label": "Erreur d'enregistrement", "action": "save_error", "emoji": "❌" }
  ],
  "should_call_chat_memory": true,
  "response_override": null
}
```

### 6. chatbot-handler → OpenAI (si should_call_chat_memory = true)

**Prompt enrichi** :
```
Intent détecté: diagnostic
Feature: note_creation
L'utilisateur a un problème de blocage. Voici son message: "Je suis bloqué, je n'arrive pas à créer une note"

Réponds avec des questions de diagnostic pour identifier le problème précis.
```

### 7. OpenAI → chatbot-handler

```
🔍 **Quelle étape te bloque exactement ?**

1. Tu ne trouves pas le bouton "Nouvelle note" ?
2. Le bouton est grisé ou désactivé ?
3. Une erreur apparaît quand tu cliques ?

Essaie de cliquer sur le bouton + en haut à droite de l'écran des notes.
```

### 8. chatbot-handler → Frontend

```json
{
  "message": "🔍 **Quelle étape te bloque exactement ?**\n\n1. Tu ne trouves pas le bouton \"Nouvelle note\" ?\n2. Le bouton est grisé ou désactivé ?\n3. Une erreur apparaît quand tu cliques ?\n\nEssaie de cliquer sur le bouton + en haut à droite de l'écran des notes.",
  "requiresEscalation": false,
  "validationButtons": [
    { "id": "works", "label": "Ça marche !", "action": "works", "emoji": "✅" },
    { "id": "still_blocked", "label": "Toujours bloqué", "action": "still_blocked", "emoji": "⚠️" },
    { "id": "cant_find_button", "label": "Je ne trouve pas le bouton", "action": "cant_find_button", "emoji": "🔍" },
    { "id": "save_error", "label": "Erreur d'enregistrement", "action": "save_error", "emoji": "❌" }
  ],
  "intent": "diagnostic",
  "feature": "note_creation"
}
```

### 9. Frontend affiche les boutons

**ChatbotWidget.tsx** :
```typescript
// Le message est stocké avec validationButtons
setMessages(prev => [...prev, {
  id: 'xxx',
  type: 'bot',
  content: '🔍 **Quelle étape te bloque exactement ?**...',
  validationButtons: [...],
  intent: 'diagnostic',
  feature: 'note_creation'
}]);

// Dans le rendu, ValidationButtons est affiché
<ValidationButtons
  buttons={message.validationButtons}
  onButtonClick={handleValidationButtonClick}
  darkMode={darkMode}
/>
```

### 10. Utilisateur clique sur "🔍 Je ne trouve pas le bouton"

**handleValidationButtonClick** :
```typescript
handleValidationButtonClick('cant_find_button')
  ↓
setMessages(/* Retire les boutons du message précédent */)
  ↓
addMessage('user', '🔍 Je ne trouve pas le bouton')
  ↓
chatbotService.sendMessage({
  message: 'je ne trouve pas le bouton dont tu parles',
  button_clicked: 'cant_find_button'  // ← IMPORTANT
})
```

### 11. Le cycle recommence avec le nouveau button_clicked

Et le pipeline continue jusqu'à résolution ou escalade...

---

## 📊 Avantages du nouveau système

### ✅ Avant (boutons statiques)
- Seulement 2 boutons : "Oui, merci" / "Pas encore"
- Pas de contexte sur le blocage précis
- Escalade manuelle uniquement

### ✅ Après (boutons dynamiques)
- Boutons adaptés à l'intention (tutorial vs diagnostic)
- Boutons détaillés pour diagnostiquer le blocage précis
- Escalade automatique après 2-3 tentatives
- Historique complet en base de données
- Métriques et analytics possibles

---

## 🎯 Prochaines étapes

### Tests à effectuer (voir GUIDE_TEST_PIPELINE.md)
1. Tester l'envoi d'un message tutoriel → Boutons simples
2. Tester l'envoi d'un message diagnostic → Boutons détaillés
3. Cliquer sur "✅ Ça marche !" → Vérifier résolution
4. Cliquer sur "⚠️ Toujours bloqué" 2-3 fois → Vérifier escalade
5. Vérifier l'enregistrement en base de données

### Améliorations futures
1. Ajouter des screenshots dans les réponses du bot
2. Créer un dashboard admin pour visualiser les problèmes actifs
3. Ajouter des notifications Slack pour les escalations
4. Affiner les règles de détection d'intention
5. Ajouter des analytics pour suivre les métriques

---

**Le frontend est prêt pour le test ! 🎉**

Consultez `GUIDE_TEST_PIPELINE.md` pour les scénarios de test détaillés.
