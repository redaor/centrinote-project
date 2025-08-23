# Configuration N8N pour les Webhooks Zoom

## 🎯 URL Webhook configurée
```
https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75
```

## 📋 Étapes de configuration dans N8N

### 1. Créer un nouveau Workflow
- Aller dans N8N : https://n8n.srv886297.hstgr.cloud
- Créer un nouveau workflow
- Nommer le workflow : **"Centrinote - Zoom Webhook Handler"**

### 2. Ajouter le nœud Webhook
1. **Ajouter un nœud "Webhook"**
2. **Configurer le nœud :**
   - **Webhook URLs** → **Production URL** : `a27e69d1-9497-4816-adba-3dc85dd83f75`
   - **HTTP Method** : `POST`
   - **Path** : laisser vide (utilise l'UUID)
   - **Response Mode** : `On Received`
   - **Response Code** : `200`

### 3. Workflow de base pour tester

Voici le JSON du workflow N8N à importer :

```json
{
  "name": "Centrinote - Zoom Webhook Handler",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "a27e69d1-9497-4816-adba-3dc85dd83f75",
        "responseMode": "onReceived",
        "options": {}
      },
      "id": "webhook-node",
      "name": "Zoom Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "a27e69d1-9497-4816-adba-3dc85dd83f75"
    },
    {
      "parameters": {
        "jsCode": "// Log the received webhook data\nconsole.log('📥 Webhook reçu:', JSON.stringify($input.all(), null, 2));\n\n// Extract webhook data\nconst webhookData = $input.all()[0].json;\n\n// Process the webhook\nconst response = {\n  received: true,\n  timestamp: new Date().toISOString(),\n  source: webhookData.source || 'unknown',\n  event: webhookData.event || 'unknown',\n  meetingId: webhookData.meetingId || null,\n  userId: webhookData.userId || null,\n  processedBy: 'n8n-centrinote'\n};\n\nconsole.log('✅ Webhook traité:', response);\n\nreturn { json: response };"
      },
      "id": "process-webhook",
      "name": "Process Webhook",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "zoom-meeting-event",
              "leftValue": "={{ $json.event }}",
              "rightValue": "meeting.started",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            },
            {
              "id": "zoom-meeting-ended",
              "leftValue": "={{ $json.event }}",
              "rightValue": "meeting.ended",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            },
            {
              "id": "zoom-recording",
              "leftValue": "={{ $json.event }}",
              "rightValue": "recording.completed",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "or"
        },
        "options": {}
      },
      "id": "event-switch",
      "name": "Event Switch",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [680, 300]
    },
    {
      "parameters": {
        "jsCode": "// Handle meeting started event\nconst data = $input.all()[0].json;\n\nconsole.log('🟢 Meeting démarré:', data.data?.meeting?.topic || 'Unknown meeting');\n\n// You can add logic here to:\n// - Send notifications\n// - Update databases\n// - Trigger other workflows\n\nreturn {\n  json: {\n    action: 'meeting_started',\n    meeting: data.data?.meeting,\n    processed: true,\n    timestamp: new Date().toISOString()\n  }\n};"
      },
      "id": "handle-meeting-started",
      "name": "Handle Meeting Started",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [900, 200]
    },
    {
      "parameters": {
        "jsCode": "// Handle meeting ended event\nconst data = $input.all()[0].json;\n\nconsole.log('🔴 Meeting terminé:', data.data?.meeting?.topic || 'Unknown meeting');\n\n// You can add logic here to:\n// - Process recordings\n// - Generate summaries\n// - Send final reports\n\nreturn {\n  json: {\n    action: 'meeting_ended',\n    meeting: data.data?.meeting,\n    processed: true,\n    timestamp: new Date().toISOString()\n  }\n};"
      },
      "id": "handle-meeting-ended",
      "name": "Handle Meeting Ended",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [900, 300]
    },
    {
      "parameters": {
        "jsCode": "// Handle recording completed event\nconst data = $input.all()[0].json;\n\nconsole.log('🎬 Enregistrement disponible:', data.data?.meeting?.topic || 'Unknown meeting');\n\n// You can add logic here to:\n// - Download recordings\n// - Process transcriptions\n// - Generate AI summaries\n\nreturn {\n  json: {\n    action: 'recording_completed',\n    meeting: data.data?.meeting,\n    processed: true,\n    timestamp: new Date().toISOString()\n  }\n};"
      },
      "id": "handle-recording",
      "name": "Handle Recording",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [900, 400]
    }
  ],
  "connections": {
    "Zoom Webhook": {
      "main": [
        [
          {
            "node": "Process Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Webhook": {
      "main": [
        [
          {
            "node": "Event Switch",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Event Switch": {
      "main": [
        [
          {
            "node": "Handle Meeting Started",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Handle Meeting Ended",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Handle Recording",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1",
  "meta": {
    "templateCredsSetupCompleted": true
  },
  "id": "zoom-webhook-handler",
  "tags": [
    {
      "createdAt": "2024-08-06T17:56:00.000Z",
      "updatedAt": "2024-08-06T17:56:00.000Z",
      "id": "zoom",
      "name": "zoom"
    },
    {
      "createdAt": "2024-08-06T17:56:00.000Z",
      "updatedAt": "2024-08-06T17:56:00.000Z",
      "id": "centrinote",
      "name": "centrinote"
    }
  ]
}
```

### 4. Activation du workflow

⚠️ **IMPORTANT** : Le workflow doit être **ACTIVÉ** pour recevoir les webhooks.
- Cliquer sur le toggle en haut à droite du workflow
- Le toggle doit être **bleu** (activé)
- Une fois activé, l'URL webhook acceptera les requêtes POST

### 5. Test du webhook

Une fois le workflow activé, vous pouvez tester avec :

#### Test manuel via curl :
```bash
curl -X POST "https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "event": "test_connection",
    "timestamp": "2024-08-06T17:56:00Z",
    "data": {"message": "Test depuis Centrinote"}
  }'
```

#### Test via l'interface Centrinote :
- Utiliser le composant `ZoomWebhookTester`
- Cliquer sur "Test Connection" puis "Send Test Event"

### 6. Monitoring des exécutions

Dans N8N :
- Aller dans **Executions** pour voir les webhooks reçus
- Chaque exécution montre les données reçues et le traitement
- Vérifier les logs pour déboguer les problèmes

### 7. Webhook Zoom vers N8N - Configuration dans Zoom

Pour recevoir les vrais webhooks de Zoom :

1. **Zoom Marketplace** : https://marketplace.zoom.us/
2. **Créer une Webhook App** ou configurer une app existante
3. **Event Subscriptions** :
   - `meeting.started`
   - `meeting.ended` 
   - `meeting.participant_joined`
   - `meeting.participant_left`
   - `recording.completed`

4. **Endpoint URL** : 
   ```
   https://your-supabase-project.functions.supabase.co/zoom-webhook-handler
   ```
   
   *(Cette fonction Supabase redirigera vers N8N)*

### 8. Variables d'environnement Supabase

Configurer dans Supabase Edge Functions :
```env
N8N_ZOOM_WEBHOOK_URL=https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75
```

## 🔧 Dépannage

### Le webhook ne reçoit rien :
- ✅ Vérifier que le workflow est **activé**
- ✅ Vérifier l'URL dans les logs N8N
- ✅ Tester avec curl manuellement
- ✅ Vérifier les permissions CORS si nécessaire

### Erreur 404 :
- ✅ L'UUID dans l'URL doit correspondre exactement
- ✅ Le workflow doit être sauvegardé ET activé

### Les données n'arrivent pas :
- ✅ Vérifier le format JSON envoyé
- ✅ Regarder les logs d'exécution dans N8N
- ✅ Vérifier les headers HTTP (`Content-Type: application/json`)

## 🎯 Next Steps

Une fois le webhook de base fonctionnel, vous pouvez :

1. **Ajouter des nœuds de traitement** pour chaque type d'événement
2. **Intégrer avec des APIs externes** (email, Slack, etc.)
3. **Stocker les données** dans une base de données
4. **Créer des workflows complexes** avec conditions et branches
5. **Ajouter la gestion d'erreurs** et les retry mechanisms