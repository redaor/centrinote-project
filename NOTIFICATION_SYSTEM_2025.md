# 🔔 Système de Notifications - Documentation Complète 2025

## 📋 Vue d'ensemble

Le système de notifications de Centrinote est un système complet et moderne qui permet d'afficher des notifications en temps réel aux utilisateurs. Il combine des composants visuels élégants, un hook de gestion d'état robuste, et une synchronisation en temps réel via Supabase Realtime + polling de secours.

## 🎯 Fonctionnalités principales

### ✅ Ce qui fonctionne

1. **Affichage en temps réel** : Les notifications apparaissent instantanément grâce à Supabase Realtime
2. **Polling de secours** : Un système de polling toutes les 5 secondes assure la fiabilité même si Realtime échoue
3. **Badge pulsant** : Un badge rouge avec animation indique le nombre de notifications non lues
4. **Panneau de notifications** : Un dropdown élégant avec animations Framer Motion
5. **Gestion complète** : Marquer comme lu, supprimer, afficher les détails
6. **Optimistic updates** : L'UI se met à jour instantanément avant la confirmation serveur
7. **Rollback automatique** : En cas d'erreur serveur, l'état précédent est restauré
8. **Sécurité RLS** : Toutes les opérations sont protégées par Row Level Security

### 🎨 Composants visuels modernes

- **BadgePulse** : Badge avec animation de pulse sur nouvelle notification
- **NotificationPanel** : Panneau dropdown avec backdrop blur et animations fluides
- **MiniToast** : Toast discret pour les notifications (optionnel, non utilisé actuellement)
- **ProgressHint** : Barre de progression en haut de l'écran (optionnel)

## 📁 Architecture des fichiers

```
src/
├── components/
│   ├── layout/
│   │   └── AppHeader.tsx              # Intégration du système de notifications
│   └── notifications/
│       └── NotificationVisuals2025.tsx # Composants visuels (BadgePulse, NotificationPanel, etc.)
├── hooks/
│   ├── useNotifications.ts            # Hook principal de gestion des notifications
│   └── useScrollHint.ts               # Hook pour les hints visuels (optionnel)
└── lib/
    └── supabase.ts                    # Client Supabase

supabase/
├── migrations/
│   └── 20251110_automation_edge.sql   # Migration qui crée la table notifications + RLS
└── functions/
    ├── automation-scheduler/
    │   └── index.ts                   # Créateur de notifications pour les automations
    └── automation-notification/
        └── index.ts                   # Edge function pour envoyer des notifications
```

## 🔧 Composants techniques

### 1. Hook useNotifications

**Localisation** : `src/hooks/useNotifications.ts`

**Responsabilités** :
- Charger les notifications au montage
- Écouter les changements en temps réel via Supabase Realtime
- Polling de secours toutes les 5 secondes
- Calculer le nombre de notifications non lues
- Fournir des fonctions de modification (markAsRead, markAllAsRead, deleteNotification)

**API publique** :
```typescript
const {
  notifications,      // Array<Notification>
  unreadCount,        // number
  loading,            // boolean
  markAsRead,         // (id: string) => Promise<void>
  markAllAsRead,      // () => Promise<void>
  deleteNotification  // (id: string) => Promise<void>
} = useNotifications();
```

**Fonctionnalités avancées** :
- ✅ Détection et prévention des doublons
- ✅ Optimistic updates pour UX réactive
- ✅ Rollback automatique en cas d'erreur
- ✅ Logs détaillés pour le debugging
- ✅ Double système : Realtime + Polling de secours

### 2. Composant BadgePulse

**Localisation** : `src/components/notifications/NotificationVisuals2025.tsx`

**Responsabilités** :
- Afficher l'icône de cloche avec le nombre de notifications non lues
- Animation de pulse lors de l'arrivée d'une nouvelle notification
- Glow effect pour attirer l'attention

**Props** :
```typescript
interface BadgePulseProps {
  count?: number;           // Nombre de notifications non lues
  darkMode?: boolean;       // Mode sombre activé
  onClick?: () => void;     // Callback au clic
}
```

**Fonctionnalités** :
- Animation scale + glow sur nouvelle notification
- Support du mode sombre
- Accessibilité complète (aria-label, focus visible)
- Affichage "99+" pour les nombres > 99

