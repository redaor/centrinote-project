# 🚀 Commandes de Déploiement - OAuth Zoom Fix

## 1. Configurer le secret Supabase Edge Function

```bash
# Remplacer l'URL par votre webhook N8N de production
supabase secrets set N8N_ZOOM_OAUTH_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75
```

## 2. Déployer la nouvelle Edge Function

```bash
# Déployer la fonction exchange-zoom-code
supabase functions deploy exchange-zoom-code

# Vérifier le déploiement
supabase functions list
```

## 3. Tester la Edge Function

```bash
# Test rapide (doit retourner erreur 400 car pas de code)
curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/exchange-zoom-code \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"test": "data"}'
```

## 4. Vérifier les secrets

```bash
# Lister les secrets configurés
supabase secrets list

# Doit montrer N8N_ZOOM_OAUTH_WEBHOOK
```

## 5. Appliquer le schéma DB (si pas déjà fait)

```bash
# Appliquer les migrations
supabase db push

# Ou exécuter directement le SQL
psql -d postgres -f zoom_tokens_schema.sql
```

## 6. Logs temps réel pour debugging

```bash
# Suivre les logs de la nouvelle fonction
supabase functions logs exchange-zoom-code --follow
```

## 7. Vérification complète

Après déploiement, tester le flow complet :

1. ✅ **Frontend** : Clic "Connecter à Zoom"
2. ✅ **OAuth** : Redirection Zoom → `/zoom/callback`
3. ✅ **Edge Function** : Appel vers `exchange-zoom-code`
4. ✅ **N8N** : Réception webhook + insertion DB
5. ✅ **UI** : Affichage "Connecté"

## URLs importantes

- **Nouvelle Edge Function** : `https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/exchange-zoom-code`
- **N8N Webhook** : `https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75`
- **Callback OAuth** : `https://centrinote.fr/zoom/callback`