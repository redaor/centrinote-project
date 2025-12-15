# Guide des Reformulations IA

## Vue d'ensemble

Les reformulations IA utilisent l'API OpenAI (GPT-3.5-turbo) pour proposer des variantes plus naturelles et professionnelles du texte saisi par l'utilisateur.

## Activation

### 1. Configuration de l'API

Ajoutez votre clé API OpenAI dans `.env` :

```bash
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 2. Utilisation dans un composant

```typescript
import { useTextCorrection } from '@/hooks/useTextCorrection';

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
  enableReformulations: true, // ✨ Activer les reformulations IA
  minConfidence: 0.7,
  debounceMs: 300,
});

// Vérifier si l'IA est disponible
console.log('IA disponible:', aiAvailable);
```

### 3. Utilisation avec SmartInput

```typescript
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
      enableReformulations={true} // ✨ Activer reformulations IA
      darkMode={false}
      multiline={true}
    />
  );
}
```

## Fonctionnement

### 1. Déclenchement

Les reformulations IA se déclenchent automatiquement lorsque :
- ✅ `enableReformulations` est `true`
- ✅ L'API OpenAI est configurée (`aiAvailable` = true)
- ✅ Le texte fait au moins 10 caractères
- ✅ L'utilisateur arrête de taper pendant 300ms (debounce)

### 2. Processus

```
Utilisateur tape
    ↓
Debounce 300ms
    ↓
Vérifications (longueur ≥ 10, API disponible)
    ↓
Appel API OpenAI (GPT-3.5-turbo)
    ↓
Parsing des reformulations
    ↓
Affichage dans SuggestionPanel (type: rephrase, icône: ✨)
```

### 3. Résultat

Le système propose 2-3 reformulations différentes, chacune avec :
- **Type** : `rephrase`
- **Icône** : ✨ (Sparkles) violet
- **Confiance** : 85%
- **Action** : Remplace tout le texte par la reformulation choisie

## Exemples de Reformulations

### Exemple 1 : Texte informel

**Entrée utilisateur :**
```
besoin aide pr configurer compte
```

**Reformulations IA proposées :**
```
✨ "J'ai besoin d'aide pour configurer mon compte"
✨ "Pouvez-vous m'aider à configurer mon compte ?"
✨ "Je souhaite de l'aide pour la configuration de mon compte"
```

### Exemple 2 : Question mal formulée

**Entrée utilisateur :**
```
comment je fais pour ajouter note
```

**Reformulations IA proposées :**
```
✨ "Comment puis-je ajouter une note ?"
✨ "Quelle est la procédure pour ajouter une nouvelle note ?"
✨ "Comment créer une nouvelle note ?"
```

### Exemple 3 : Message avec fautes

**Entrée utilisateur :**
```
sa marche pas kan je click sur bouton sauvegarder
```

**Reformulations IA proposées :**
```
✨ "Ça ne fonctionne pas quand je clique sur le bouton sauvegarder"
✨ "Le bouton sauvegarder ne répond pas lorsque je clique dessus"
✨ "J'ai un problème avec le bouton sauvegarder, il ne fonctionne pas"
```

## Gestion des Erreurs

### Pas d'API configurée

```typescript
const { aiAvailable } = useTextCorrection({
  enableReformulations: true,
});

if (!aiAvailable) {
  console.warn('API OpenAI non configurée');
  // Les reformulations ne seront pas proposées
  // Les autres fonctionnalités (corrections, complétions) restent actives
}
```

### Texte trop court

Les reformulations ne se déclenchent que pour les textes de 10+ caractères :

```typescript
"salut"       // ❌ Trop court (6 caractères)
"comment ça"  // ❌ Trop court (9 caractères)
"comment ça va" // ✅ OK (14 caractères)
```

### Erreur API

Si l'API échoue :
- Aucune reformulation n'est proposée
- Les corrections et complétions locales restent actives
- Erreur loguée dans la console

```typescript
// Dans useTextCorrection.ts
try {
  const reformulations = await generateAIReformulations(text);
  allSuggestions.push(...reformulations);
} catch (error) {
  console.error('Erreur reformulations IA:', error);
  // Continuer sans reformulations
}
```

## Optimisations

### 1. Debounce

Les reformulations utilisent un debounce de 300ms pour éviter trop d'appels API :

```typescript
// L'utilisateur tape rapidement
"commen" → "comment" → "comment ça" → "comment ça va"
              ↓
        Attente 300ms
              ↓
        1 seul appel API pour "comment ça va"
```

### 2. Cache (Non implémenté)

Pour optimiser davantage, vous pourriez ajouter un cache :

```typescript
const reformulationCache = new Map<string, Suggestion[]>();

const generateAIReformulations = async (text: string) => {
  // Vérifier le cache
  if (reformulationCache.has(text)) {
    return reformulationCache.get(text)!;
  }

  // Appeler l'API
  const reformulations = await fetchFromAPI(text);

  // Mettre en cache
  reformulationCache.set(text, reformulations);

  return reformulations;
};
```

### 3. Limitation de taux

Pour éviter les dépassements de quota OpenAI :

```typescript
let lastAPICall = 0;
const MIN_INTERVAL = 1000; // 1 seconde minimum entre appels

