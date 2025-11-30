# 🔒 Système de Sécurité et Monitoring - Documentation Complète

## 📋 Vue d'ensemble

Système complet de sécurité et monitoring pour l'application React + Supabase + Vite, incluant :
- Edge function sécurisée pour vérifier l'accès aux automatisations
- Table `error_logs` pour stocker toutes les erreurs
- Logger sécurisé avec sanitisation des données sensibles
- Dashboard admin pour visualiser les erreurs en temps réel
- Hook React pour écouter les erreurs via Realtime

---

## 🗄️ 1. Migration SQL - Table `error_logs`

### Fichier : `supabase/migrations/20251201_error_logs_table.sql`

**Table créée :**
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  level TEXT CHECK (level IN ('info', 'warn', 'error', 'debug')),
  meta JSONB DEFAULT '{}',
  source TEXT,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fonctionnalités :**
- ✅ RLS activé (utilisateurs voient leurs erreurs, service role voit tout)
- ✅ Index pour performances
- ✅ Fonction de nettoyage automatique (30 jours)
- ✅ Cron job pour nettoyage quotidien

**Exécution :**
```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécutez : supabase/migrations/20251201_error_logs_table.sql
```

---

## 🔐 2. Edge Function - `/api/user/automation-access`

### Fichier : `supabase/functions/automation-access/index.ts`

**Fonctionnalités :**
- ✅ Vérifie le JWT via header `Authorization: Bearer <token>`
- ✅ Retourne `{ user_id: string, has_access: boolean }`
- ✅ Logger côté serveur dans `error_logs`
- ✅ Headers CORS configurés
- ✅ Gestion d'erreurs complète

**Utilisation :**
```typescript
import { checkAutomationAccess } from '../services/automationAccessService';

const { user_id, has_access } = await checkAutomationAccess();
if (has_access) {
  // Accès autorisé
}
```

**Déploiement :**
```bash
supabase functions deploy automation-access
```

---

## 📝 3. Logger Sécurisé

### Fichier : `src/utils/logger.ts`

**Fonctionnalités :**
- ✅ Sanitise automatiquement les données sensibles :
  - Emails → `[REDACTED_EMAIL]`
  - UUIDs → `[REDACTED_UUID]`
  - Tokens JWT → `[REDACTED_TOKEN]`
  - Mots de passe → `[REDACTED]`
  - Clés API → `[REDACTED]`
- ✅ Envoie les logs à Supabase `error_logs`
- ✅ Console uniquement en mode dev
- ✅ Capture automatique de l'URL et User-Agent

**Utilisation :**
```typescript
import { logger } from '../utils/logger';

// Info
logger.info('User logged in', { userId: '[REDACTED]' });

// Warning
logger.warn('Slow query detected', { queryTime: 500 });

// Error
logger.error('Failed to fetch data', error, { endpoint: '/api/data' });

// Debug (uniquement en dev)
logger.debug('Component mounted', { component: 'Dashboard' });
```

**Remplacement des console.log :**
```typescript
// ❌ Avant
console.log('User:', user.email);
console.error('Error:', error);

// ✅ Après
logger.info('User action', { userId: '[REDACTED]' });
logger.error('Error occurred', error);
```

---

## 🔄 4. Hook `useErrorLogs`

### Fichier : `src/hooks/useErrorLogs.ts`

**Fonctionnalités :**
- ✅ Charge les logs depuis Supabase
- ✅ Écoute les nouveaux logs en temps réel (Realtime)
- ✅ Filtrage par niveau, utilisateur, recherche
- ✅ Fonction de rafraîchissement
- ✅ Fonction de nettoyage (admin uniquement)

**Utilisation :**
```typescript
import { useErrorLogs } from '../hooks/useErrorLogs';

function MyComponent() {
  const { logs, loading, error, refresh } = useErrorLogs({
    limit: 100,
    level: 'error',
    userId: 'user-id', // optionnel
    realtime: true,
  });

  return (
    <div>
      {logs.map(log => (
        <div key={log.id}>{log.message}</div>
      ))}
    </div>
  );
}
```

---

## 📊 5. Composant `ErrorLogsDashboard`

### Fichier : `src/components/admin/ErrorLogsDashboard.tsx`

**Fonctionnalités :**
- ✅ Affichage des logs avec statistiques
- ✅ Filtrage par niveau (error, warn, info, debug)
- ✅ Recherche dans les messages
- ✅ Groupement par date
- ✅ Modal de détails avec stack trace
- ✅ Temps réel via Realtime
- ✅ Design responsive et dark mode

**Intégration :**
Déjà intégré dans `AdminMobileInterface` (section "Logs d'erreurs")

---

## 🔧 6. Service `automationAccessService`

### Fichier : `src/services/automationAccessService.ts`

**Fonctionnalités :**
- ✅ Récupère le token JWT de l'utilisateur
- ✅ Appelle l'edge function `/api/user/automation-access`
- ✅ Gestion d'erreurs complète
- ✅ Logging automatique

