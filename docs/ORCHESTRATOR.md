# 🎯 Orchestrateur Noteo - Documentation Complète

L'orchestrateur Noteo est un système de routage intelligent qui dirige les requêtes utilisateur vers le bon service IA selon la clé API fournie et l'intention détectée.

## 📋 Table des Matières

- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [API Reference](#api-reference)
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Frontend (React)                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  useNoteoSearch()  useNoteoChat()  useNoteoAide()  │
│         ↓                 ↓               ↓         │
│              useNoteoOrchestrator()                 │
│                        ↓                             │
└────────────────────────┼────────────────────────────┘
                         ↓
┌────────────────────────┼────────────────────────────┐
│         Supabase Edge Function                      │
│         noteo-orchestrator                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Validation de la clé API                        │
│  2. Détection de l'intention (regex)                │
│  3. Vérification clé ↔ intention                    │
│  4. Appel OpenAI avec prompt système approprié      │
│  5. Retour de la réponse                            │
│                                                      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                   OpenAI API                         │
│               gpt-4o-mini (10s timeout)              │
└─────────────────────────────────────────────────────┘
```

---

## Installation

### 1. Prérequis

- Node.js 18+
- Supabase CLI
- 3 clés OpenAI différentes (search, chat, aide)

### 2. Installation Supabase CLI

```bash
npm install -g supabase
```

### 3. Login Supabase

```bash
supabase login
```

---

## Configuration

### 1. Variables d'environnement Supabase

Configurez les 3 clés OpenAI dans votre projet Supabase :

```bash
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-yyy...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-zzz...
```

### 2. Variables d'environnement Frontend

Ajoutez ces variables dans votre `.env` :

```env
VITE_OPENAI_SEARCH_KEY=sk-proj-xxx...
VITE_OPENAI_CHAT_KEY=sk-proj-yyy...
VITE_OPENAI_AIDE_KEY=sk-proj-zzz...
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
```

### 3. Vérification

```bash
# Vérifier que les secrets sont bien configurés
supabase secrets list
```

---

## Utilisation

### Hook `useNoteoSearch` - Recherche Sémantique

```typescript
import { useNoteoSearch } from '@/hooks/useNoteoOrchestrator';

function SearchComponent() {
  const { search, loading, error, lastReply } = useNoteoSearch();

  const handleSearch = async () => {
    const result = await search('Cherche mes notes sur TypeScript', {
      onSuccess: (reply) => {
        console.log('Résultats:', reply);
      },
      onError: (err) => {
        console.error('Erreur:', err);
      },
    });
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={loading}>
        Rechercher
      </button>
      {error && <p className="text-red-600">{error}</p>}
      {lastReply && <p>{lastReply}</p>}
    </div>
  );
}
```

### Hook `useNoteoChat` - Chat Conversationnel

```typescript
import { useNoteoChat } from '@/hooks/useNoteoOrchestrator';

function ChatComponent() {
  const { chat, loading, lastReply } = useNoteoChat();

  const sendMessage = async (message: string) => {
    await chat(message, {
      onSuccess: (reply) => {
        console.log('Réponse:', reply);
      },
    });
  };

  return (
    <div>
      <input
        type="text"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.currentTarget.value);
          }
        }}
      />
      {loading && <p>Chargement...</p>}
      {lastReply && <p>{lastReply}</p>}
    </div>
  );
}
```

### Hook `useNoteoAide` - Aide Guidée

```typescript
import { useNoteoAide } from '@/hooks/useNoteoOrchestrator';

function HelpComponent() {
  const { ask, loading, lastReply } = useNoteoAide();

  const askHelp = async (question: string) => {
    await ask(question, {
      onSuccess: (reply) => {
        console.log('Aide:', reply);
      },
    });
  };

  return (
    <div>
      <button onClick={() => askHelp('Comment créer une note ?')}>
        Demander de l'aide
      </button>
      {loading && <p>Réflexion...</p>}
      {lastReply && <pre>{lastReply}</pre>}
    </div>
  );
}
```

---

## API Reference

### Edge Function Endpoint

```
POST https://[project-ref].supabase.co/functions/v1/noteo-orchestrator
```

### Request Body

```json
{
  "message": "Cherche mes notes sur React",
  "apiKey": "sk-proj-xxx..."
}
```

### Response Success (200)

```json
{
  "reply": "Voici les passages pertinents trouvés dans vos notes..."
}
```

### Response Errors

| Code | Message | Cause |
|------|---------|-------|
| 401 | `Clé inconnue` | La clé API n'est pas reconnue |
| 403 | `Clé non autorisée pour cette intention` | Clé search utilisée pour intention chat, etc. |
| 500 | `Erreur interne` | Timeout OpenAI, erreur parsing, etc. |

---

## Détection d'Intention

L'orchestrateur analyse le message avec des regex pour détecter l'intention :

| Intention | Mots-clés détectés | Clé requise |
|-----------|-------------------|-------------|
| `search` | cherche, trouve, recherche | `OPENAI_SEARCH_KEY` |
| `aide` | aide, comment, tutorial | `OPENAI_AIDE_KEY` |
| `chat` | *(par défaut)* | `OPENAI_CHAT_KEY` |

### Exemples

```typescript
// Intention: search (contient "cherche")
"Cherche mes notes sur TypeScript" → OPENAI_SEARCH_KEY

