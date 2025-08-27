# 🔧 Configuration Variables d'Environnement - OAuth Zoom

## Variables Netlify (déjà configurées)
```bash
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ZOOM_CLIENT_ID=XjtK5_JvQ7upfjYppAF1tw
VITE_ZOOM_REDIRECT_URI=https://centrinote.fr/zoom/callback
VITE_N8N_WEBHOOK_URL=https://n8n.srv886297.hstgr.cloud/webhook/...
```

## Secret Supabase Edge Function (REQUIS)
```bash
# Commande à exécuter :
supabase secrets set N8N_ZOOM_OAUTH_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75
```

## Variables .env local (développement)
```bash
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ZOOM_CLIENT_ID=XjtK5_JvQ7upfjYppAF1tw
VITE_ZOOM_REDIRECT_URI=https://centrinote.fr/zoom/callback
```