### 3. Composant NotificationPanel

**Localisation** : `src/components/notifications/NotificationVisuals2025.tsx`

**Responsabilités** :
- Afficher la liste des notifications dans un panneau dropdown
- Permettre de marquer comme lu / supprimer
- Animations d'entrée/sortie fluides

**Props** :
```typescript
interface NotificationPanelProps {
  isOpen?: boolean;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    isRead: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  darkMode?: boolean;
  onClose?: () => void;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}
```

**Fonctionnalités** :
- Backdrop blur animé
- Scroll pour liste longue
- Animations Framer Motion
- Support prefers-reduced-motion
- Couleurs différentes selon le type
- Bouton X toujours visible pour supprimer
- Glow effect au hover sur notifications non lues

### 4. Table notifications (Base de données)

**Localisation** : `supabase/migrations/20251110_automation_edge.sql` (lignes 134-160)

**Structure** :
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',           -- info|success|warning|error
  priority TEXT DEFAULT 'normal',     -- low|normal|high|urgent
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Index** :
- `idx_notifications_user_id` : Pour filtrer par utilisateur
- `idx_notifications_is_read` : Pour compter les non lues
- `idx_notifications_created_at` : Pour trier par date (DESC)
- `idx_notifications_priority` : Pour filtrer par priorité

**Politiques RLS** :
```sql
-- Lecture : Seulement ses propres notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Mise à jour : Seulement ses propres notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Suppression : Seulement ses propres notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
```

## 🔄 Flux de données

### Chargement initial
```
1. Utilisateur se connecte
2. AppHeader monte → useNotifications s'initialise
3. useNotifications charge les notifications via Supabase
4. Badge affiche le nombre de notifications non lues
```

### Réception d'une nouvelle notification
```
1. Edge function automation-scheduler crée une notification
2. Supabase Realtime broadcast l'INSERT
3. useNotifications reçoit l'événement
4. Badge pulse + compteur s'incrémente
5. (Optionnel) MiniToast apparaît en bas à droite
```

### Marquer comme lu
```
1. Utilisateur clique sur une notification dans le panneau
2. onMarkAsRead appelé avec l'ID
3. Mise à jour locale immédiate (optimistic update)
4. Requête UPDATE vers Supabase
5. En cas d'erreur : rollback automatique
```

### Supprimer une notification
```
1. Utilisateur clique sur le X d'une notification
2. onDelete appelé avec l'ID
3. Suppression locale immédiate (optimistic update)
4. Requête DELETE vers Supabase
5. En cas d'erreur : rollback + réaffichage
```

## 🔒 Sécurité

### Row Level Security (RLS)

Toutes les opérations sur la table `notifications` sont protégées :
- ✅ Un utilisateur ne peut voir QUE ses propres notifications
- ✅ Un utilisateur ne peut modifier QUE ses propres notifications
- ✅ Un utilisateur ne peut supprimer QUE ses propres notifications
- ✅ Les tentatives d'accès aux notifications d'autres utilisateurs sont automatiquement bloquées

### Fonctions SECURITY DEFINER

Deux fonctions helper sont disponibles avec SECURITY DEFINER :
- `mark_notification_read(notification_id UUID)` : Marque une notification comme lue
- `mark_all_notifications_read()` : Marque toutes les notifications comme lues

Ces fonctions vérifient systématiquement que `auth.uid() = user_id`.

## 📊 Métriques et logs

### Logs frontend
Le hook `useNotifications` produit des logs détaillés :
- `🔔 Chargement des notifications pour user: [id]`
- `✅ X notifications chargées, Y non lues`
- `🔔 Nouvelle notification reçue via Realtime`
- `🔄 [POLLING] X nouvelle(s) notification(s) détectée(s)`
- `✅ Notification marquée comme lue`
- `✅ Notification supprimée avec succès`
- `⚠️ Toutes les notifications sont marquées comme lues !`

### Logs backend (Edge Functions)
Voir les logs dans :
- `automation-scheduler/index.ts` : Logs de création de notifications
- `automation-notification/index.ts` : Logs d'envoi de notifications

