-- Migration pour créer une table de dédoublonnage des emails
-- Objectif: Empêcher l'envoi d'emails en double même si automation-micro-runner est appelé plusieurs fois

-- Table pour tracker les emails envoyés
CREATE TABLE IF NOT EXISTS email_sent_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_to TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- ✅ CONTRAINTE UNIQUE pour empêcher les doublons exacts
  -- Note: sent_at est inclus pour permettre plusieurs emails avec le même sujet à des moments différents
  CONSTRAINT unique_email_dedupe UNIQUE (email_to, email_subject, sent_at)
);

-- ✅ CONTRAINTE UNIQUE supplémentaire pour la fenêtre de dédoublonnage (5 minutes)
-- Cette contrainte garantit qu'on ne peut pas avoir deux emails identiques dans la même seconde
-- (ce qui est suffisant car les appels simultanés arrivent dans la même seconde)

-- Index pour recherche rapide par email et sujet
CREATE INDEX IF NOT EXISTS idx_email_sent_log_to_subject 
ON email_sent_log(email_to, email_subject, sent_at DESC);

-- Index pour recherche rapide par date
CREATE INDEX IF NOT EXISTS idx_email_sent_log_sent_at 
ON email_sent_log(sent_at DESC);

-- Fonction pour vérifier et enregistrer l'envoi d'email (VRAIMENT atomique avec verrou)
CREATE OR REPLACE FUNCTION check_and_log_email_send(
  p_email_to TEXT,
  p_email_subject TEXT,
  p_dedupe_window_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_recent_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_inserted BOOLEAN := FALSE;
BEGIN
  -- Calculer la fenêtre de dédoublonnage
  v_window_start := NOW() - (p_dedupe_window_minutes || ' minutes')::INTERVAL;
  
  -- ✅ VÉRIFICATION ATOMIQUE : Utiliser FOR UPDATE pour verrouiller les lignes
  -- Cela garantit qu'une seule transaction peut vérifier à la fois
  SELECT COUNT(*) INTO v_recent_count
  FROM email_sent_log
  WHERE email_to = p_email_to
    AND email_subject = p_email_subject
    AND sent_at >= v_window_start
  FOR UPDATE; -- ✅ Verrou de ligne pour garantir l'atomicité
  
  -- Si un email a été envoyé récemment, retourner false (ne pas envoyer)
  IF v_recent_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- ✅ INSERTION ATOMIQUE : Insérer avec ON CONFLICT pour éviter les doublons
  -- Le verrou FOR UPDATE garantit qu'on est le seul à insérer à ce moment
  INSERT INTO email_sent_log (email_to, email_subject, sent_at)
  VALUES (p_email_to, p_email_subject, NOW())
  ON CONFLICT DO NOTHING
  RETURNING TRUE INTO v_inserted;
  
  -- Si l'insertion a réussi, retourner true (envoyer l'email)
  -- Si l'insertion a échoué (conflit), retourner false (ne pas envoyer)
  RETURN COALESCE(v_inserted, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciens logs (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_old_email_logs(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM email_sent_log
  WHERE sent_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE email_sent_log IS 'Table de log pour dédoublonnage des emails envoyés';
COMMENT ON FUNCTION check_and_log_email_send IS 'Vérifie si un email a été envoyé récemment et enregistre l''envoi de manière atomique. Retourne TRUE si l''email peut être envoyé, FALSE sinon.';
COMMENT ON FUNCTION cleanup_old_email_logs IS 'Nettoie les logs d''emails plus anciens que X jours. Par défaut: 7 jours.';

