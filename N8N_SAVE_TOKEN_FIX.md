# 🔧 Guide N8N - Corriger le node "Save Token to Supabase"

## ❌ Problème identifié
Le node Supabase échoue car il tente d'insérer `created_at` alors que cette colonne a un `DEFAULT NOW()`.

## ✅ Solution : Retirer `created_at` du payload

### 1. Ouvrir le workflow N8N Zoom OAuth

### 2. Localiser le node "Save Token to Supabase" 
- Type : `Supabase`
- Operation : `Insert`
- Table : `zoom_tokens`

### 3. Corriger les champs à insérer

#### ❌ Configuration ACTUELLE (à corriger) :
```json
{
  "user_id": "{{ $node['Webhook'].json.user_id }}",
  "access_token": "{{ $node['Exchange Code for Tokens'].json.access_token }}",
  "refresh_token": "{{ $node['Exchange Code for Tokens'].json.refresh_token }}",
  "expires_at": "{{ $node['Exchange Code for Tokens'].json.expires_at }}",
  "created_at": "{{ new Date().toISOString() }}"  // 🚨 À SUPPRIMER
}
```

#### ✅ Configuration CORRIGÉE :
```json
{
  "user_id": "{{ $node['Webhook'].json.user_id }}",
  "access_token": "{{ $node['Exchange Code for Tokens'].json.access_token }}",
  "refresh_token": "{{ $node['Exchange Code for Tokens'].json.refresh_token }}",
  "expires_at": "{{ $node['Exchange Code for Tokens'].json.expires_at }}"
}
```

### 4. Étapes dans l'interface N8N :

1. **Sélectionner le node "Save Token to Supabase"**
2. **Aller dans l'onglet "Fields to Send"**
3. **Supprimer la ligne `created_at`** entièrement
4. **Garder uniquement :**
   - `user_id`
   - `access_token` 
   - `refresh_token`
   - `expires_at`
5. **Cliquer "Execute Node" pour tester**
6. **Sauvegarder le workflow**

## 🔍 Vérifications supplémentaires

### Vérifier le format de `expires_at`
Le champ doit être au format ISO avec timezone :
```javascript
// Dans le node "Exchange Code for Tokens", s'assurer que expires_at est calculé ainsi :
const expiresAt = new Date(Date.now() + (response.expires_in * 1000)).toISOString();
```

### Vérifier l'URL Supabase
Dans le node Supabase, vérifier :
- **Host** : `https://wjzlicokhxitmeoxkjzv.supabase.co`
- **API Key** : Votre `service_role_key` (pas anon_key)
- **Table** : `zoom_tokens`

### Gestion des erreurs d'insertion
Ajouter une condition après le node Supabase :
```json
{
  "conditions": {
    "boolean": {
      "conditions": [
        {
          "leftValue": "{{ $node['Save Token to Supabase'].json.error }}",
          "rightValue": "",
          "operator": {
            "type": "string",
            "operation": "isEmpty"
          }
        }
      ]
    }
  }
}
```

## 📝 Réponse de succès attendue

Le workflow doit retourner :
```json
{
  "success": true,
  "user_id": "...",
  "token_saved": true,
  "message": "Zoom tokens saved successfully"
}
```

## 🚨 En cas d'erreur persistante

### Vérifier les logs Supabase
```sql
-- Dans l'SQL Editor de Supabase
SELECT * FROM zoom_tokens ORDER BY created_at DESC LIMIT 5;
```

### Tester manuellement l'insertion
```sql
INSERT INTO public.zoom_tokens (user_id, access_token, refresh_token, expires_at)
VALUES (
  'test-user-id',
  'test-access-token', 
  'test-refresh-token',
  NOW() + INTERVAL '1 hour'
);
```

### Vérifier les politiques RLS
```sql
-- S'assurer que service_role peut insérer
SELECT * FROM pg_policies WHERE tablename = 'zoom_tokens';
```

## 🔄 Test complet après correction

1. **Déclencher OAuth** depuis Centrinote
2. **Vérifier les logs N8N** pour voir si l'insertion réussit
3. **Checker la table** `zoom_tokens` dans Supabase
4. **Vérifier l'UI** Centrinote affiche "Connecté"

**Une fois `created_at` supprimé du payload, l'insertion devrait fonctionner !**