-- =====================================================
-- SIMPLIFICATION SYSTÈME AUTOMATISATION - HEURE LOCALE
-- Stocke l'heure locale choisie par l'utilisateur
-- Le cron vérifie toutes les heures si c'est l'heure
-- =====================================================

-- 1. Ajouter colonnes pour heure locale dans automations
DO $$
BEGIN
  -- Ajouter user_local_time (format "HH:mm")
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'user_local_time'
  ) THEN
    ALTER TABLE automations ADD COLUMN user_local_time TEXT DEFAULT '22:00';
    COMMENT ON COLUMN automations.user_local_time IS 'Heure locale choisie par l''utilisateur au format HH:mm (ex: 22:00)';
  END IF;

  -- Ajouter user_timezone (optionnel, pour debug)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'user_timezone'
  ) THEN
    ALTER TABLE automations ADD COLUMN user_timezone TEXT;
    COMMENT ON COLUMN automations.user_timezone IS 'Fuseau horaire IANA de l''utilisateur (ex: Europe/Paris, Africa/Algiers)';
  END IF;
END $$;

-- 2. Ajouter timezone dans profiles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'Europe/Paris';
    COMMENT ON COLUMN profiles.timezone IS 'Fuseau horaire IANA de l''utilisateur';
  END IF;
END $$;

-- 3. Créer index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_automations_user_local_time 
  ON automations(user_local_time) 
  WHERE is_active = true AND user_local_time IS NOT NULL;

-- 4. Fonction helper pour convertir heure locale en UTC
CREATE OR REPLACE FUNCTION local_time_to_utc(
  local_time_str TEXT,  -- Format "HH:mm"
  timezone_str TEXT     -- Format IANA (ex: "Europe/Paris")
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  target_date DATE;
  target_hour INT;
  target_minute INT;
  local_datetime TIMESTAMP;
  utc_datetime TIMESTAMPTZ;
BEGIN
  -- Parser l'heure locale
  target_hour := CAST(SPLIT_PART(local_time_str, ':', 1) AS INT);
  target_minute := CAST(SPLIT_PART(local_time_str, ':', 2) AS INT);
  
  -- Date cible = aujourd'hui dans le fuseau horaire de l'utilisateur
  target_date := CURRENT_DATE;
  
  -- Créer un timestamp local (sans timezone) pour aujourd'hui à l'heure cible
  local_datetime := (target_date || ' ' || 
    LPAD(target_hour::TEXT, 2, '0') || ':' || 
    LPAD(target_minute::TEXT, 2, '0') || ':00')::TIMESTAMP;
  
  -- Convertir en UTC en utilisant le fuseau horaire
  -- On utilise AT TIME ZONE pour interpréter le timestamp local dans le fuseau horaire
  -- puis on le convertit en UTC
  utc_datetime := (local_datetime AT TIME ZONE timezone_str) AT TIME ZONE 'UTC';
  
  -- Si l'heure est déjà passée aujourd'hui, programmer pour demain
  IF utc_datetime <= NOW() THEN
    local_datetime := local_datetime + INTERVAL '1 day';
    utc_datetime := (local_datetime AT TIME ZONE timezone_str) AT TIME ZONE 'UTC';
  END IF;
  
  RETURN utc_datetime;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Commentaires
COMMENT ON FUNCTION local_time_to_utc IS 'Convertit une heure locale (HH:mm) en UTC pour le fuseau horaire donné';

