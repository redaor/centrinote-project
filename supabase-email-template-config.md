# 📧 Configuration Template Email Supabase - Protection contre otp_expired

## 🚨 Problème résolu : L'erreur `otp_expired` dans Supabase

### Causes principales identifiées :
1. **Email prefetch** par Microsoft Defender/Outlook qui "consomment" le lien
2. **Configuration d'expiration** par défaut trop courte (1 heure)
3. **Template email** mal configuré entre Magic Links/OTP
4. **redirectTo** mal configuré dans le frontend

---

## ⚙️ Configuration Supabase Dashboard (URGENT)

### 1. Template Email sécurisé
**Emplacement :** Auth > Email Templates > Confirm signup

```html
<h2>🎉 Confirmez votre inscription à Centrinote</h2>

<p>Bienvenue ! Pour finaliser votre inscription, vous avez deux options :</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Option 1 : Code de confirmation</h3>
  <p>Utilisez ce code dans l'application :</p>
  <div style="font-size: 32px; font-weight: bold; background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center; letter-spacing: 4px; color: #1976d2;">
    {{ .Token }}
  </div>
  <p style="font-size: 12px; color: #666;">Ce code expire dans 24 heures</p>
</div>

<div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Option 2 : Lien de confirmation</h3>
  <p>Ou cliquez directement sur ce bouton :</p>
  <a href="{{ .SiteURL }}/auth/confirm-email?token_hash={{ .TokenHash }}&type=signup" 
     style="display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    ✅ Confirmer mon inscription
  </a>
</div>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

<p style="font-size: 14px; color: #666;">
  Si vous n'avez pas créé de compte sur Centrinote, ignorez cet email.
</p>

<p style="font-size: 12px; color: #999;">
  <strong>Problème technique ?</strong><br>
  Le lien ne fonctionne pas ? Utilisez le code à 6 chiffres ci-dessus dans l'application.
</p>
```

### 2. Paramètres d'expiration
**Emplacement :** Auth > Settings

- **Email OTP Expiration :** `86400` secondes (24 heures - maximum autorisé)
- **SMS OTP Expiration :** `600` secondes (10 minutes)

### 3. URLs de redirection autorisées
**Emplacement :** Auth > URL Configuration

Ajoutez ces URLs dans la liste des redirections autorisées :

```
https://centrinote.fr/auth/confirm-email
https://centrinote.fr/auth/confirm-signup
https://centrinote.fr/**
```

---

## 🔧 Configuration côté code

### Variables d'environnement
```bash
# .env
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_AUTH_CONFIRM_URL=https://centrinote.fr/auth/confirm-email
VITE_AUTH_SIGNUP_URL=https://centrinote.fr/auth/confirm-signup
```

### Utilisation dans le code
```javascript
// Dans authService.js
const { data, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
    data: {
      signup_time: new Date().toISOString(),
      user_agent: navigator.userAgent.substring(0, 100)
    }
  }
});
```

---

## 🛣️ Configuration Netlify

### netlify.toml
```toml
# Redirections d'authentification vers les pages React
[[redirects]]
  from = "/auth/confirm-email"
  to = "/index.html"
  status = 200

[[redirects]]
  from = "/auth/confirm-signup"
  to = "/index.html"
  status = 200
```

### public/_redirects
```
# Redirections d'authentification Supabase
/auth/confirm-email    /index.html   200
/auth/confirm-signup   /index.html   200

# Catch-all pour React Router
/*                     /index.html   200
```

---

## 📋 Checklist de validation

### ✅ Côté Supabase Dashboard
- [ ] Template email mis à jour avec double option (code + lien)
- [ ] Email OTP Expiration configuré à 86400 secondes
- [ ] URLs de redirection ajoutées dans Auth > URL Configuration
- [ ] Test d'envoi d'email depuis le dashboard

### ✅ Côté Code
- [ ] Service `authService.js` créé et configuré
- [ ] Page `ConfirmEmailPage.jsx` créée avec fallback OTP
- [ ] Variables d'environnement mises à jour
- [ ] Redirections Netlify configurées

### ✅ Tests fonctionnels
- [ ] Inscription utilisateur → email reçu
- [ ] Clic sur lien → confirmation automatique
- [ ] Si lien expiré → fallback vers code OTP manuel
- [ ] Code OTP manuel → confirmation réussie
- [ ] Renvoi d'email → nouveau code reçu

---

## 🔍 Debug et monitoring

### Logs à surveiller
```javascript
// Dans la console navigateur
console.log('🔍 Debug Auth State:', {
  hasSession: !!session?.session,
  hasUser: !!user?.user,
  userId: user?.user?.id,
  emailConfirmed: user?.user?.email_confirmed_at
});
```

### Erreurs courantes et solutions
| Erreur | Cause | Solution |
|--------|--------|----------|
| `otp_expired` | Lien préfetch ou expiré | Utiliser le code OTP manuel |
| `invalid_token` | Token malformé | Régénérer un nouveau lien |
| `redirect_url_invalid` | URL non autorisée | Ajouter l'URL dans Supabase Dashboard |
| `rate_limit_exceeded` | Trop de tentatives | Attendre et utiliser le code existant |

---

## 🚀 Déploiement

1. **Mettre à jour le template email** dans Supabase Dashboard
2. **Configurer l'expiration** à 24 heures
3. **Déployer le code** avec les nouveaux composants
4. **Tester le flow complet** avec un vrai email

**Résultat attendu :** Plus d'erreur `otp_expired`, confirmation robuste avec double fallback (lien + code OTP manuel).