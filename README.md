# Centrinote - Knowledge Management SaaS Platform

## 📋 Architecture des Modules

### Module Collaboration (Existant)
- **Localisation**: `src/components/collaboration/`
- **Fonctionnalités**: Sessions d'étude, chat temps réel, partage de documents, Jitsi Meet
- **Types**: `src/types/index.ts` (interfaces Collaboration, ChatMessage)
- **Services**: Intégré dans les hooks et contextes existants

### Module Zoom (Nouveau - Indépendant)
- **Localisation**: `src/components/zoom/`
- **Fonctionnalités**: Création/gestion réunions Zoom, invitations, analytics
- **Types**: `src/types/zoom.ts` (interfaces ZoomMeeting, ZoomParticipant, etc.)
- **Services**: `src/services/zoomService.ts`
- **Hooks**: `src/hooks/useZoomMeetings.ts`

## 🔄 Intégration Webhook N8N

### Actions Zoom vers N8N
```json
{
  "body": {
    "action": "create_zoom_meeting",
    "meeting": {
      "topic": "Réunion équipe",
      "start_time": "2025-01-20T14:00:00.000Z",
      "duration": 60,
      "participants": ["user1@example.com", "user2@example.com"]
    },
    "userId": "user123",
    "timestamp": "2025-01-18T15:41:00.000Z"
  }
}
```

### Actions disponibles:
- `create_zoom_meeting`: Création d'une réunion
- `update_zoom_meeting`: Modification d'une réunion
- `cancel_zoom_meeting`: Annulation d'une réunion
- `send_zoom_invitations`: Envoi d'invitations

## 🚀 Indépendance des Modules

### ✅ Séparation complète
- **Aucun import croisé** entre Collaboration et Zoom
- **Types distincts** pour chaque module
- **Services séparés** avec leurs propres responsabilités
- **Hooks dédiés** pour la gestion d'état

### 🔧 Feature Flags (Prêt pour implémentation)
```typescript
// Exemple d'implémentation future
const FEATURE_FLAGS = {
  COLLABORATION_MODULE: true,
  ZOOM_MODULE: true,
  JITSI_INTEGRATION: true
};
```

### 📦 Suppression facile
Pour supprimer le module Collaboration:
1. Supprimer `src/components/collaboration/`
2. Supprimer les types Collaboration de `src/types/index.ts`
3. Retirer l'import et la route dans `src/App.tsx`
4. Supprimer l'entrée du menu dans `src/components/layout/Sidebar.tsx`

## 🛠️ Configuration N8N

### Switch Node Configuration
```javascript
// Switch sur {{ $json.body.action }}
switch ($json.body.action) {
  case 'create_zoom_meeting':
    // Appeler l'API Zoom pour créer la réunion
    break;
  case 'update_zoom_meeting':
    // Mettre à jour la réunion existante
    break;
  case 'cancel_zoom_meeting':
    // Annuler la réunion
    break;
  case 'send_zoom_invitations':
    // Envoyer les invitations par email
    break;
}
```

## 📁 Structure des Fichiers

```
src/
├── components/
│   ├── collaboration/          # Module existant (inchangé)
│   │   ├── Collaboration.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── JitsiMeeting.tsx
│   │   └── ...
│   └── zoom/                   # Nouveau module (indépendant)
│       └── ZoomManager.tsx
├── hooks/
│   ├── useChat.ts             # Pour Collaboration
│   └── useZoomMeetings.ts     # Pour Zoom (nouveau)
├── services/
│   ├── jitsiService.ts        # Pour Collaboration
│   ├── zoomService.ts         # Pour Zoom (nouveau)
│   └── webhookService.ts      # Partagé (actions distinctes)
├── types/
│   ├── index.ts               # Types généraux + Collaboration
│   └── zoom.ts                # Types Zoom uniquement (nouveau)
```

## 🔐 Sécurité et Permissions

- **Isolation des données**: Chaque module gère ses propres données
- **Validation séparée**: Chaque service valide ses propres payloads
- **Permissions distinctes**: Possibilité d'attribuer des droits différents par module

## 🚀 Évolutivité

Cette architecture permet:
- **Ajout facile** de nouveaux modules (Teams, Google Meet, etc.)
- **Maintenance indépendante** de chaque module
- **Tests isolés** par fonctionnalité
- **Déploiement modulaire** avec feature flags