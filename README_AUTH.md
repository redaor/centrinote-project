# Documentation Authentification Centrinote

## Vue d'ensemble

Ce document décrit les améliorations apportées au système d'authentification de Centrinote, incluant la détection de comptes inexistants, le workflow de réinitialisation de mot de passe, et la gestion améliorée des erreurs.

## Fonctionnalités

### 1. Détection de compte inexistant

Lors d'une tentative de connexion avec des identifiants invalides, le système vérifie si l'email existe dans la base de données. Si aucun compte n'est trouvé, un message clair est affiché avec une option pour créer un compte.

**Comportement :**
- Erreur `400` + `Invalid login credentials` → Vérification dans la table `profiles`
- Si aucun profil trouvé → Message : "Aucun compte trouvé avec cette adresse."
- Bouton "S'inscrire" pour créer un compte avec l'email pré-rempli

### 2. Réinitialisation de mot de passe

Workflow complet pour la réinitialisation de mot de passe via email.

**Étapes :**
1. L'utilisateur clique sur "Mot de passe oublié ?" dans le formulaire de connexion
2. Une modale s'ouvre pour saisir l'email
3. Un email de réinitialisation est envoyé via `supabase.auth.resetPasswordForEmail()`
4. L'utilisateur clique sur le lien dans l'email
5. Redirection vers `/auth/reset-mot-de-passe`
6. Saisie du nouveau mot de passe (2 fois pour confirmation)
7. Mise à jour via `supabase.auth.updateUser()`
8. Redirection automatique vers la page de connexion

### 3. Gestion des erreurs en français

Tous les messages d'erreur Supabase sont traduits en français avec des messages clairs et actionnables.

**Erreurs gérées :**
- Compte déjà enregistré
- Compte inexistant
- Identifiants invalides
- Email non confirmé
- Limite de taux dépassée
- Mot de passe trop faible
- Email invalide
- Erreurs réseau
- Erreurs serveur

## Configuration

### Variables d'environnement

Aucune nouvelle variable d'environnement n'est requise. Les variables existantes sont utilisées :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### Configuration Supabase

#### 1. URL de redirection

Dans le dashboard Supabase (`Authentication` → `URL Configuration`), ajoutez :

- **Site URL** : `https://centrinote.fr`
- **Redirect URLs** : 
  - `https://centrinote.fr/auth/reset-mot-de-passe`
  - `http://localhost:5173/auth/reset-mot-de-passe` (pour le développement)

#### 2. Email Templates

Les templates d'email par défaut de Supabase sont utilisés. Pour personnaliser :

1. Allez dans `Authentication` → `Email Templates`
2. Sélectionnez `Reset Password`
3. Personnalisez le template (le lien `{{ .ConfirmationURL }}` est automatiquement remplacé)

**Exemple de template :**
```
Bonjour,

Vous avez demandé à réinitialiser votre mot de passe sur Centrinote.

Cliquez sur le lien suivant pour définir un nouveau mot de passe :
{{ .ConfirmationURL }}

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement,
L'équipe Centrinote
```

## Routes

### Routes publiques

- `/auth` - Formulaire de connexion/inscription
- `/auth/reset-mot-de-passe` - Page de réinitialisation du mot de passe (accessible uniquement via le lien email)

### Routes protégées

Aucune nouvelle route protégée n'a été ajoutée.

## Sécurité

### Validation du token de réinitialisation

La page `/auth/reset-mot-de-passe` vérifie automatiquement :

1. **Présence du token** : Vérifie que le token est présent dans l'URL (hash)
2. **Validité de la session** : Vérifie que Supabase a créé une session valide
3. **Type de token** : S'assure que c'est un token de type `recovery`

Si le token est invalide ou expiré, l'utilisateur est redirigé avec un message d'erreur clair.

### Durée de validité

- **Lien de réinitialisation** : 1 heure (configurable dans Supabase)
- **Session de réinitialisation** : Valide uniquement pendant le processus de réinitialisation

### Protection contre les abus

- **Rate limiting** : Géré par Supabase (limite par défaut : 3 emails/heure)
- **Validation côté client** : Longueur minimale du mot de passe (6 caractères)
- **Validation côté serveur** : Supabase valide également les règles de mot de passe

## Fichiers modifiés/créés

### Nouveaux fichiers

