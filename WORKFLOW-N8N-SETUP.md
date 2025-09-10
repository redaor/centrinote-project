# 🔧 Configuration Workflows n8n - Vérification Email par Liens

## 📋 Workflows à créer dans n8n

### 1. **Workflow "Send Verification Link"**

**Endpoint:** `POST /webhook/send-verification-link`

#### Nœuds à configurer :

```json
{
  "meta": {
    "name": "Email-Verification-Links-Send",
    "active": true,
    "tags": ["email", "verification", "centrinote"]
  },
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "send-verification-link",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Generate Token",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const crypto = require('crypto');\nconst webhookData = $input.first().json.body;\n\nconst token = crypto.randomBytes(32).toString('hex');\nconst expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);\nconst domain = webhookData.domain || 'https://centrinote.fr';\n\nconst verificationLink = `${domain}/verify-email?token=${token}&email=${encodeURIComponent(webhookData.email)}`;\n\nreturn [{\n  json: {\n    email: webhookData.email,\n    user_id: webhookData.user_id,\n    verification_token: token,\n    verification_link: verificationLink,\n    expires_at: expiresAt.toISOString(),\n    action: webhookData.action || 'signup',\n    timestamp: webhookData.timestamp\n  }\n}];"
      }
    },
    {
      "name": "Store Token",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "table": "email_verifications",
        "data": {
          "email": "={{ $json.email }}",
          "user_id": "={{ $json.user_id }}",
          "verification_token": "={{ $json.verification_token }}",
          "expires_at": "={{ $json.expires_at }}",
          "verified": false,
          "action": "={{ $json.action }}"
        }
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.gmail",
      "parameters": {
        "operation": "send",
        "to": "={{ $json.email }}",
        "subject": "Confirmez votre email - Centrinote",
        "message": "<!DOCTYPE html><html><head><style>.btn{background:#667eea;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;font-weight:bold}</style></head><body><div style=\"max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif\"><h1 style=\"color:#333;text-align:center\">Confirmez votre email</h1><p>Bonjour,</p><p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email :</p><div style=\"text-align:center\"><a href=\"{{ $json.verification_link }}\" class=\"btn\">Confirmer mon email</a></div><p><small style=\"color:#666\">Ce lien expire dans 24 heures.</small></p><p>Si vous n'avez pas créé de compte Centrinote, ignorez cet email.</p><hr><p style=\"color:#666;font-size:12px\">© 2024 Centrinote - Plateforme de gestion des connaissances</p></div></body></html>"
      }
    },
    {
      "name": "Success Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "{\n  \"success\": true,\n  \"message\": \"Email de vérification envoyé avec succès !\",\n  \"email\": \"{{ $json.email }}\",\n  \"action\": \"link_sent\"\n}",
        "responseContentType": "application/json",
        "responseStatusCode": 200
      }
    }
  ]
}
```

### 2. **Workflow "Verify Email Token"**

**Endpoint:** `GET /webhook/verify-email-token`

#### Nœuds à configurer :

```json
{
  "meta": {
    "name": "Email-Verification-Links-Verify",
    "active": true,
    "tags": ["email", "verification", "centrinote"]
  },
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "verify-email-token",
        "httpMethod": "GET",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Extract Parameters",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const query = $input.first().json.query;\nreturn [{\n  json: {\n    token: query.token,\n    email: query.email,\n    timestamp: new Date().toISOString()\n  }\n}];"
      }
    },
    {
      "name": "Lookup Token",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "select",
        "table": "email_verifications",
        "filters": {
          "email": "={{ $json.email }}",
          "verification_token": "={{ $json.token }}",
          "verified": false
        }
      }
    },
    {
      "name": "Check Valid",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "dateTime": {
            "value1": "={{ $json.expires_at }}",
            "operation": "after",
            "value2": "={{ $json.timestamp }}"
          }
        }
      }
    },
    {
      "name": "Mark Verified",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "table": "email_verifications",
        "filters": {
          "email": "={{ $json.email }}",
          "verification_token": "={{ $json.token }}"
        },
        "data": {
          "verified": true,
          "verified_at": "={{ $now }}"
        }
      }
    },
    {
      "name": "Success HTML Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "<!DOCTYPE html><html><head><title>Email Vérifié - Centrinote</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5}.container{max-width:500px;margin:0 auto;background:white;padding:40px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.success{color:#28a745;font-size:48px;margin-bottom:20px}h1{color:#333;margin:20px 0}p{color:#666;line-height:1.6}.btn{background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:20px}</style></head><body><div class=\"container\"><div class=\"success\">✅</div><h1>Email vérifié avec succès !</h1><p>Votre adresse email a été confirmée.</p><p>Redirection automatique vers votre dashboard...</p><a href=\"https://centrinote.fr/dashboard\" class=\"btn\">Accéder au Dashboard</a></div><script>setTimeout(function(){window.location.href='https://centrinote.fr/dashboard'},3000)</script></body></html>",
        "responseContentType": "text/html",
        "responseStatusCode": 200
      }
    },
    {
      "name": "Error HTML Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "<!DOCTYPE html><html><head><title>Erreur - Centrinote</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5}.container{max-width:500px;margin:0 auto;background:white;padding:40px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.error{color:#dc3545;font-size:48px;margin-bottom:20px}h1{color:#333;margin:20px 0}p{color:#666;line-height:1.6}.btn{background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:20px}</style></head><body><div class=\"container\"><div class=\"error\">❌</div><h1>Lien invalide ou expiré</h1><p>Ce lien de vérification n'est plus valide.</p><p>Veuillez demander un nouveau lien depuis votre compte.</p><a href=\"https://centrinote.fr\" class=\"btn\">Retour à l'accueil</a></div></body></html>",
        "responseContentType": "text/html",
        "responseStatusCode": 404
      }
    }
  ]
}
```

## 🗄️ Table Supabase requise

```sql
-- Table pour stocker les tokens de vérification
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_token text NOT NULL UNIQUE,
  action text DEFAULT 'signup',
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- RLS pour sécurité
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own verification tokens"
  ON email_verifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
```

## ✅ Checklist d'activation

- [ ] Créer les 2 workflows dans n8n
- [ ] Activer les workflows (toggle Production)
- [ ] Configurer l'envoi d'emails (Gmail/SMTP)
- [ ] Créer la table `email_verifications` en Supabase
- [ ] Tester avec `node test-n8n-endpoints.js`
- [ ] Vérifier réception d'emails
- [ ] Tester clic sur lien dans email

## 🔧 Configuration Email

Pour l'envoi d'emails, configurer dans n8n :
- **Gmail API** : Recommandé, OAuth2
- **SMTP** : Alternative avec serveur email
- **SendGrid/Mailgun** : Services tiers professionnels

## 🧪 Tests de validation

Une fois activés, utiliser :
1. `node test-n8n-endpoints.js` - Test automatisé
2. Interface de test sur centrinote.fr (dev uniquement)
3. Test complet inscription → email → clic lien → dashboard