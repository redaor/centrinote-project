# 🏓 Mise à jour Workflow N8N - Gestion du Ping

## 🎯 Objectif
Ajouter une branche ping au workflow OAuth Zoom pour permettre les tests de connectivité depuis l'interface Centrinote.

## 🔧 Modification à apporter

### 1. **Au début du workflow** (premier node après Webhook)

Ajouter un node **IF** avec la condition :

```javascript
// Condition : Si c'est une requête de ping
return (
  $node["Webhook"].json.query?.ping === "1" && 
  $node["Webhook"].json.headers["x-n8n-ping-secret"] === Deno.env.get("N8N_PING_SECRET")
);
```

### 2. **Branche TRUE (Ping)**

Ajouter un node **Respond to Webhook** :
```json
{
  "ok": true,
  "message": "N8N webhook opérationnel",
  "timestamp": "{{ new Date().toISOString() }}"
}
```

### 3. **Branche FALSE (OAuth normal)**

Connecter à votre flux OAuth existant (Exchange Code for Tokens → Save Token to Supabase).

## 📋 Structure visuelle du workflow

```
[Webhook] → [IF: Ping Check]
             ├── TRUE → [Respond: Ping OK]
             └── FALSE → [Exchange Code] → [Save Token] → [Respond: OAuth Success]
```

## 🔐 Sécurité

Le header `x-n8n-ping-secret` doit correspondre à la variable `N8N_PING_SECRET` configurée dans Supabase :

```bash
supabase secrets set N8N_PING_SECRET=your-strong-secret-here
```

## ⚡ Test du ping

Une fois modifié, testez avec :

```bash
curl -X GET "https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75?ping=1" \
  -H "x-n8n-ping-secret: your-strong-secret-here"
```

Réponse attendue :
```json
{
  "ok": true,
  "message": "N8N webhook opérationnel",
  "timestamp": "2025-08-28T..."
}
```

## 🚨 Important : Node "Save Token to Supabase"

Pendant que vous modifiez le workflow, **vérifiez que le node Supabase n'envoie PAS le champ `created_at`** :

**❌ Configuration incorrecte :**
```json
{
  "user_id": "...",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "...",
  "created_at": "..."  // 🚨 À SUPPRIMER
}
```

**✅ Configuration correcte :**
```json
{
  "user_id": "{{ $node['Webhook'].json.user_id }}",
  "access_token": "{{ $node['Exchange Code for Tokens'].json.access_token }}",
  "refresh_token": "{{ $node['Exchange Code for Tokens'].json.refresh_token }}",
  "expires_at": "{{ $node['Exchange Code for Tokens'].json.expires_at }}"
}
```

La colonne `created_at` a un `DEFAULT NOW()` et sera automatiquement remplie par Supabase.

## ✅ Après modification

1. **Sauvegarder** le workflow
2. **Tester le ping** depuis l'interface Centrinote (bouton "Tester la connexion N8N")  
3. **Tester l'OAuth** complet pour vérifier que le flux normal fonctionne toujours
4. **Vérifier les logs** N8N pour s'assurer qu'aucune erreur n'apparaît

Le workflow sera alors capable de gérer à la fois les pings de test ET les callbacks OAuth !