- `src/components/auth/ForgotPasswordModal.tsx` - Modale pour demander la réinitialisation
- `src/pages/ResetPasswordPage.tsx` - Page de réinitialisation du mot de passe
- `README_AUTH.md` - Cette documentation

### Fichiers modifiés

- `src/components/AuthForm.tsx` - Ajout détection compte inexistant, lien "Mot de passe oublié", gestion d'erreurs améliorée
- `src/components/routing/AppRouter.tsx` - Ajout route `/auth/reset-mot-de-passe`

## Tests manuels

### Cas de test - Happy Path

#### Test 1 : Connexion réussie
1. Aller sur `/auth`
2. Entrer un email et mot de passe valides
3. ✅ Vérifier la redirection vers `/dashboard`

#### Test 2 : Inscription réussie
1. Aller sur `/auth`
2. Cliquer sur "Créer un nouveau compte"
3. Remplir le formulaire (prénom, nom, email, mot de passe)
4. ✅ Vérifier l'envoi de l'email de confirmation
5. ✅ Vérifier la redirection vers `/email-sent`

#### Test 3 : Réinitialisation de mot de passe réussie
1. Aller sur `/auth`
2. Cliquer sur "Mot de passe oublié ?"
3. Entrer un email valide
4. ✅ Vérifier l'envoi de l'email
5. Cliquer sur le lien dans l'email
6. ✅ Vérifier la redirection vers `/auth/reset-mot-de-passe`
7. Entrer un nouveau mot de passe (2 fois)
8. ✅ Vérifier la mise à jour et la redirection vers `/auth`

### Cas de test - Erreurs

#### Test 4 : Compte inexistant
1. Aller sur `/auth`
2. Entrer un email qui n'existe pas + un mot de passe
3. ✅ Vérifier le message "Aucun compte trouvé avec cette adresse."
4. ✅ Vérifier l'affichage du bouton "S'inscrire"
5. Cliquer sur "S'inscrire"
6. ✅ Vérifier le passage en mode inscription avec l'email pré-rempli

#### Test 5 : Identifiants incorrects
1. Aller sur `/auth`
2. Entrer un email existant + un mauvais mot de passe
3. ✅ Vérifier le message "Email ou mot de passe incorrect"

#### Test 6 : Email non confirmé
1. Créer un compte mais ne pas confirmer l'email
2. Essayer de se connecter
3. ✅ Vérifier le message "Veuillez confirmer votre email..."
4. ✅ Vérifier la proposition de renvoyer l'email

#### Test 7 : Réinitialisation - Token invalide
1. Aller directement sur `/auth/reset-mot-de-passe` sans token
2. ✅ Vérifier le message "Lien invalide ou expiré"
3. ✅ Vérifier le bouton "Retour à la connexion"

#### Test 8 : Réinitialisation - Mots de passe différents
1. Suivre le workflow de réinitialisation jusqu'à la page de saisie
2. Entrer deux mots de passe différents
3. ✅ Vérifier le message "Les mots de passe ne correspondent pas"

#### Test 9 : Réinitialisation - Mot de passe trop court
1. Suivre le workflow de réinitialisation jusqu'à la page de saisie
2. Entrer un mot de passe de moins de 6 caractères
3. ✅ Vérifier le message "Le mot de passe doit contenir au moins 6 caractères"

#### Test 10 : Rate limiting
1. Demander plusieurs réinitialisations rapidement (4+ fois)
2. ✅ Vérifier le message "Trop de tentatives. Veuillez patienter..."

## Dépannage

### L'email de réinitialisation n'arrive pas

1. Vérifier les spams
2. Vérifier que l'email est correct
3. Vérifier les logs Supabase (`Authentication` → `Logs`)
4. Vérifier que l'URL de redirection est bien configurée dans Supabase

### Le lien de réinitialisation ne fonctionne pas

1. Vérifier que le lien n'a pas expiré (1 heure)
2. Vérifier que l'URL de redirection est bien dans la liste autorisée
3. Vérifier les logs du navigateur pour les erreurs
4. Vérifier que le token est bien présent dans l'URL (hash)

### Erreur "Session invalide" lors de la réinitialisation

1. Vérifier que le token n'a pas expiré
2. Vérifier que l'utilisateur n'a pas déjà changé son mot de passe
3. Demander un nouveau lien de réinitialisation

## Support

Pour toute question ou problème, contactez l'équipe de développement ou consultez la documentation Supabase :
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Password Reset Guide](https://supabase.com/docs/guides/auth/auth-password-reset)

