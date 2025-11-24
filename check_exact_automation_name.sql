-- Vérifier le nom exact de l'automatisation weekly-summary
SELECT
  id,
  name,
  LENGTH(name) as name_length,
  '"' || name || '"' as name_quoted,
  encode(name::bytea, 'hex') as name_hex,
  is_active,
  user_id
FROM automations
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND name LIKE '%weekly%'
ORDER BY created_at DESC;
