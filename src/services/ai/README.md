# CentrinoteAI SDK

SDK d'intégration de l'IA générative pour Centrinote selon le cahier des charges.

## Architecture

### Composants Principaux

1. **CentrinoteAI** - SDK client principal
2. **AIEngine** - Moteur IA hybride avec OpenAI GPT API
3. **ContextManager** - Gestionnaire de contexte intelligent (50k+ tokens)
4. **SecurityValidator** - Validateur de sécurité multi-couches
5. **CodeValidator** - Validateur de code (syntaxe, sémantique)

## Installation

Le SDK est déjà intégré dans Centrinote. Pour l'utiliser :

```typescript
import { CentrinoteAI } from '../services/ai';

const ai = new CentrinoteAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  context: 'typescript-react',
  securityLevel: 'high'
});
```

## Configuration

### Variables d'environnement

```env
VITE_OPENAI_API_KEY=sk-... # Clé API OpenAI
```

## Utilisation

### Génération de fonction

```typescript
const result = await ai.generateFunction({
  description: 'Créer une fonction de validation email',
  parameters: [{ name: 'email', type: 'string' }],
  returnType: 'boolean',
  includeTests: true
});

if (result.isValid && result.securityScore > 0.95) {
  console.log('Code généré:', result.code);
  console.log('Tests générés:', result.tests);
}
```

### Complétion intelligente

```typescript
const result = await ai.complete({
  prefix: 'function validateEmail(email: string): ',
  maxTokens: 100
});

console.log('Suggestion:', result.suggestion);
```

### Analyse de code

```typescript
const analysis = await ai.analyzeCode(code);
console.log('Bugs:', analysis.bugs);
console.log('Optimisations:', analysis.optimizations);
console.log('Complexité:', analysis.complexity);
```

### Contexte

```typescript
// Ajouter au contexte
ai.addToContext({
  type: 'function',
  name: 'validateEmail',
  content: codeString,
  metadata: { file: 'utils/validation.ts' }
});

// Rechercher dans le contexte
const results = ai.searchContext('validation email');

// Récupérer le contexte formaté
const context = ai.getContext(10000); // 10k tokens
```

## Sécurité

Le SDK valide automatiquement le code généré contre :
- XSS (cible: >95% réussite)
- Log Injection (cible: >95% réussite)
- SQL Injection
- Code Injection

## Performance

- Complétions: 1-3 secondes (GPT-4o-mini)
- Générations: < 5 secondes
- Analyses: < 5 secondes

*Note: Les temps peuvent varier selon la charge de l'API OpenAI et la complexité de la requête.*

## Intégration React

Utilisez le hook `useCentrinoteAI` :

```typescript
import { useCentrinoteAI } from '../hooks/useCentrinoteAI';

function MyComponent() {
  const { generateFunction, isLoading, error } = useCentrinoteAI();
  
  const handleGenerate = async () => {
    const result = await generateFunction({
      description: 'Créer une fonction de validation'
    });
    console.log(result.code);
  };
  
  return (
    <button onClick={handleGenerate} disabled={isLoading}>
      Générer
    </button>
  );
}
```

## Composants UI

### AIChat

Composant de chat complet avec support pour :
- Génération de code
- Analyse de code
- Complétion intelligente

```typescript
import { AIChat } from '../components/ai/AIChat';

<AIChat />
```

## Tests

Les tests peuvent être générés automatiquement lors de la génération de fonctions avec `includeTests: true`.

## Roadmap

- [x] Phase 1: Fondations
- [x] Phase 2: Fonctionnalités Core
- [ ] Phase 3: Optimisation
- [ ] Phase 4: Production

## Support

Pour toute question ou problème, consultez le cahier des charges ou contactez l'équipe de développement.

