# Système de Correction Automatique et Suggestions Intelligentes

## Vue d'ensemble

Le système de correction automatique et de suggestions intelligentes améliore la qualité de saisie dans tous les modules Noteo (Chat, Aide, IA, Notes, Vocabulaire) en corrigeant automatiquement les erreurs courantes, en proposant des suggestions contextuelles et des reformulations IA.

## Architecture

### 1. Hook `useTextCorrection`

**Emplacement:** `/src/hooks/useTextCorrection.ts`

Le hook principal qui gère la logique de correction et de suggestions.

#### Fonctionnalités

- **Correction automatique** : Détecte et corrige automatiquement les fautes de frappe courantes
- **Suggestions intelligentes** : Propose des complétions basées sur le contexte
- **Reformulations IA** : Utilise OpenAI pour proposer des reformulations naturelles (optionnel)
- **Debounce** : Analyse le texte avec un délai configurable pour optimiser les performances
- **Confiance configurable** : Seuil de confiance minimal pour les suggestions
- **Détection d'API** : Vérifie automatiquement la disponibilité de l'API IA

#### Options de configuration

```typescript
interface CorrectionOptions {
  enableAutoCorrect?: boolean;     // Activer la correction automatique (défaut: true)
  enableSuggestions?: boolean;     // Activer les suggestions (défaut: true)
  enableReformulations?: boolean;  // Activer les reformulations IA (défaut: false)
  minConfidence?: number;          // Confiance minimale (0-1, défaut: 0.7)
  debounceMs?: number;            // Délai de debounce en ms (défaut: 300)
  aiApiKey?: string;              // Clé API OpenAI (optionnelle, sinon VITE_OPENAI_API_KEY)
}
```

#### API

```typescript
const {
  suggestions,            // Liste des suggestions actuelles
  isAnalyzing,           // Indicateur d'analyse en cours
  aiAvailable,           // Booléen indiquant si l'API IA est disponible
  applyAutoCorrections,  // Fonction pour appliquer les corrections automatiques
  analyzeLater,          // Fonction pour analyser avec debounce (async pour reformulations IA)
  applySuggestion,       // Fonction pour appliquer une suggestion spécifique
  clearSuggestions,      // Fonction pour effacer toutes les suggestions
} = useTextCorrection(options);
```

#### Exemple d'utilisation avec reformulations IA

```typescript
const {
  suggestions,
  aiAvailable,
  applyAutoCorrections,
  analyzeLater,
  applySuggestion,
  clearSuggestions,
} = useTextCorrection({
  enableAutoCorrect: true,
  enableSuggestions: true,
  enableReformulations: true, // 🆕 Activer les reformulations IA
  minConfidence: 0.7,
  debounceMs: 300,
  aiApiKey: import.meta.env.VITE_OPENAI_API_KEY, // Optionnel
});

// aiAvailable sera true si la clé API est configurée
console.log('IA disponible:', aiAvailable);
```

### 2. Composant `SuggestionPanel`

**Emplacement:** `/src/components/ai/SuggestionPanel.tsx`

Panneau UI pour afficher les suggestions à l'utilisateur.

#### Caractéristiques

- Design moderne avec animations Framer Motion
- Support du mode sombre
- Affichage du niveau de confiance
- Actions rapides (Appliquer/Ignorer)
- Affichage du texte original vs suggestion

#### Props

```typescript
interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
  onDismissAll: () => void;
  darkMode?: boolean;
  isVisible?: boolean;
}
```

### 3. Composant `SmartInput` (Réutilisable)

**Emplacement:** `/src/components/common/SmartInput.tsx`

Composant d'input réutilisable avec correction intégrée.

#### Props disponibles

```typescript
interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  darkMode?: boolean;
  multiline?: boolean;
  maxHeight?: number;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  enableCorrection?: boolean;        // Activer corrections automatiques
  enableSuggestions?: boolean;       // Activer suggestions contextuelles
  enableReformulations?: boolean;    // 🆕 Activer reformulations IA
  allowEmpty?: boolean;              // 🆕 Permettre saisie vide ("Saisir plus tard")
  aiApiKey?: string;                 // 🆕 Clé API personnalisée
}
```

