# AI Chat Feature Module

Module de chat IA refactorisé selon le pattern Strangler-Fig.

## 📁 Structure

```
ai-chat/
├── index.ts                    # Barrel export principal
├── components/                 # Composants UI
│   ├── AIChatContainer.tsx    # Container principal (Step 10)
│   ├── ChatHeader.tsx         # Header avec tabs (Step 8)
│   ├── MessagesContainer.tsx  # Zone de messages (Step 9)
│   ├── MessageBubbleAI.tsx    # Bulle de message IA (Step 4)
│   ├── MessageBubbleUser.tsx  # Bulle de message utilisateur (Step 5)
│   ├── InputBar.tsx           # Barre de saisie (Step 6)
│   ├── FileUploadZone.tsx     # Zone d'upload fichiers (Step 7)
│   └── VoiceInputButton.tsx   # Bouton de reconnaissance vocale (Step 2)
├── hooks/                      # Hooks métier
│   ├── useMessageActions.ts   # Gestion fichiers/modal (Step 1)
│   └── useMessageProcessor.ts # Parsing/cleaning messages (Step 3)
└── types/                      # Types TypeScript
    └── index.ts               # Types partagés
```

## 🎯 Objectifs

- **Réduction de complexité** : Passer de 1840 lignes à ~150 lignes par fichier
- **Séparation des responsabilités** : UI / Logique / State management
- **Testabilité** : Chaque composant/hook est testable indépendamment
- **Performance** : Code-splitting avec React.lazy (Step 12)

## 📝 Règles de refactoring

1. **Un fichier à la fois** - Commits atomiques
2. **Tests après chaque step** - `npm run lint && npm run build`
3. **Pas de modification de comportement** - Strangler-Fig pattern
4. **Préservation des signatures** - Exports identiques
5. **Documentation** - Commentaires JSDoc conservés

## 🚀 Progression

- [x] Step 0: Structure de base
- [ ] Step 1: useMessageActions hook
- [ ] Step 2: VoiceInputButton component
- [ ] Step 3: useMessageProcessor hook
- [ ] Step 4: MessageBubbleAI component
- [ ] Step 5: MessageBubbleUser component
- [ ] Step 6: InputBar component
- [ ] Step 7: FileUploadZone component
- [ ] Step 8: ChatHeader component
- [ ] Step 9: MessagesContainer component
- [ ] Step 10: AIChatContainer component
- [ ] Step 11: Suppression AIChat.tsx
- [ ] Step 12: React.lazy optimisation
