/*
  # Correction du type de message_id dans ai_conversations
  
  Le champ message_id était défini comme UUID mais les IDs générés côté client
  sont des strings (welcome-xxx, user-xxx, ai-xxx, error-xxx) qui ne sont pas des UUID valides.
  
  Solution : Changer message_id de UUID vers TEXT
*/

-- Vérifier si la colonne existe et changer son type
DO $$
BEGIN
  -- Vérifier que la table existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations'
  ) THEN
    -- Changer le type de message_id de uuid à text si nécessaire
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_conversations' 
      AND column_name = 'message_id'
      AND data_type = 'uuid'
    ) THEN
      -- Supprimer la valeur par défaut si elle existe (uuid_generate_v4())
      ALTER TABLE public.ai_conversations 
      ALTER COLUMN message_id DROP DEFAULT;
      
      -- Changer le type
      ALTER TABLE public.ai_conversations 
      ALTER COLUMN message_id TYPE text USING message_id::text;
      
      RAISE NOTICE '✅ Type de message_id changé de uuid à text';
    ELSIF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_conversations' 
      AND column_name = 'message_id'
      AND data_type = 'text'
    ) THEN
      RAISE NOTICE 'ℹ️ La colonne message_id a déjà le type text';
    ELSE
      RAISE NOTICE '⚠️ La colonne message_id n''existe pas dans la table ai_conversations';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ La table ai_conversations n''existe pas';
  END IF;
END $$;

-- Vérifier que le changement a été appliqué
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ai_conversations' 
AND column_name = 'message_id';

