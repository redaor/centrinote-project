# Noteo Orchestrator

Edge Function Supabase pour orchestrer les appels IA selon la clé API fournie.

## Variables d'environnement

Configurez ces variables dans votre projet Supabase :

```bash
OPENAI_SEARCH_KEY=sk-proj-xxx...  # Clé pour la recherche sémantique
OPENAI_CHAT_KEY=sk-proj-yyy...     # Clé pour le chat conversationnel
OPENAI_AIDE_KEY=sk-proj-zzz...     # Clé pour l'aide guidée
```

## Mapping Clé → Service

| Clé API | Service | Prompt Système |
|---------|---------|----------------|
| `OPENAI_SEARCH_KEY` | `search` | Moteur de recherche sémantique |
| `OPENAI_CHAT_KEY` | `chat` | Assistant conversationnel |
| `OPENAI_AIDE_KEY` | `aide` | Guide pas-à-pas |

## Détection d'Intention

L'orchestrateur analyse le message pour détecter l'intention :

- **Recherche** : contient `cherche`, `trouve`, `recherche`
- **Aide** : contient `aide`, `comment`, `tutorial`
- **Chat** : tout le reste

## Sécurité

- ✅ Vérifie que la clé API est valide (401 si inconnue)
- ✅ Vérifie que la clé correspond à l'intention détectée (403 si non autorisée)
- ✅ Timeout de 10 secondes sur les appels OpenAI
- ✅ CORS activé pour les requêtes cross-origin

## Endpoint

```
POST https://[project-ref].supabase.co/functions/v1/noteo-orchestrator
```

### Request

```json
{
  "message": "Cherche mes notes sur React",
  "apiKey": "sk-proj-xxx..."
}
```

### Response (200 OK)

```json
{
  "reply": "Voici les passages pertinents..."
}
```

### Erreurs

| Code | Message | Raison |
|------|---------|--------|
| 401 | `Clé inconnue` | La clé API n'est pas reconnue |
| 403 | `Clé non autorisée pour cette intention` | La clé ne correspond pas à l'intention |
| 500 | `Erreur interne` | Erreur OpenAI, timeout, ou parsing JSON |

## Déploiement

```bash
# Déployer la fonction
supabase functions deploy noteo-orchestrator

# Configurer les secrets
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-yyy...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-zzz...
```

## Test Local

```bash
# Démarrer en local
supabase functions serve noteo-orchestrator

# Tester avec curl
curl -X POST http://localhost:54321/functions/v1/noteo-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"message":"Cherche React","apiKey":"sk-proj-xxx..."}'
```

## Modèle OpenAI

- **Modèle** : `gpt-4o-mini`
- **Timeout** : 10 secondes
- **Messages** : System prompt + User prompt

## Notes

- Pas de gestion de quota/rate-limit (à implémenter côté client si besoin)
- Les 3 clés doivent être différentes pour éviter les conflits de mapping
- Le système de détection d'intention est basique (regex) et peut être amélioré
