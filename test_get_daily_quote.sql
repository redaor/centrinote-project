-- =====================================================
-- Test de la fonction get_today_quote()
-- =====================================================

-- 1. Tester la fonction directement
SELECT get_today_quote('fr', 'motivation') AS citation;

-- 2. Vérifier qu'une citation a été marquée comme utilisée aujourd'hui
SELECT 
  id,
  quote,
  author,
  used_at,
  created_at
FROM daily_quotes
WHERE used_at = CURRENT_DATE
ORDER BY used_at DESC
LIMIT 5;

-- 3. Compter les citations disponibles
SELECT 
  COUNT(*) FILTER (WHERE used_at IS NULL OR used_at < CURRENT_DATE) AS citations_disponibles,
  COUNT(*) FILTER (WHERE used_at = CURRENT_DATE) AS citations_utilisees_aujourdhui,
  COUNT(*) AS total_citations
FROM daily_quotes
WHERE language = 'fr' AND category = 'motivation';

-- 4. Voir toutes les citations
SELECT 
  id,
  LEFT(quote, 50) || '...' AS quote_preview,
  author,
  used_at,
  created_at
FROM daily_quotes
WHERE language = 'fr' AND category = 'motivation'
ORDER BY created_at DESC
LIMIT 10;

