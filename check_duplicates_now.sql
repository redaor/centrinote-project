-- Vérification rapide des doublons
SELECT 
  user_id,
  name,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as ids
FROM automations
WHERE is_active = true
  AND user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
GROUP BY user_id, name
HAVING COUNT(*) > 1
ORDER BY name;
