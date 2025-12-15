# Plan d'intégration Ghost-Text dans toutes les zones de saisie

## 📊 Vue d'ensemble

Le système ghost-text ultra-performant (<30ms) existe déjà dans `/src/features/ghost-text/` et doit être déployé dans toutes les zones de saisie de l'application.

## 🎯 Objectif

Étendre le système d'auto-complétion ghost-text à **TOUTES** les zones de saisie sans toucher au comportement existant.

## 🏗️ Architecture existante

### Composants ghost-text disponibles
- `GhostTextArea` : Pour les zones multi-lignes (textarea)
- `GhostInput` : Pour les champs courts (input)
- `useGhostAutocomplete` : Hook réutilisable
- `suggestionEngine` : Moteur optimisé avec cache LRU

### Performance
- Génération de suggestions : < 30ms
- Cache multi-niveaux (LRU)
- Debounce intelligent : 150ms
- Support des contextes : `notes`, `vocab`, `search`, `chat`, `meeting`

## 📝 Zones de saisie identifiées (29 fichiers)

### 🔴 Priorité HAUTE (zones les plus utilisées)

#### 1. **ChatInput** (`src/components/chat/ChatInput.tsx`)
- **Ligne** : 115-140
- **Type** : `textarea`
- **Contexte** : `chat`
- **Action** : Remplacer par `GhostTextArea`

#### 2. **AIChat** (`src/components/ai/AIChat.tsx`)
- **Type** : Input/textarea pour discussion IA
- **Contexte** : `chat`
- **Action** : Remplacer par `GhostTextArea`

