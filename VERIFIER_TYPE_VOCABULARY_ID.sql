-- ============================================================================
-- Vérification: Type de la colonne id dans la table vocabulary
-- ============================================================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vocabulary'
  AND column_name = 'id';

-- Vérifier aussi la structure complète de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vocabulary'
ORDER BY ordinal_position;