const generateAIReformulations = async (text: string) => {
  const now = Date.now();
  if (now - lastAPICall < MIN_INTERVAL) {
    return []; // Trop tôt, attendre
  }

  lastAPICall = now;
  // Continuer avec l'appel API...
};
```

## Modules supportés

Les reformulations IA sont disponibles dans :

- ✅ **Noteo IA** (AIChat) - Via hook direct
- ✅ **Noteo Chat** (OrchestratorExample) - Via SmartInput
- ✅ **Noteo Aide** (OrchestratorExample) - Via SmartInput
- ✅ **Notes** (NotesManager) - Via hook direct
- ✅ **Vocabulaire** (VocabularyNotebook) - Via hook direct

Pour activer dans d'autres modules, utilisez soit :
- Le hook `useTextCorrection` avec `enableReformulations: true`
- Le composant `SmartInput` avec `enableReformulations={true}`

## Coûts et Limites

### Coûts OpenAI (GPT-3.5-turbo)

- **Modèle** : gpt-3.5-turbo
- **Coût** : ~$0.0015 / 1000 tokens (Input) + ~$0.002 / 1000 tokens (Output)
- **Tokens moyens par reformulation** : 50-100 tokens
- **Coût estimé par reformulation** : $0.0001 - $0.0003 (~0.01-0.03 cts)

### Limites OpenAI

- **Taux** : 3500 requêtes/min (tier 1)
- **Tokens/min** : 90000 tokens/min
- **Tokens/jour** : Illimité (selon plan)

Avec le debounce de 300ms, le système ne peut faire que ~3 requêtes/seconde maximum,
bien en dessous des limites OpenAI.

## Sécurité

### Protection de la clé API

❌ **Ne JAMAIS** exposer la clé API dans le code client :

```typescript
// ❌ MAUVAIS
const apiKey = "sk-proj-xxxxxxxxxx"; // Visible dans le code source !

// ✅ BON
const apiKey = import.meta.env.VITE_OPENAI_API_KEY; // Variable d'environnement
```

### Validation des reformulations

Le système nettoie automatiquement les reformulations :

```typescript
const reformulations = reformulationsText
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.match(/^\d+[\.\)]/)) // Ignorer numéros
  .filter(line => line.length > 10) // Minimum 10 caractères
  .slice(0, 3) // Maximum 3 reformulations
  .map(r => r.replace(/^["\-•]\s*/, '').replace(/["']$/, '')); // Nettoyer guillemets
```

## Désactivation

Pour désactiver temporairement les reformulations sans retirer le code :

```typescript
// Option 1 : Dans le hook
const { ... } = useTextCorrection({
  enableReformulations: false, // Désactiver
});

// Option 2 : Retirer la clé API
// .env
# VITE_OPENAI_API_KEY=sk-... (commenté)

// Option 3 : Dans SmartInput
<SmartInput
  enableReformulations={false} // Désactiver
/>
```

## Troubleshooting

### "IA non disponible" (aiAvailable = false)

**Causes possibles :**
1. Clé API non configurée dans `.env`
2. Clé API invalide
3. Variable d'environnement non chargée (redémarrer le serveur)

**Solution :**
```bash
# 1. Vérifier le fichier .env
cat .env | grep VITE_OPENAI_API_KEY

# 2. Vérifier que la clé commence par sk-
# 3. Redémarrer le serveur de dev
npm run dev
```

### Pas de reformulations proposées

**Causes possibles :**
1. Texte trop court (< 10 caractères)
2. API désactivée (`enableReformulations: false`)
3. Erreur API (vérifier console)

**Solution :**
```typescript
// Activer les logs
const generateAIReformulations = async (text: string) => {
  console.log('Reformulations IA - Texte:', text.length, 'caractères');
  console.log('Reformulations IA - Activé:', enableReformulations);
  console.log('Reformulations IA - API disponible:', aiAvailable);
  // ...
};
```

### Reformulations de mauvaise qualité

**Causes possibles :**
1. Prompt système trop vague
2. Température trop élevée (créativité excessive)

**Solution :**
Ajuster le prompt dans `useTextCorrection.ts` :

```typescript
{
  role: 'system',
  content: 'Tu es un assistant qui aide à reformuler des textes en français pour les rendre plus clairs, professionnels et naturels. Propose 2-3 reformulations différentes, chacune sur une nouvelle ligne. Garde le même sens mais améliore la formulation.',
}
```

Ou ajuster la température :

```typescript
{
  model: 'gpt-3.5-turbo',
  temperature: 0.5, // Plus conservateur (était 0.7)
  // ...
}
```

## Roadmap

Fonctionnalités futures possibles :

- [ ] Cache local des reformulations
- [ ] Limitation de taux personnalisable
- [ ] Support multilingue (EN, ES, etc.)
- [ ] Reformulations par niveau de formalité (casual, pro, académique)
- [ ] Reformulations par longueur (court, moyen, long)
- [ ] Statistiques d'utilisation (compteur de reformulations)
- [ ] Fallback vers modèles locaux (offline)
