# ⚠️ Limitations Actuelles - Enregistrement Jitsi

## Problème Identifié
L'application utilise **meet.jit.si** (service public gratuit) qui **NE SUPPORTE PAS** :
- ❌ L'enregistrement côté serveur automatique
- ❌ Les webhooks natifs pour les événements
- ❌ Le stockage cloud des enregistrements
- ❌ L'intégration Jibri (serveur d'enregistrement)

## Ce qui fonctionne actuellement
- ✅ Création de liens de réunion
- ✅ Envoi d'emails avec liens
- ✅ Participants peuvent rejoindre
- ✅ Chat et partage d'écran
- ⚠️ Enregistrement LOCAL uniquement (l'utilisateur doit télécharger manuellement)

## Architecture Actuelle vs Attendue

### Flux Actuel (Non Fonctionnel)
```
1. Centrinote → Crée lien meet.jit.si
2. Email → Envoie lien
3. Réunion → Participants rejoignent
4. ❌ meet.jit.si → N'envoie PAS d'enregistrement
5. ❌ n8n → Ne reçoit RIEN
```

### Flux Attendu (Nécessite Jitsi Self-Hosted)
```
1. Centrinote → Crée lien Jitsi self-hosted
2. Email → Envoie lien
3. Réunion → Participants rejoignent
4. ✅ Jibri → Enregistre la réunion
5. ✅ Webhook → Envoie l'URL d'enregistrement
6. ✅ n8n → Traite et génère rapport
```

## Solutions Recommandées

### 1. Court Terme - Workaround
- Utiliser l'enregistrement LOCAL du navigateur
- Demander à l'hôte de télécharger et uploader manuellement
- Ajouter un bouton "Upload Recording" dans l'interface

### 2. Moyen Terme - Self-Hosted Jitsi
Déployer votre propre serveur Jitsi avec :
- Jitsi Meet
- Jibri (pour enregistrement)
- Prosody (avec webhook plugin)
- Configuration webhook vers n8n

### 3. Long Terme - Service Professionnel
- **8x8 JaaS** : ~$0.008/min avec enregistrement inclus
- **Zoom API** : $14.99/mois/host avec cloud recording
- **Google Meet** : Inclus dans Google Workspace

## Code à Modifier pour Self-Hosted

### 1. Variables d'environnement
```env
# .env.production
VITE_JITSI_DOMAIN=your-jitsi-server.com  # Au lieu de meet.jit.si
VITE_JITSI_APP_ID=your-app-id  # Pour JaaS
VITE_JITSI_JWT_SECRET=your-jwt-secret  # Pour authentification
```

### 2. Configuration Jitsi Service
```typescript
// src/services/jitsiService.ts
class JitsiService {
  private baseUrl = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
  
  async initializeJitsiAPI(containerId: string, config: JitsiMeetingConfig) {
    const options = {
      ...config,
      // Configuration pour self-hosted avec recording
      recordingService: {
        enabled: true,
        mode: 'jibri',  // Au lieu de 'file'
        webhookUrl: import.meta.env.VITE_N8N_JITSI_RECORDING
      }
    };
    
    return new JitsiMeetExternalAPI(this.baseUrl, options);
  }
}
```

### 3. Configuration Serveur Jitsi (self-hosted)
```javascript
// /etc/jitsi/meet/your-domain-config.js
config.recordingService = {
    enabled: true,
    sharingEnabled: true,
    webhookUrl: 'https://n8n.srv886297.hstgr.cloud/webhook/jitsi-recording'
};

config.fileRecordingsEnabled = true;
config.liveStreamingEnabled = true;
```

### 4. Configuration Prosody (self-hosted)
```lua
-- /etc/prosody/conf.avail/your-domain.cfg.lua
Component "recorder.your-domain.com" "http_upload"
    webhook_url = "https://n8n.srv886297.hstgr.cloud/webhook/jitsi-recording"
```

## Estimation des Coûts

### Self-Hosted (VPS)
- **Serveur** : ~$20-40/mois (4GB RAM minimum)
- **Stockage** : ~$5/mois (100GB)
- **Bande passante** : Variable
- **Total** : ~$30-50/mois

### JaaS (8x8)
- **Prix** : $0.008/participant/minute
- **Exemple** : 10 réunions/jour × 5 participants × 30 min = $12/jour = $360/mois

### Zoom API
- **Pro** : $14.99/mois/host
- **Business** : $19.99/mois/host
- **Cloud Recording** : Inclus

## Action Immédiate Recommandée

1. **Clarifier aux utilisateurs** que l'enregistrement automatique n'est pas disponible avec meet.jit.si
2. **Ajouter un bouton** "Upload Recording" pour l'enregistrement local
3. **Planifier** la migration vers une solution self-hosted ou payante
4. **Tester** avec un serveur Jitsi de test avant production

## Ressources

- [Jitsi Self-Hosting Guide](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart)
- [Jibri Documentation](https://github.com/jitsi/jibri)
- [JaaS Pricing](https://jaas.8x8.vc/#/pricing)
- [Zoom API Recording](https://marketplace.zoom.us/docs/api-reference/zoom-api/cloud-recording/)