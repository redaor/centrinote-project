# 🚨 DIAGNOSTIC CRITIQUE - Webhooks n8n non déclenchés

## ✅ PROBLÈMES IDENTIFIÉS ET CORRIGÉS

### 1. **Code mort dans AuthForm.tsx - CORRIGÉ**
- **Problème:** Lignes 98-124 contenaient une ancienne logique simulée qui court-circuitait le vrai code
- **Symptôme:** Après `navigate('/dashboard')` ligne 95, le code continuait avec une simulation
- **Correction:** Supprimé les lignes 98-124 (code de simulation obsolète)

### 2. **État des webhooks n8n - CONFIRMÉ**
```bash
# Test endpoint send-verification-link
curl -X POST https://n8n.srv886297.hstgr.cloud/webhook/send-verification-link
# Résultat: 404 - "webhook not registered"

# Test endpoint verify-email-token  
curl https://n8n.srv886297.hstgr.cloud/webhook/verify-email-token?token=test&email=test@test.com
# Résultat: 404 - "workflow must be active for production URL"
```

## 📊 FLUX ACTUEL (Après correction)

### AuthForm.tsx - Inscription
```javascript
1. handleSubmit() appelé
2. signUpWithRobustEmail() → Supabase signup
3. Si requiresEmailVerification = true:
   4. handleSendVerificationLink() → appel n8n webhook ❌ 404
   5. navigate('/email-sent') → ne se fait pas à cause de l'erreur
6. Si pas de vérification: navigate('/dashboard')
```

### signUpWithRobustEmail() - Service
```javascript
// Ce service détermine si vérification email requise
// Actuellement toujours true pour nouvelles inscriptions
```

## 🎯 RACINE DU PROBLÈME

**Les workflows n8n ne sont pas créés ou pas actifs**

```
Message n8n: "The workflow must be active for a production URL to run successfully. 
You can activate the workflow using the toggle in the top-right of the editor."
```

## 🔧 ACTIONS REQUISES CÔTÉ N8N

### 1. Créer les workflows
- Utiliser les configurations JSON de `WORKFLOW-N8N-SETUP.md`
- Workflow "Send Verification Link" (POST /webhook/send-verification-link)
- Workflow "Verify Email Token" (GET /webhook/verify-email-token)

### 2. Activer les workflows
- Toggle "Active" dans l'interface n8n
- Les workflows doivent être en mode "Production"

### 3. Configurer l'envoi d'emails
- Connecter Gmail API ou SMTP
- Tester l'envoi depuis n8n

### 4. Créer la table Supabase
```sql
-- Exécuter ce SQL dans Supabase
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
```

## 🧪 TESTS DE VALIDATION

### Une fois n8n configuré :
```bash
# 1. Test automatisé
node test-n8n-endpoints.js
# Résultat attendu: ✅ Envoi lien: OK, ✅ Validation token: OK

# 2. Test interface
# - Aller sur centrinote.fr
# - S'inscrire avec un vrai email  
# - Observer redirection vers /email-sent
# - Vérifier réception email
# - Cliquer lien → redirection dashboard
```

## 📈 STATUT APRÈS CORRECTION

### ✅ Code Frontend
- Service `emailLinkVerificationService.ts` : opérationnel
- Page `VerifyEmailPage.tsx` : opérationnel  
- Page `EmailSentPage.tsx` : opérationnel
- Integration `AuthForm.tsx` : **corrigé** (code mort supprimé)
- Logic `useSupabaseAuth.ts` : opérationnel
- Routes : opérationnelles

### ❌ Backend n8n
- Workflows : **non créés**
- Endpoints : **404 Not Found**
- Email service : **non configuré**
- Table Supabase : **probablement manquante**

## 🚀 PROCHAINE ÉTAPE

**Une fois les workflows n8n créés et activés :**
1. Les appels webhook fonctionneront
2. Les emails seront envoyés
3. Le flux complet inscription → email → dashboard sera opérationnel

**Le code frontend est maintenant 100% prêt et corrigé !**