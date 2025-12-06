# 🚀 Déploiement de l'Edge Function chatbot-handler

## Problème CORS

Si vous rencontrez une erreur CORS, c'est probablement parce que l'Edge Function n'est pas encore déployée.

## Étapes de déploiement

### 1. Vérifier que vous êtes dans le bon répertoire

```bash
cd /Users/redasahraoui/Projects/centrinote-project
```

### 2. Déployer l'Edge Function

```bash
supabase functions deploy chatbot-handler
```

### 3. Vérifier les variables d'environnement

Assurez-vous que les variables suivantes sont configurées dans Supabase :

- `OPENAI_API_KEY` - Votre clé API OpenAI
- `SUPABASE_URL` - URL de votre projet Supabase (déjà configuré)
- `SUPABASE_SERVICE_ROLE_KEY` - Clé de service Supabase (déjà configuré)

Pour configurer `OPENAI_API_KEY` :

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Vérifier le déploiement

Après le déploiement, vous devriez voir :
```
Deployed Function chatbot-handler
```

### 5. Tester l'Edge Function

Vous pouvez tester directement avec curl :

```bash
curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/chatbot-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "action": "chat",
    "message": "Bonjour",
    "userId": "test",
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'
```

## Si l'erreur persiste

1. Vérifiez les logs de l'Edge Function dans le dashboard Supabase
2. Vérifiez que la migration `support_tickets` a été appliquée
3. Vérifiez que `OPENAI_API_KEY` est bien configuré

## Commandes utiles

```bash
# Voir les logs de l'Edge Function
supabase functions logs chatbot-handler

# Lister les fonctions déployées
supabase functions list

# Voir les secrets configurés
supabase secrets list
```

