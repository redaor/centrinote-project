# ✅ Check-list de Test OAuth Zoom - Centrinote

## Pré-requis avant tests
- [ ] Variable `VITE_N8N_WEBHOOK_URL` ajoutée sur Netlify
- [ ] Secret Supabase configuré : `supabase secrets set N8N_ZOOM_OAUTH_WEBHOOK=...`
- [ ] Schema DB appliqué : `zoom_tokens` avec RLS
- [ ] Deploy effectué avec les derniers changements

## Tests fonctionnels

### 1. Redirection OAuth (même onglet)
- [ ] Clic sur "Connecter à Zoom" → URL contient `state` et `redirect_uri=https://centrinote.fr/zoom/callback`
- [ ] Redirection s'effectue dans le même onglet (pas de nouvel onglet)
- [ ] State généré visible dans console : `🔐 State généré: xxx`
- [ ] SessionStorage + cookies contiennent `zoom_oauth_state`

### 2. Callback et validation state
- [ ] Retour sur `/zoom/callback` → page de traitement s'affiche
- [ ] Logs console montrent : `📝 Paramètres OAuth reçus` avec `code` et `state`
- [ ] Validation state OK : `✅ Validation du state réussie`
- [ ] Fallback cookies fonctionne si sessionStorage vide

### 3. Appel Edge Function
- [ ] DevTools > Network : POST vers `/functions/v1/zoom-n8n-proxy` visible
- [ ] Headers corrects : `apikey` + `Authorization: Bearer`
- [ ] Body contient : `action: 'oauth_callback'`, `code`, `state`, `user_id`
- [ ] Response status 200 avec `{ success: true }`

### 4. État UI final
- [ ] UI SimpleZoomAuth passe à "✅ Connecté"
- [ ] Table `zoom_tokens` contient les tokens de l'utilisateur
- [ ] Expiration token visible dans l'interface
- [ ] Boutons "Actualiser" et "Déconnecter" fonctionnels

## Logs à surveiller

### Console Frontend
```
🚀 Début connexion Zoom pour utilisateur: xxx
🔐 State généré: xxx
📍 Redirect URI: https://centrinote.fr/zoom/callback
📝 Paramètres OAuth reçus: { code: xxx, state: xxx }
✅ Validation du state réussie
🚀 Envoi vers Edge Function pour user_id: xxx
📡 Response status: 200 OK
✅ Connexion Zoom réussie !
```

### Edge Function (Supabase Logs)
```
🔄 Proxy N8N - Requête reçue
📝 Données reçues par le proxy: { action: 'oauth_callback', user_id: xxx, code: xxx, state: xxx }
✅ Validation OAuth réussie - tous les paramètres présents
🚀 Relais vers N8N: https://n8n.srv886297.hstgr.cloud/webhook/...
✅ Réponse reçue de N8N: { success: true, hasTokenInfo: true }
```

## Vérifications DB

### Requête test RLS
```sql
-- En tant qu'utilisateur connecté
SELECT user_id, expires_at, created_at 
FROM public.zoom_tokens 
WHERE user_id = auth.uid();
```

### Fonction utilitaire
```sql
-- Vérifier si l'utilisateur a un token valide
SELECT user_has_valid_zoom_token();
```

## Débogage erreurs courantes

| Erreur | Cause possible | Solution |
|--------|---------------|----------|
| "State manquant" | sessionStorage vide | Vérifier fallback cookies |
| "State invalide" | Corruption du state | Régénérer un nouveau state |
| Edge Function 500 | Secret N8N manquant | `supabase secrets set N8N_ZOOM_OAUTH_WEBHOOK=...` |
| N8N timeout | Webhook URL incorrecte | Vérifier l'URL de production n8n |
| RLS error | Utilisateur non connecté | Vérifier `auth.uid()` |
| CSP error | Domaine bloqué | Ajouter domaine dans netlify.toml |

## URLs importantes
- **OAuth Zoom** : https://zoom.us/oauth/authorize
- **Callback** : https://centrinote.fr/zoom/callback  
- **Edge Function** : https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/zoom-n8n-proxy
- **N8N Webhook** : https://n8n.srv886297.hstgr.cloud/webhook/...

## Commandes utiles
```bash
# Voir logs Edge Function temps réel
supabase functions logs zoom-n8n-proxy --follow

# Vérifier secrets
supabase secrets list

# Test direct Edge Function
curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/zoom-n8n-proxy \
  -H "Content-Type: application/json" \
  -H "apikey: ..." \
  -d '{"action":"test"}'
```