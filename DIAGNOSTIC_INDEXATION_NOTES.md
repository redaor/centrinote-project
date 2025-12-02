# Diagnostic : Pourquoi l'IA ne trouve pas les notes

## 🔍 Problèmes identifiés

1. **L'Edge Function `index-note` n'a pas de logs** → Elle n'est pas appelée
2. **Le trigger SQL ne fonctionne probablement pas** → L'URL ou l'authentification est incorrecte
3. **Les notes ne sont pas indexées** → Pas de chunks dans `note_chunks_embeddings`

## ✅ Étapes de diagnostic

### 1. Vérifier si les notes sont indexées

Exécutez cette requête SQL dans Supabase Dashboard > SQL Editor :

```sql
-- Vérifier si des chunks existent pour vos notes
SELECT 
  n.id as note_id,
  n.title,
  n."userId",
  COUNT(c.id) as chunk_count
FROM notes n
LEFT JOIN note_chunks_embeddings c ON c.note_id = n.id
WHERE n."userId" = 'VOTRE_USER_ID' -- Remplacez par votre user_id
GROUP BY n.id, n.title, n."userId"
ORDER BY n.updated_at DESC;
```

**Si `chunk_count = 0`** → Les notes ne sont pas indexées ❌

### 2. Vérifier si le trigger est actif

```sql
-- Vérifier si le trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_auto_index_note';
```

**Si aucune ligne** → Le trigger n'existe pas ❌

### 3. Tester l'indexation manuellement

Appelez l'Edge Function manuellement pour tester :

```sql
-- Récupérer l'ID d'une note à tester
SELECT id, title, "userId" 
FROM notes 
WHERE "userId" = 'VOTRE_USER_ID'
ORDER BY updated_at DESC
LIMIT 1;
```

Puis testez l'Edge Function via curl ou Postman :

```bash
curl -X POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/index-note \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "UUID_DE_LA_NOTE",
    "user_id": "UUID_DE_L_UTILISATEUR"
  }'
```

**Si ça fonctionne** → Le problème vient du trigger SQL

### 4. Vérifier la configuration du trigger

Le trigger a besoin de l'URL Supabase. Vérifiez :

```sql
-- Vérifier la configuration
SELECT current_setting('app.settings.supabase_url', true) as supabase_url;
```

**Si NULL** → Il faut configurer l'URL

## 🔧 Solutions

### Solution 1 : Configurer l'URL Supabase dans le trigger

Exécutez cette requête SQL (remplacez `YOUR_PROJECT_REF` par votre référence) :

```sql
-- Configurer l'URL Supabase
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
```

**Trouver votre PROJECT_REF :**
- Allez dans Supabase Dashboard > Settings > API
- L'URL est : `https://YOUR_PROJECT_REF.supabase.co`

### Solution 2 : Corriger le trigger pour utiliser l'URL automatiquement

Le trigger actuel essaie de récupérer l'URL depuis les settings, mais ça ne fonctionne peut-être pas. Voici une version améliorée :

```sql
-- Version améliorée du trigger qui utilise l'URL Supabase automatiquement
CREATE OR REPLACE FUNCTION trigger_index_note()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  function_url TEXT;
  project_ref TEXT;
BEGIN
  -- Essayer de récupérer l'URL depuis les settings
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    supabase_url := NULL;
  END;
  
  -- Si pas d'URL configurée, essayer de la déduire depuis SUPABASE_URL (variable d'environnement)
  IF supabase_url IS NULL THEN
    -- Extraire le project_ref depuis SUPABASE_URL si disponible
    -- Format: https://PROJECT_REF.supabase.co
    BEGIN
      SELECT substring(current_setting('app.settings.supabase_url', true) from 'https://([^.]+)\.supabase\.co')
      INTO project_ref;
      
      IF project_ref IS NOT NULL THEN
        supabase_url := 'https://' || project_ref || '.supabase.co';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Si ça ne fonctionne pas, utiliser une valeur par défaut
      -- Vous devez remplacer YOUR_PROJECT_REF par votre vraie référence
      supabase_url := 'https://YOUR_PROJECT_REF.supabase.co';
    END;
  END IF;
  
  -- Construire l'URL de l'Edge Function
  function_url := supabase_url || '/functions/v1/index-note';
  
  -- Appeler l'Edge Function via pg_net (en arrière-plan, non bloquant)
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'note_id', NEW.id,
        'user_id', NEW."userId"
      )
    );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer
    RAISE WARNING 'Erreur lors de l''appel de index-note pour la note %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution 3 : Indexer manuellement les notes existantes

Si le trigger ne fonctionne pas, indexez manuellement via le service frontend :

```typescript
// Dans la console du navigateur ou dans votre code admin
import { indexNote } from './services/noteIndexService';

// Indexer une note spécifique
await indexNote('note-id', 'user-id');

// Ou indexer toutes les notes d'un utilisateur
import { reindexAllNotesForUser } from './services/noteIndexService';
await reindexAllNotesForUser('user-id');
```

### Solution 4 : Vérifier que l'Edge Function est bien déployée

1. Allez dans Supabase Dashboard > Edge Functions
2. Vérifiez que `index-note` apparaît dans la liste
3. Cliquez dessus et vérifiez les logs

Si elle n'existe pas, créez-la avec le code du fichier `CODE_INDEX_NOTE_POUR_SUPABASE.md`

## 🎯 Solution rapide (recommandée)

**Pour tester rapidement sans corriger le trigger :**

1. **Indexez manuellement votre note** via le service frontend ou curl
2. **Vérifiez que les chunks sont créés** dans `note_chunks_embeddings`
3. **Posez à nouveau la question à l'IA**

Si ça fonctionne après l'indexation manuelle, le problème vient du trigger SQL.

## 📊 Requêtes SQL utiles

```sql
-- Voir toutes les notes non indexées
SELECT 
  n.id,
  n.title,
  n."userId",
  COUNT(c.id) as chunk_count
FROM notes n
LEFT JOIN note_chunks_embeddings c ON c.note_id = n.id
GROUP BY n.id, n.title, n."userId"
HAVING COUNT(c.id) = 0
ORDER BY n.updated_at DESC;

-- Voir les erreurs du trigger (dans les logs Supabase)
-- Allez dans Dashboard > Logs > Postgres Logs
-- Cherchez "Erreur lors de l'appel de index-note"

-- Supprimer les chunks d'une note (pour réindexer)
DELETE FROM note_chunks_embeddings WHERE note_id = 'UUID_DE_LA_NOTE';
```

## ✅ Checklist finale

- [ ] L'Edge Function `index-note` est déployée
- [ ] Le secret `OPENAI_API_KEY` est configuré
- [ ] Le trigger SQL existe et est actif
- [ ] L'URL Supabase est configurée dans les settings
- [ ] Les notes sont indexées (chunks dans `note_chunks_embeddings`)
- [ ] La fonction `search_note_chunks` fonctionne
- [ ] L'Edge Function `chat-memory` recherche bien dans les notes