#### 3. **ModernNotesManager** (`src/components/documents/ModernNotesManager.tsx`)
- **Ligne** : 63 (déjà importé !)
- **Type** : textarea pour création de notes
- **Contexte** : `notes`
- **Action** : Remplacer par `GhostTextArea` (déjà importé, juste l'utiliser)

#### 4. **FullScreenNoteEditor** (`src/components/documents/FullScreenNoteEditor.tsx`)
- **Type** : textarea pour édition de notes
- **Contexte** : `notes`
- **Action** : Remplacer par `GhostTextArea`

#### 5. **VocabularyNotebook** (`src/components/vocabulary/VocabularyNotebook.tsx`)
- **Lignes** : 929-949 (word), 968-988 (definition), 1036-1056 (example)
- **Type** : input + textarea
- **Contexte** : `vocab`
- **Action** : Remplacer par `GhostInput` et `GhostTextArea`
- **Note** : Actuellement utilise SmartInput avec SuggestionPanel, peut coexister

### 🟡 Priorité MOYENNE

#### 6. **ModernMeetingForm** (`src/components/meetings/ModernMeetingForm.tsx`)
- **Type** : textarea pour notes de réunion
- **Contexte** : `meeting`
- **Action** : Remplacer par `GhostTextArea`

#### 7. **MeetingSummary** (`src/components/meetings/MeetingSummary.tsx`)
- **Type** : textarea pour résumé
- **Contexte** : `meeting`
- **Action** : Remplacer par `GhostTextArea`

#### 8. **MeetingTitleField** (`src/components/meetings/MeetingTitleField.tsx`)
- **Type** : input pour titre
- **Contexte** : `meeting`
- **Action** : Remplacer par `GhostInput`

#### 9. **ForumPage** + **ReplyForm** (`src/pages/ForumPage.tsx`, `src/components/forum/ReplyForm.tsx`)
- **Type** : textarea pour messages forum
- **Contexte** : `chat`
- **Action** : Remplacer par `GhostTextArea`

#### 10. **TaskModal** (`src/components/planning/TaskModal.tsx`)
- **Type** : input + textarea pour tâches
- **Contexte** : `notes`
- **Action** : Remplacer par `GhostInput` et `GhostTextArea`

### 🟢 Priorité BASSE

#### 11. **Help** + **Support** (`src/components/help/Help.tsx`, `src/components/legal/Support.tsx`)
- **Type** : textarea pour messages support
- **Contexte** : `chat`
- **Action** : Remplacer par `GhostTextArea`

#### 12. **DocumentNotes** (`src/components/documents/DocumentNotes.tsx`)
- **Type** : textarea
- **Contexte** : `notes`
- **Action** : Remplacer par `GhostTextArea`

#### 13. **AutomationBuilder** + **AutomationForm** (`src/components/automation/`)
- **Type** : input + textarea
- **Contexte** : `notes`
- **Action** : Remplacer par `GhostInput` et `GhostTextArea`

#### 14. **StudyPlanning** (`src/components/planning/StudyPlanning.tsx`)
- **Type** : input + textarea
- **Contexte** : `notes`
- **Action** : Remplacer par `GhostInput` et `GhostTextArea`

## 🔧 Stratégie d'intégration

### Option 1 : Remplacement direct (RECOMMANDÉ)
```tsx
// AVANT
<textarea
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Tapez..."
  className="..."
/>

// APRÈS
import { GhostTextArea } from '@/features/ghost-text';

<GhostTextArea
  value={message}
  onChange={setMessage}  // onChange prend directement la valeur
  placeholder="Tapez..."
  context="chat"
  userId={user?.id}
  enabled={true}
  darkMode={darkMode}
  className="..."
/>
```

### Option 2 : Coexistence avec SmartInput
Pour les zones utilisant déjà `SmartInput` + `SuggestionPanel`, on peut :
- Garder les deux systèmes (panneau + ghost-text)
- OU remplacer progressivement SmartInput par GhostTextArea

## ✅ Checklist d'intégration par composant

Pour chaque composant :
1. ✅ Identifier toutes les zones de saisie (input/textarea)
2. ✅ Déterminer le contexte approprié (`notes`, `vocab`, `search`, `chat`, `meeting`)
3. ✅ Importer `GhostTextArea` ou `GhostInput`
4. ✅ Remplacer le composant HTML par le composant ghost-text
5. ✅ Adapter `onChange` pour passer directement la valeur (pas l'événement)
6. ✅ Passer `userId`, `darkMode`, `enabled` si disponibles
7. ✅ Tester que le comportement existant fonctionne
8. ✅ Vérifier que les suggestions apparaissent correctement

## 🚀 Plan de déploiement

### Phase 1 : Zones prioritaires (Semaine 1)
1. ChatInput
2. ModernNotesManager
3. AIChat
4. FullScreenNoteEditor

### Phase 2 : Zones secondaires (Semaine 2)
5. VocabularyNotebook
6. ModernMeetingForm
7. ForumPage/ReplyForm

### Phase 3 : Zones tertiaires (Semaine 3)
8. TaskModal
9. Help/Support
10. DocumentNotes
11. Automation
12. StudyPlanning

## 🧪 Tests de non-régression

Après chaque intégration, vérifier :
- ✅ Le comportement existant fonctionne (saisie, validation, soumission)
- ✅ Les suggestions ghost-text apparaissent (Tab pour accepter, Esc pour ignorer)
- ✅ Pas de conflit avec les handlers existants (onKeyDown, onSubmit)
- ✅ Performance < 50ms par frappe
- ✅ Dark mode fonctionne
- ✅ Mobile-friendly (si applicable)

## 📌 Notes importantes

### Différences clés entre `<textarea>` et `<GhostTextArea>`

| Aspect | `<textarea>` | `<GhostTextArea>` |
|--------|-------------|-------------------|
| onChange | `onChange={(e) => setValue(e.target.value)}` | `onChange={setValue}` |
| Props | Standard HTML | Standard HTML + `context`, `userId`, `enabled`, `darkMode` |
| Ref | `ref={textareaRef}` | `ref={textareaRef}` (compatible) |

### Propriétés supplémentaires de GhostTextArea

```tsx
interface GhostTextAreaProps {
  // Props standard de <textarea>
  value: string;
  onChange: (value: string) => void;  // ⚠️ Prend la valeur directement
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
  // ...tous les autres props standard

  // Props spécifiques ghost-text
  context?: 'notes' | 'vocab' | 'search' | 'chat' | 'meeting';
  userId?: string;
  enabled?: boolean;  // true par défaut
  darkMode?: boolean;
}
```

## 🎯 Résultat attendu

Après l'intégration complète :
- **29 zones de saisie** auront l'auto-complétion ghost-text
- **0 régression** de comportement existant
- **Performance maintenue** < 30ms par suggestion
- **Expérience utilisateur** homogène à travers toute l'application
- **Facilité de désactivation** si nécessaire (via `enabled={false}`)

## 🔍 Commandes utiles

```bash
# Trouver toutes les zones avec textarea
grep -r "textarea" src/components --include="*.tsx" | wc -l

# Trouver toutes les zones avec input type="text"
grep -r "input type=" src/components --include="*.tsx" | wc -l

# Vérifier les imports de GhostTextArea
grep -r "GhostTextArea" src/components --include="*.tsx"
```

---

**Créé le** : 2025-12-12
**Dernière mise à jour** : 2025-12-12
**Statut** : 🚧 En cours