**Utilisation :**
```typescript
import { checkAutomationAccess } from '../services/automationAccessService';

const result = await checkAutomationAccess();
if (result.has_access) {
  // Accès autorisé
} else {
  // Accès refusé
  console.error(result.error);
}
```

---

## 📁 Structure des fichiers

```
supabase/
├── migrations/
│   └── 20251201_error_logs_table.sql          # Table error_logs
├── functions/
│   └── automation-access/
│       └── index.ts                          # Edge function sécurisée

src/
├── utils/
│   └── logger.ts                             # Logger sécurisé
├── hooks/
│   └── useErrorLogs.ts                        # Hook Realtime
├── components/
│   └── admin/
│       ├── ErrorLogsDashboard.tsx             # Dashboard erreurs
│       └── AdminMobileInterface.tsx           # Intégration admin
└── services/
    └── automationAccessService.ts             # Service edge function
```

---

## 🚀 Déploiement

### Étape 1 : Migration SQL
```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécutez : supabase/migrations/20251201_error_logs_table.sql
```

### Étape 2 : Déployer l'edge function
```bash
supabase functions deploy automation-access
```

### Étape 3 : Vérifier les variables d'environnement
- `VITE_SUPABASE_URL` : URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (dans Supabase secrets)

### Étape 4 : Tester
1. Ouvrir le dashboard admin (bouton ADMIN)
2. Cliquer sur "Logs d'erreurs"
3. Vérifier que les logs s'affichent en temps réel

---

## 🧪 Tests

### Test 1 : Logger sécurisé
```typescript
import { logger } from '../utils/logger';

// Tester la sanitisation
logger.info('User email: user@example.com'); 
// → Log: "User email: [REDACTED_EMAIL]"

logger.info('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
// → Log: "Token: [REDACTED_TOKEN]"
```

### Test 2 : Edge function
```typescript
import { checkAutomationAccess } from '../services/automationAccessService';

const result = await checkAutomationAccess();
console.log(result);
// → { user_id: 'uuid', has_access: true }
```

### Test 3 : Dashboard admin
1. Ouvrir le dashboard admin
2. Cliquer sur "Logs d'erreurs"
3. Vérifier que les logs s'affichent
4. Tester les filtres (error, warn, info, debug)
5. Tester la recherche

---

## 📊 Requêtes SQL utiles

### Voir les erreurs récentes
```sql
SELECT * FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
```

### Statistiques par niveau
```sql
SELECT 
  level,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY level
ORDER BY count DESC;
```

### Erreurs par utilisateur
```sql
SELECT 
  user_id,
  COUNT(*) as error_count,
  MAX(created_at) as last_error
FROM error_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY error_count DESC;
```

### Nettoyer les vieux logs
```sql
SELECT cleanup_old_error_logs(30); -- Garder 30 jours
```

---

## 🔒 Sécurité

### Données sanitaires
- ✅ Emails remplacés par `[REDACTED_EMAIL]`
- ✅ UUIDs remplacés par `[REDACTED_UUID]`
- ✅ Tokens JWT remplacés par `[REDACTED_TOKEN]`
- ✅ Mots de passe jamais loggés
- ✅ Clés API jamais loggées

### RLS (Row Level Security)
- ✅ Utilisateurs voient uniquement leurs erreurs
- ✅ Service role voit toutes les erreurs (dashboard admin)
- ✅ Pas d'accès aux erreurs d'autres utilisateurs

### Edge Function
- ✅ Vérification JWT obligatoire
- ✅ Headers CORS configurés
- ✅ Gestion d'erreurs complète
- ✅ Logging côté serveur

---

## 📝 Migration des console.log

### Composants modifiés
- ✅ `src/components/AuthForm.tsx` - Logger sécurisé intégré
- ✅ `src/components/routing/AppRouter.tsx` - Logger sécurisé intégré

### À migrer (exemples)
- `src/components/meetings/MeetingRoom.tsx`
- `src/components/meetings/MeetingList.tsx`
- `src/components/debug/NavigationDebugger.tsx`
- Etc.

**Remplacement :**
```typescript
// ❌ Avant
console.log('User:', user.email);
console.error('Error:', error);

// ✅ Après
import { logger } from '../utils/logger';
logger.info('User action');
logger.error('Error occurred', error);
```

---

## 🎯 Résultat attendu

Après déploiement :
- ✅ Toutes les erreurs sont loggées dans `error_logs`
- ✅ Données sensibles sanitaires
- ✅ Dashboard admin affiche les erreurs en temps réel
- ✅ Edge function sécurisée pour vérifier l'accès
- ✅ Logger sécurisé remplace les console.log

---

## 📚 Documentation supplémentaire

- **Logger sécurisé** : `src/utils/logger.ts`
- **Hook Realtime** : `src/hooks/useErrorLogs.ts`
- **Dashboard admin** : `src/components/admin/ErrorLogsDashboard.tsx`
- **Edge function** : `supabase/functions/automation-access/index.ts`
- **Service** : `src/services/automationAccessService.ts`