#### Utilisation basique

```tsx
import { SmartInput } from '@/components/common/SmartInput';

function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <SmartInput
      value={value}
      onChange={setValue}
      placeholder="Tapez votre message..."
      enableCorrection={true}
      enableSuggestions={true}
      multiline={true}
    />
  );
}
```

#### Utilisation avec reformulations IA

```tsx
import { SmartInput } from '@/components/common/SmartInput';

function AdvancedComponent() {
  const [value, setValue] = useState('');

  return (
    <SmartInput
      value={value}
      onChange={setValue}
      placeholder="Tapez votre message..."
      enableCorrection={true}
      enableSuggestions={true}
      enableReformulations={true}  // 🆕 Activer reformulations IA
      allowEmpty={true}              // 🆕 Permettre saisie vide
      darkMode={true}
      multiline={true}
    />
  );
}
```

## Corrections Automatiques

### Dictionnaire de corrections courantes

Le système corrige automatiquement :

#### Erreurs de frappe françaises
- `bienvenu` → `bienvenue`
- `dévelopement` → `développement`
- `environement` → `environnement`
- `language` → `langage`
- `connection` → `connexion`
- `programation` → `programmation`

#### Expressions courantes
- `comment sa va` → `comment ça va`
- `sa va` → `ça va`
- `a` (devant verbe infinitif) → `à`

#### Abréviations
- `stp` → `s'il te plaît`
- `svp` → `s'il vous plaît`
- `pk` → `pourquoi`
- `pr` → `pour`
- `dc` → `donc`

### Patterns de correction

Le système détecte également des patterns d'erreurs :

1. **"sa" au lieu de "ça"** : `sa va` → `ça va`
2. **"a" au lieu de "à"** devant verbe infinitif : `a faire` → `à faire`
3. **Doubles espaces** : `mot  mot` → `mot mot`

## Suggestions Intelligentes

### Types de suggestions

1. **Corrections** : Suggestions pour corriger une erreur détectée
   - Icône: ✅ (CheckCircle)
   - Couleur: Vert
   - Confiance: 0.7 - 1.0

2. **Complétions** : Suggestions pour compléter une phrase
   - Icône: 💡 (Lightbulb)
   - Couleur: Jaune
   - Confiance: 0.8

3. **Reformulations IA** : Suggestions IA pour reformuler le texte (✨ NOUVEAU)
   - Icône: ✨ (Sparkles)
   - Couleur: Violet
   - Confiance: 0.85
   - Requiert: API OpenAI configurée
   - Minimum 10 caractères de texte

### Suggestions contextuelles (enrichies)

Basées sur les débuts de phrase :

- **"comment"** → Questions sur fonctionnalités, organisation, export
- **"où"** → Questions sur emplacement, corbeille, données
- **"pourquoi"** → Questions sur erreurs, accès, sauvegarde
- **"peux-tu"** → Demandes d'aide, exemples, explications
- **"je veux"** → Actions (créer, modifier, partager, changer mot de passe)
- **"aide-moi"** 🆕 → Demandes d'assistance sur organisation et problèmes
- **"montre-moi"** 🆕 → Demandes de visualisation (statistiques, historique)
- **"qu'est-ce que"** 🆕 → Questions de définition (mode sombre, synchronisation)
- **"j'ai besoin"** 🆕 → Besoins spécifiques (configuration, récupération, export)

### Reformulations IA

Les reformulations IA utilisent GPT-3.5-turbo pour proposer des variantes plus claires et naturelles du texte saisi.

**Fonctionnement :**
1. Texte minimum : 10 caractères
2. Délai : 300ms après la dernière frappe (debounce)
3. API : OpenAI Chat Completions
4. Modèle : gpt-3.5-turbo
5. Résultat : 2-3 reformulations différentes

**Exemple :**
```
Texte original : "besoin aide pr configurer compte"
Reformulations :
  ✨ "J'ai besoin d'aide pour configurer mon compte"
  ✨ "Pouvez-vous m'aider à configurer mon compte ?"
  ✨ "Je souhaite de l'aide pour la configuration de mon compte"
```