## 🎨 Personnalisation

### Changer les couleurs
Modifier les classes Tailwind dans `NotificationVisuals2025.tsx` :
- Badge : `from-red-500 to-pink-600` (gradient du badge)
- Types : Modifier `getTypeColors()` pour changer les couleurs par type

### Changer les animations
Modifier les variants Framer Motion dans `NotificationVisuals2025.tsx` :
- Badge pulse : ligne 56-64
- Panel entrée/sortie : ligne 259-262
- Liste items : ligne 321-330

### Ajouter un toast
Décommenter l'import et utiliser le composant `MiniToast` dans `AppHeader.tsx` :
```typescript
const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState('');

// Dans le useEffect qui écoute les nouvelles notifications
if (!newNotification.is_read) {
  setToastMessage(newNotification.title);
  setShowToast(true);
}

// Dans le JSX
<MiniToast
  show={showToast}
  message={toastMessage}
  onClose={() => setShowToast(false)}
  darkMode={darkMode}
/>
```

## 🧪 Tests et débogage

### Vérifier que les notifications sont chargées
```typescript
// Dans la console du navigateur
console.log('Notifications:', notifications);
console.log('Unread count:', unreadCount);
```

### Créer une notification de test
```sql
-- Dans Supabase SQL Editor
INSERT INTO notifications (user_id, title, message, type, priority)
VALUES (
  '[votre-user-id]',
  'Test notification',
  'Ceci est un test',
  'info',
  'normal'
);
```

### Vérifier Realtime
```typescript
// Dans useNotifications.ts, regarder les logs :
// ✅ Abonné aux notifications en temps réel
// 🔔 Statut de la souscription Realtime: SUBSCRIBED
```

### Vérifier le polling
```typescript
// Dans useNotifications.ts, regarder les logs toutes les 5 secondes :
// 🔄 [POLLING] X nouvelle(s) notification(s) détectée(s)
```

## 🚀 Améliorations futures possibles

### Court terme
- [ ] Ajouter un bouton "Tout marquer comme lu" dans le header du panneau
- [ ] Ajouter un filtre par type de notification
- [ ] Ajouter une pagination pour les listes très longues (>50)

### Moyen terme
- [ ] Ajouter un système de préférences de notifications (email, push, in-app)
- [ ] Implémenter les push notifications natives (iOS/Android)
- [ ] Ajouter un historique archivé des anciennes notifications

### Long terme
- [ ] Système de notifications groupées (style Slack/Discord)
- [ ] Notifications riches avec images/actions personnalisées
- [ ] Analyse des notifications (taux d'ouverture, temps de réponse)

## 📚 Ressources

- [Documentation Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Documentation Framer Motion](https://www.framer.com/motion/)
- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
- [Row Level Security Supabase](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Résolution de problèmes

### Les notifications ne s'affichent pas
1. Vérifier que l'utilisateur est connecté : `console.log(user?.id)`
2. Vérifier les logs dans la console : chercher des erreurs
3. Vérifier la table notifications dans Supabase : `SELECT * FROM notifications WHERE user_id = '[id]'`
4. Vérifier les politiques RLS : `SELECT * FROM pg_policies WHERE tablename = 'notifications'`

### Le compteur de notifications non lues est incorrect
1. Vérifier la valeur `is_read` dans la base de données
2. Vérifier les logs : `⚠️ Toutes les notifications sont marquées comme lues !`
3. Recalculer manuellement : `SELECT COUNT(*) FROM notifications WHERE user_id = '[id]' AND is_read = false`

### Realtime ne fonctionne pas
1. Vérifier le statut de la souscription : chercher `SUBSCRIBED` dans les logs
2. Le polling de secours devrait prendre le relais automatiquement
3. Vérifier les logs : `🔄 [POLLING] X nouvelle(s) notification(s) détectée(s)`

### Les animations sont saccadées
1. Vérifier `prefers-reduced-motion` : peut-être activé par l'utilisateur
2. Réduire le nombre de notifications affichées simultanément
3. Vérifier les performances : ouvrir les DevTools → Performance

---

**Dernière mise à jour** : 25 novembre 2025
**Version** : 2.0
**Auteur** : Équipe Centrinote
