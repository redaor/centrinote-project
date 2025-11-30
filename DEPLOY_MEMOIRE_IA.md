# 🧠 Déploiement de la Mémoire Persistante pour l'IA

## 📋 Résumé des changements

Cette mise à jour ajoute :
1. **Mémoire persistante** : L'IA se souvient des conversations précédentes
2. **Prompt système optimisé** : Citations claires des sources (notes, vocabulaire, web)
3. **Support arabe** : Détection automatique et réponses en arabe avec ligatures correctes

## 🗄️ 1. Migration SQL

Exécuter la migration dans Supabase :

```sql
-- Fichier: supabase/migrations/20251201_create_chat_memory.sql
```

**Actions :**
1. Aller sur https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/sql/new
2. Copier le contenu de `supabase/migrations/20251201_create_chat_memory.sql`
3. Exécuter le SQL

Cette migration crée :
- Table `chat_memory` avec colonnes : `summary`, `key_topics`, `language`, `mood`
- Index pour performance
- RLS policies pour sécurité

## ⚙️ 2. Edge Function `ai-memory`

**Fichier créé :** `supabase/functions/ai-memory/index.ts`

**Déploiement :**
1. Aller sur https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/functions
2. Cliquer sur "Create a new function"
3. Nom : `ai-memory`
4. Copier le contenu de `supabase/functions/ai-memory/index.ts`
5. Variables d'environnement requises :
   - `OPENAI_API_KEY` (déjà configurée)
   - `SUPABASE_URL` (déjà configurée)
   - `SUPABASE_SERVICE_ROLE_KEY` (déjà configurée)

**Fonctionnalité :**
- Reçoit `session_id`, `messages`, `user_id`
- Génère un résumé + concepts clés + langue via GPT-4o-mini
- Sauvegarde dans `chat_memory` (upsert)

## 🔄 3. Mise à jour `ai-chat`

**Fichier modifié :** `supabase/functions/ai-chat/index.ts`

**Changements :**
1. ✅ Import de `franc` pour détection de langue
2. ✅ Chargement de la mémoire depuis `chat_memory` au début
3. ✅ Détection de langue avec `franc(effectiveQuestion)`
4. ✅ Nouveau prompt système avec :
   - Rôle : assistant Centrinote
   - Instructions de citation (Source : Note, Vocabulaire, Web)
   - Support arabe (réponse forcée en arabe si détecté)
   - Injection de `{memory}`, `{notes}`, `{vocabulaire}`, `{web_results}`
5. ✅ Appel automatique à `ai-memory` toutes les 5 messages

**Déploiement :**
1. Aller sur https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/functions/ai-chat
2. Remplacer le contenu par `supabase/functions/ai-chat/index.ts`
3. Sauvegarder et déployer

## 🎨 4. Frontend (déjà fait)

**Fichier modifié :** `src/hooks/useCentrinoteAI_Edge.ts`

Aucun changement nécessaire côté frontend. L'appel à `ai-memory` est géré automatiquement par `ai-chat`.

## 🧪 5. Tests

### Test 1 : Mémoire persistante
1. Démarrer une conversation : "Bonjour, je m'appelle Reda"
2. Attendre 5 messages
3. Vérifier dans Supabase : `SELECT * FROM chat_memory WHERE user_id = '...'`
4. Vérifier que `summary` contient "Reda"

### Test 2 : Support arabe
1. Envoyer un message en arabe : "مرحبا"
2. Vérifier que la réponse est en arabe avec ligatures correctes
3. Vérifier dans `chat_memory` que `language = 'ara'`

### Test 3 : Citations
1. Demander : "Qu'est-ce que j'ai noté sur React ?"
2. Vérifier que la réponse contient "Source : Note <titre>"
3. Demander : "Qu'est-ce que signifie 'async' ?"
4. Vérifier que la réponse contient "Source : Vocabulaire async"

## 📊 6. Structure de la mémoire

```sql
chat_memory
├── id (UUID)
├── user_id (UUID, FK)
├── session_id (TEXT)
├── summary (TEXT) -- Résumé de la conversation
├── key_topics (TEXT[]) -- ["React", "async", "vocabulaire"]
├── language (TEXT) -- "fr", "ara", "en", etc.
├── mood (TEXT) -- "décontracté", "technique", etc.
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## 🔍 7. Logs et débogage

**Logs à surveiller :**
- `🧠 Mémoire chargée: ...` : Mémoire trouvée pour la session
- `🌐 Langue détectée: ...` : Langue de la question
- `🧠 Mémoire mise à jour pour session: ...` : Mise à jour réussie

**Vérifier la mémoire :**
```sql
SELECT 
  session_id,
  summary,
  key_topics,
  language,
  updated_at
FROM chat_memory
WHERE user_id = 'VOTRE_USER_ID'
ORDER BY updated_at DESC;
```

## ⚠️ 8. Points d'attention

1. **Coût OpenAI** : `ai-memory` utilise GPT-4o-mini (~300 tokens par appel)
2. **Fréquence** : Mémoire mise à jour toutes les 5 messages (configurable dans `ai-chat/index.ts`)
3. **Performance** : La mémoire est chargée à chaque requête (cache possible si besoin)
4. **Langue arabe** : Vérifier que GPT-4o-mini génère bien les ligatures (test manuel requis)

## 🚀 9. Prochaines améliorations possibles

- [ ] Cache de la mémoire en mémoire (Redis)
- [ ] Agrégation de plusieurs sessions
- [ ] Apprentissage des préférences utilisateur
- [ ] Export/import de la mémoire

## ✅ Checklist de déploiement

- [ ] Migration SQL exécutée
- [ ] Edge Function `ai-memory` créée et déployée
- [ ] Edge Function `ai-chat` mise à jour et déployée
- [ ] Test mémoire persistante OK
- [ ] Test support arabe OK
- [ ] Test citations OK
- [ ] Vérification des logs

---

**Date de création :** 2025-01-02  
**Version :** 1.0.0

