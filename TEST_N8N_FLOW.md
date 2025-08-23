# 🧪 Test du Nouveau Flux N8N - Zoom

## ✅ Changements Effectués

### **Frontend** 
- ✅ `AppLayout.tsx` : Remplacé `ZoomManager` par `ZoomManagerSimple`
- ✅ URLs webhook mises à jour vers : `https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75`
- ✅ Format payload adapté : `{ "action": "create_meeting", "user_id": "...", "meeting_data": {...} }`
- ✅ Logs détaillés ajoutés pour debug

### **N8N Workflow**
- ✅ `zoom-unified-webhook.json` créé pour gérer les 3 actions :
  - `oauth_callback` : Stocker tokens OAuth
  - `create_meeting` : Créer réunion Zoom
  - `refresh_token` : Rafraîchir tokens expirés

## 🔄 Nouveau Flux

```
Frontend → POST https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75
  ↓
N8N reçoit { "action": "create_meeting", "user_id": "...", "meeting_data": {...} }
  ↓ 
N8N → SELECT zoom_tokens WHERE user_id = ...
  ↓
N8N → POST api.zoom.us/v2/users/me/meetings (avec access_token)
  ↓
N8N → INSERT zoom_meetings (...)
  ↓
N8N → Response { "success": true, "meeting": {...} }
  ↓
Frontend reçoit join_url + start_url
```

## 🧪 Tests à Effectuer

### **Test 1 : Vérifier Reception Webhook**
```javascript
// Dans la console navigateur après création réunion, chercher :
🚀 Création réunion Zoom via n8n... 
webhook_url: "https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75"
payload: { action: "create_meeting", user_id: "...", meeting_data: {...} }

📡 Response status: 200 OK
📥 Response JSON: { success: true, meeting: {...} }
```

### **Test 2 : Vérifier N8N Execution**
1. Aller sur https://n8n.srv886297.hstgr.cloud
2. Ouvrir workflow webhook `a27e69d1-9497-4816-adba-3dc85dd83f75`
3. Vérifier dans "Executions" qu'il y a une nouvelle exécution
4. Si pas d'exécution → Webhook pas configuré/activé

### **Test 3 : Vérifier Payload N8N**
Dans l'exécution N8N, vérifier que le nœud "Webhook Unified" reçoit :
```json
{
  "action": "create_meeting",
  "user_id": "uuid-utilisateur",
  "meeting_data": {
    "topic": "Test Meeting",
    "duration": 60,
    "type": 1,
    "settings": { ... }
  }
}
```

### **Test 4 : Test Direct Webhook**
```bash
# Test direct du webhook n8n
curl -X POST https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_meeting",
    "user_id": "test-user-id",
    "meeting_data": {
      "topic": "Test Direct",
      "duration": 30,
      "type": 1
    }
  }'
```

## 🔍 Debug Checklist

### **Si "Failed to fetch" :**
- ✅ Vérifier URL webhook dans console : doit être `webhook/a27e69d1-9497-4816-adba-3dc85dd83f75`
- ✅ Vérifier format payload : doit avoir `"action": "create_meeting"`
- ✅ Tester webhook direct avec curl

### **Si Webhook n8n ne reçoit rien :**
- ❌ Workflow pas activé dans n8n
- ❌ URL webhook incorrecte
- ❌ Problème CORS (mais peu probable avec POST)

### **Si N8N reçoit mais erreur :**
- ❌ Credentials Zoom pas configurés
- ❌ Pas de token en base pour user_id
- ❌ Format payload incorrect

### **Si Création meeting échoue :**
- ❌ Token expiré et refresh échoue
- ❌ User Zoom n'existe pas
- ❌ Permissions Zoom insuffisantes

## 🎯 Résultat Attendu

Après les modifications, quand vous créez une réunion dans Centrinote :

1. **Console navigateur** : Logs détaillés du fetch vers n8n
2. **N8N Interface** : Nouvelle exécution visible avec payload reçu
3. **Supabase zoom_meetings** : Nouvelle ligne avec meeting créé
4. **Interface Centrinote** : join_url et start_url affichés

## 🚨 Point Critique

Le **workflow n8n** doit être **importé et activé** pour que le webhook fonctionne :

1. Aller dans n8n → Import → `zoom-unified-webhook.json`
2. Configurer credentials `zoom-oauth-credentials` et `supabase-db`
3. **Activer** le workflow
4. Vérifier que l'URL webhook correspond bien

Sans ça, le webhook retournera 404 et n8n ne recevra rien.