**Configuration requise :**
```typescript
// Dans .env
VITE_OPENAI_API_KEY=sk-...

// Ou dans le code
<SmartInput
  enableReformulations={true}
  aiApiKey="sk-..."
/>
```

## Intégration dans les modules

### Noteo IA (AIChat)

**Fichier:** `/src/components/ai/AIChat.tsx`

```typescript
// Initialisation du hook
const {
  suggestions,
  isAnalyzing,
  applyAutoCorrections,
  analyzeLater,
  applySuggestion,
  clearSuggestions,
} = useTextCorrection({
  enableAutoCorrect: true,
  enableSuggestions: true,
  minConfidence: 0.7,
  debounceMs: 300,
});

// Dans le onChange du textarea
onChange={(e) => {
  const rawValue = e.target.value;
  const correctedValue = applyAutoCorrections(rawValue);
  setInputValue(correctedValue);
  analyzeLater(correctedValue);
}}
```

### Noteo Chat (OrchestratorExample)

**Fichier:** `/src/components/examples/OrchestratorExample.tsx`

Utilise le même pattern avec un hook dédié pour chaque input.

### Noteo Aide (OrchestratorExample)

**Fichier:** `/src/components/examples/OrchestratorExample.tsx`

Utilise le même pattern avec un hook dédié pour l'input d'aide.

## Comportement

### Corrections automatiques

Les corrections de **haute confiance** (≥ 0.9) sont appliquées **automatiquement** lors de la saisie.

### Suggestions manuelles

Les suggestions de **confiance moyenne** (0.7-0.9) sont **proposées** à l'utilisateur via le panneau de suggestions.

### Interactions clavier

- **Entrée** : Envoyer le message et fermer les suggestions
- **Échap** : Fermer le panneau de suggestions
- **Shift + Entrée** : Nouvelle ligne (mode multiline)

## Performance

- **Debounce** : Analyse déclenchée après 300ms d'inactivité
- **Limite de suggestions** : Maximum 3 suggestions affichées simultanément
- **Nettoyage automatique** : Les suggestions sont effacées après application ou envoi du message

## Extensibilité

### Ajouter de nouvelles corrections

Modifier le dictionnaire dans `/src/hooks/useTextCorrection.ts` :

```typescript
const commonCorrections: Record<string, string> = {
  'ton_erreur': 'correction',
  // ...
};
```

### Ajouter de nouveaux patterns

Ajouter un pattern dans la liste :

```typescript
const patterns = [
  {
    regex: /ton_pattern/gi,
    replacement: (match: string) => 'ton_remplacement',
    confidence: 0.95,
  },
  // ...
];
```

### Ajouter des suggestions contextuelles

Modifier l'objet `contextualSuggestions` :

```typescript
const contextualSuggestions: Record<string, string[]> = {
  'ton_déclencheur': [
    'Suggestion 1',
    'Suggestion 2',
  ],
  // ...
};
```

## Tests

Pour tester le système :

1. **Correction automatique** : Tapez `bienvenu` → devrait être corrigé en `bienvenue`
2. **Suggestions** : Tapez `comment` → devrait afficher des suggestions de questions
3. **Confiance** : Tapez `sa va` → devrait proposer `ça va` avec haute confiance
4. **Mode sombre** : Vérifier que le panneau s'adapte au thème

## Limitations actuelles

- Dictionnaire limité au français
- Pas de correction grammaticale avancée
- Pas d'apprentissage automatique (corrections fixes)
- Suggestions limitées aux patterns prédéfinis

## Améliorations futures

1. **IA générative** : Utiliser l'API OpenAI pour des suggestions plus intelligentes
2. **Apprentissage** : Mémoriser les corrections acceptées/refusées par l'utilisateur
3. **Multilingue** : Support d'autres langues
4. **Grammaire** : Détection d'erreurs grammaticales complexes
5. **Personnalisation** : Permettre à l'utilisateur de définir ses propres corrections

## Support

Pour tout problème ou suggestion d'amélioration, veuillez consulter la documentation principale ou contacter l'équipe de développement.
