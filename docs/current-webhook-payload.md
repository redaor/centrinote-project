# Payload exact envoyé au webhook N8N

## 🔍 **Analyse du code actuel**

### **1. Dans `aiService.ts` - Préparation du payload**

```typescript
// Ligne 25-28 dans aiService.ts
const payload = {
  iaMessage: userMessage.trim(),
  userId: userId || 'anonymous'
};

// Ligne 30 - Envoi via webhookService
const result = await webhookService.sendWebhookRequest('ai_query', payload);
```

### **2. Dans `webhookService.ts` - Formatage pour N8N**

```typescript
// Lignes 120-130 dans webhookService.ts
const data = action === 'ai_test' ? payload : {
  body: {
    action: payload.action || this.getActionFromType(action),
    userId: payload.userId || 'unknown',
    timestamp: payload.timestamp || new Date().toISOString(),
    ...payload // Spread des données spécifiques (iaMessage, etc.)
  }
};
```

### **3. Mapping de l'action (ligne 280)**

```typescript
// getActionFromType('ai_query') retourne 'ai_query'
const actionMapping: Record<string, string> = {
  // ...
  'ai_query': 'ai_query',
  // ...
};
```

## 📤 **Payload JSON exact envoyé à votre webhook N8N**

Quand vous tapez "Bonjour, comment ça va ?" dans l'interface IA :

```json
{
  "body": {
    "action": "ai_query",
    "userId": "user_id_de_l_utilisateur_connecte",
    "timestamp": "2024-01-27T14:32:00.000Z",
    "iaMessage": "Bonjour, comment ça va ?",
    "userId": "user_id_de_l_utilisateur_connecte"
  }
}
```

## 🔧 **Détails techniques**

### **Headers HTTP envoyés :**
```
Content-Type: application/json
User-Agent: Centrinote-Webhook/1.0
X-Centrinote-Action: ai_query
```

### **URL du webhook :**
```
https://n8n.srv886297.hstgr.cloud/webhook/fb90cf61-7012-43fd-85e8-2cbc0f9282c7
```

### **Méthode HTTP :**
```
POST
```

## 📋 **Structure complète du payload**

```typescript
interface PayloadStructure {
  body: {
    action: string;           // "ai_query"
    userId: string;           // ID de l'utilisateur connecté
    timestamp: string;        // ISO timestamp
    iaMessage: string;        // Le message de l'utilisateur
  }
}
```

## 🎯 **Comment accéder aux données dans N8N**

Dans votre workflow N8N, vous pouvez accéder aux données ainsi :

- **Message utilisateur** : `{{ $json.body.iaMessage }}`
- **ID utilisateur** : `{{ $json.body.userId }}`
- **Action** : `{{ $json.body.action }}`
- **Timestamp** : `{{ $json.body.timestamp }}`

## 🔍 **Logs de debug dans la console**

Quand vous envoyez un message, vous devriez voir ces logs :

```
🚀 Envoi du message à l'IA: Bonjour, comment ça va ?
🔄 Envoi d'une requête webhook N8N (ai_query)...
🔗 URL utilisée: https://n8n.srv886297.hstgr.cloud/webhook/...
Payload formaté pour n8n: {body: {action: "ai_query", userId: "...", ...}}
📊 Réponse webhook reçue: {status: 200, ok: true, responseTime: 1250ms}
```

## ⚠️ **Note importante**

Le champ `userId` apparaît **deux fois** dans le payload actuel :
1. Une fois dans la structure de base
2. Une fois via le spread `...payload`

Cela n'affecte pas le fonctionnement mais pourrait être optimisé.