// Intention: aide (contient "comment")
"Comment créer une nouvelle note ?" → OPENAI_AIDE_KEY

// Intention: chat (aucun mot-clé)
"Bonjour, comment vas-tu ?" → OPENAI_CHAT_KEY
```

---

## Sécurité

### Validation des Clés

1. **Étape 1** : Vérifier que la clé API est reconnue
   - Si non reconnue → 401 "Clé inconnue"

2. **Étape 2** : Détecter l'intention du message
   - Analyse regex pour identifier le type de requête

3. **Étape 3** : Vérifier que la clé correspond à l'intention
   - Si `intention !== service` → 403 "Clé non autorisée"

4. **Étape 4** : Appeler OpenAI avec timeout de 10s
   - En cas d'erreur → 500 "Erreur interne"

### CORS

L'orchestrateur active CORS pour permettre les appels depuis le frontend :

```typescript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'POST, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
```

---

## Tests

### Tests Unitaires (Deno)

```bash
cd supabase/functions/noteo-orchestrator
deno test --allow-net --allow-env test.ts
```

### Test Local

```bash
# 1. Démarrer la fonction localement
supabase functions serve noteo-orchestrator

# 2. Tester avec curl
curl -X POST http://localhost:54321/functions/v1/noteo-orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Cherche React",
    "apiKey": "sk-proj-xxx..."
  }'
```

### Tests d'Intégration Frontend

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrchestratorExample } from '@/components/examples/OrchestratorExample';

test('Recherche avec orchestrateur', async () => {
  render(<OrchestratorExample />);

  const input = screen.getByPlaceholderText(/cherche/i);
  const button = screen.getByText(/rechercher/i);

  fireEvent.change(input, { target: { value: 'Cherche TypeScript' } });
  fireEvent.click(button);

  await waitFor(() => {
    expect(screen.getByText(/résultats/i)).toBeInTheDocument();
  });
});
```

---

## Déploiement

### Déploiement Automatique

```bash
cd supabase/functions/noteo-orchestrator
./deploy.sh
```

### Déploiement Manuel

```bash
# 1. Déployer la fonction
supabase functions deploy noteo-orchestrator

# 2. Configurer les secrets
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-yyy...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-zzz...

# 3. Vérifier le déploiement
supabase functions list
```

### Vérifier les Logs

```bash
# Logs en temps réel
supabase functions logs noteo-orchestrator --follow

# Logs récents
supabase functions logs noteo-orchestrator --tail 100
```

---

## Troubleshooting

### Erreur 401 "Clé inconnue"

**Cause** : La clé API fournie n'est pas reconnue dans l'environnement Supabase.

**Solution** :
```bash
# Vérifier que les clés sont bien configurées
supabase secrets list

# Reconfigurer si nécessaire
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
```

---

### Erreur 403 "Clé non autorisée pour cette intention"

**Cause** : La clé utilisée ne correspond pas à l'intention détectée.

**Exemple** :
- Message : "Cherche React" (intention: search)
- Clé utilisée : `OPENAI_CHAT_KEY`
- Clé attendue : `OPENAI_SEARCH_KEY`

**Solution** :
- Utiliser la bonne clé pour le bon service
- Ou modifier le message pour changer l'intention

---

### Erreur 500 "Erreur interne"

**Causes possibles** :
1. Timeout OpenAI (> 10s)
2. Erreur de parsing JSON
3. Erreur réseau

**Solution** :
```bash
# Vérifier les logs
supabase functions logs noteo-orchestrator --tail 50

# Vérifier que OpenAI API fonctionne
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-xxx..."
```

---

### Clés identiques

**Erreur** : Les 3 clés doivent être différentes.

**Solution** :
```bash
# Créer 3 clés OpenAI différentes
# Une pour search, une pour chat, une pour aide
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-aaa...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-bbb...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-ccc...
```

---

## Roadmap

- [ ] Ajouter un cache Redis pour les réponses fréquentes
- [ ] Implémenter le streaming SSE pour les réponses longues
- [ ] Ajouter un système de rate-limiting par utilisateur
- [ ] Améliorer la détection d'intention avec un modèle ML
- [ ] Ajouter des analytics (temps de réponse, taux de succès)
- [ ] Support multi-langues (EN, FR, ES)

---

## Support

Pour toute question ou problème :
- 📚 Consulter cette documentation
- 🐛 Ouvrir une issue sur GitHub
- 💬 Contacter l'équipe de développement

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-01-09
