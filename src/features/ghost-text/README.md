# 🎯 Système Ghost-Text (Autocomplétion Inline)

Système d'autocomplétion inline style **GitHub Copilot/Notion** pour toutes les zones de saisie de l'application.

## ✨ Fonctionnalités

- **Ghost-text** : Le suffixe manquant apparaît en transparence juste après le curseur
- **Tab** → Accepte la suggestion (remplace le mot en cours ou ajoute le suffixe)
- **Esc** → Ignore la suggestion
- **Mobile** : Tap sur le ghost ou icône « + » pour accepter (à venir)
- **Performance** : < 50 ms par frappe (pas d'appel réseau synchrone)
- **Extensibilité** : Un seul hook + un seul composant wrapper à réutiliser partout

## 📦 Architecture

```
src/features/ghost-text/
├── hooks/
│   └── useGhostAutocomplete.ts      # Hook universel pour la logique
├── ui/
│   └── GhostTextArea.tsx            # Composant wrapper avec ghost-text inline
├── services/
│   └── suggestionEngine.ts          # Génération de suggestions + cache
└── index.ts                         # Export unique
```

## 🚀 Usage

### Intégration en 3 lignes

```tsx
import { GhostTextArea } from '@/features/ghost-text';

<GhostTextArea
  value={text}
  onChange={setText}
  placeholder="Décrivez votre idée..."
  context="notes"        // ou "vocab", "search", "chat", "meeting"
  userId={userId}
/>
```

### Props disponibles

```tsx
interface GhostTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  context?: 'notes' | 'vocab' | 'search' | 'chat' | 'meeting';
  userId?: string;
  enabled?: boolean;
  darkMode?: boolean;
  // ... toutes les props standard de <textarea>
}
```

## 📋 Checklist de migration (par module)

| Module       | Fichier(s) cible                                             | Statut |
|--------------|-------------------------------------------------------------|--------|
| Notes        | `ModernNotesManager.tsx`                                    | ✅ Fait |
| Vocabulaire  | `VocabEntryEditor.tsx` + `VocabAddForm.tsx`                 | ⏳ À faire |
| Recherche IA | `AIChat.tsx` (input message)                                | ⏳ À faire |
| Chat IA      | `ChatInput.tsx`                                             | ⏳ À faire |
| Réunions     | `MeetingMinutesEditor.tsx`                                  | ⏳ À faire |

## 🔧 Exemple de migration

### Avant

```tsx
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  placeholder="Tapez votre message..."
  className="..."
/>
```

### Après

```tsx
import { GhostTextArea } from '@/features/ghost-text';

<GhostTextArea
  value={text}
  onChange={setText}
  placeholder="Tapez votre message..."
  context="notes"
  userId={user?.id}
  className="..."
/>
```

**C'est tout !** Le composant gère automatiquement :
- L'affichage du ghost-text
- Les raccourcis clavier (Tab/Esc)
- La génération de suggestions
- Le cache pour la performance

## 🧪 Tests

Page de démo disponible sur `/ghost-text-demo` pour tester tous les contextes :
- Notes
- Vocabulaire
- Recherche IA
- Chat IA
- Réunions

## 🎨 Personnalisation

### Désactiver le ghost-text

```tsx
<GhostTextArea
  value={text}
  onChange={setText}
  enabled={false}  // Désactive complètement le ghost-text
/>
```

### Changer le contexte

Le contexte influence les suggestions générées :

- `notes` : Optimisé pour la création de notes
- `vocab` : Optimisé pour les entrées de vocabulaire
- `search` : Optimisé pour les requêtes de recherche
- `chat` : Optimisé pour les messages de chat
- `meeting` : Optimisé pour les comptes-rendus de réunion

## 🔍 Détails techniques

### Performance

- **Cache en mémoire** : Les suggestions sont mises en cache pendant 5 secondes
- **Debounce** : 300ms par défaut (configurable)
- **Pas d'appel réseau synchrone** : Tout est calculé localement
- **Objectif** : < 50ms par frappe

### Génération de suggestions

Le système utilise :
1. **Mots de l'utilisateur** : Extraits de ses notes (cache 5 minutes)
2. **Mots français courants** : Top 500 mots les plus utilisés
3. **Distance de Levenshtein** : Pour les corrections orthographiques (≤ 2)
4. **Complétion par préfixe** : Mots commençant par le préfixe tapé

## 📝 Notes

- Le ghost-text s'affiche uniquement pour les suggestions de type `completion`
- Les corrections orthographiques sont appliquées automatiquement si confiance ≥ 0.9
- Le système est **extensible** : facile d'ajouter de nouveaux contextes ou sources de suggestions

## 🐛 Dépannage

### Le ghost-text ne s'affiche pas

1. Vérifier que `enabled={true}` (par défaut activé)
2. Vérifier que le texte contient au moins 2 caractères
3. Vérifier que `userId` est fourni pour les suggestions personnalisées
4. Ouvrir la console pour voir les erreurs éventuelles

### Les suggestions sont lentes

1. Vérifier que le cache fonctionne (voir console)
2. Réduire le `debounceMs` si nécessaire
3. Vérifier la taille du cache (max 100 entrées)

## 🚧 Roadmap

- [ ] Support mobile (tap sur ghost)
- [ ] Suggestions basées sur l'IA (optionnel)
- [ ] Support multi-langues
- [ ] Suggestions contextuelles (basées sur le contenu précédent)





