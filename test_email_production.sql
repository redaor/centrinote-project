-- =====================================================
-- TEST MANUEL D'ENVOI D'EMAIL EN PRODUCTION
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- ⚠️ REMPLACER 'votre-email@test.com' par votre email réel

SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'to', 'votre-email@test.com',  -- ⚠️ REMPLACER ICI
      'subject', '🧪 Test Email Production - Centrinote',
      'body', 'Ceci est un test d''envoi d''email depuis la production Supabase. Si vous recevez ce message, la configuration SMTP est correcte.',
      'html', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">🧪 Test Email Production</h2>
        <p>Ceci est un test d''envoi d''email depuis la production Supabase.</p>
        <p>Si vous recevez ce message, la configuration SMTP est <strong style="color: green;">✅ correcte</strong>.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Centrinote - Test de production</p>
      </div>'
    )
  ) AS request_id;

-- Après exécution, vérifier les logs de la fonction automation-email
-- Edge Functions → automation-email → Logs

