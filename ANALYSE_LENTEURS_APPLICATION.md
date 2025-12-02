# 🔍 Analyse des Lenteurs - Centrinote

## 🚨 Problèmes Identifiés

### 1. **Polling de Secours Actif en Permanence** ⚠️ CRITIQUE

**Fichier** : `src/hooks/useNotifications.ts` (ligne 146-174)

**Problème** : Le polling de secours s'exécute **toutes les 5 secondes** même quand Realtime fonctionne correctement.

```typescript
// B. Polling de secours toutes les 5 secondes (si Realtime ne fonctionne pas)
const pollInterval = setInterval(async () => {
  // Requête à la base de données toutes les 5 secondes
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
}, 5000); // ⚠️ TOUJOURS ACTIF
```

**Impact** :
- 12 requêtes/minute par utilisateur
- Charge inutile sur la base de données
- Latence réseau constante
- Consommation de ressources

**Solution** : Activer le polling **uniquement** si Realtime est fermé/en erreur.

---

### 2. **Chargement de 200 Logs d'Erreurs** ⚠️ ÉLEVÉ

**Fichier** : `src/components/admin/ErrorLogsDashboard.tsx` (ligne 21)

**Problème** : Chargement de 200 logs à chaque ouverture de la page admin.

```typescript
const { logs, loading, error, refresh, clearLogs } = useErrorLogs({
  limit: 200, // ⚠️ TROP ÉLEVÉ
  // ...
});
```

**Impact** :
- Requête SQL lourde
- Transfert de données important
- Rendu React lent (200 éléments)

**Solution** : Réduire à 50 logs par défaut, avec pagination.

---

### 3. **Polling du Profil Toutes les 30 Secondes** ⚠️ MOYEN

**Fichier** : `src/hooks/useUserSync.ts` (ligne 283)

**Problème** : Vérification du profil utilisateur toutes les 30 secondes.

```typescript
// Puis toutes les 30 secondes
const intervalId = setInterval(checkProfileUpdates, 30000);
```

**Impact** :
- 2 requêtes/minute par utilisateur
- Peu nécessaire (le profil change rarement)

**Solution** : Augmenter l'intervalle à 5 minutes ou utiliser Realtime.

---

### 4. **Subscriptions Realtime Multiples** ⚠️ MOYEN

**Problème** : Plusieurs hooks créent des subscriptions Realtime qui peuvent se fermer et se rouvrir en boucle :
- `useNotifications` : notifications
- `useErrorLogs` : error_logs
- `useMeetings` : meetings
- `useUserSync` : profiles

**Impact** :
- Connexions WebSocket multiples
- Reconnexions fréquentes
- Messages "Canal Realtime fermé" répétés

**Solution** : Centraliser les subscriptions ou optimiser la gestion des reconnexions.

---

### 5. **Pas de Détection de l'État Realtime** ⚠️ CRITIQUE

**Problème** : Le polling de secours ne vérifie pas si Realtime fonctionne avant de s'activer.

**Impact** : Le polling s'exécute même quand Realtime est actif, doublant les requêtes.

**Solution** : Ajouter un flag pour désactiver le polling quand Realtime est `SUBSCRIBED`.

---

## 🔧 Solutions Proposées

### Solution 1 : Polling Conditionnel pour Notifications

```typescript
// Dans useNotifications.ts
const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CLOSED' | 'ERROR'>('CLOSED');

// Dans le subscribe callback
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setRealtimeStatus('SUBSCRIBED');
  } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
    setRealtimeStatus('CLOSED');
  }
});

// Polling UNIQUEMENT si Realtime est fermé
const pollInterval = realtimeStatus !== 'SUBSCRIBED' 
  ? setInterval(async () => {
      // ... polling
    }, 5000)
  : null;
```

### Solution 2 : Réduire les Logs Chargés

```typescript
// Dans ErrorLogsDashboard.tsx
const { logs, loading, error, refresh, clearLogs } = useErrorLogs({
  limit: 50, // Au lieu de 200
  // ...
});
```

### Solution 3 : Augmenter l'Intervalle du Profil

```typescript
// Dans useUserSync.ts
const intervalId = setInterval(checkProfileUpdates, 300000); // 5 minutes au lieu de 30s
```

### Solution 4 : Optimiser les Subscriptions Realtime

- Utiliser un seul channel pour plusieurs tables si possible
- Ajouter un debounce sur les reconnexions
- Désactiver Realtime sur les pages qui n'en ont pas besoin

---

## 📊 Estimation de l'Amélioration

**Avant** :
- Notifications : 12 requêtes/minute
- Profil : 2 requêtes/minute
- Logs : 200 logs chargés à chaque ouverture
- **Total** : ~14 requêtes/minute + charge initiale lourde

**Après** :
- Notifications : 0-2 requêtes/minute (uniquement si Realtime échoue)
- Profil : 0.2 requêtes/minute (toutes les 5 minutes)
- Logs : 50 logs chargés
- **Total** : ~0.2-2 requêtes/minute + charge initiale réduite

**Gain estimé** : **85-95% de réduction** des requêtes inutiles

---

## ✅ Checklist de Correction

- [ ] Modifier `useNotifications.ts` pour polling conditionnel
- [ ] Réduire le limit dans `ErrorLogsDashboard.tsx` à 50
- [ ] Augmenter l'intervalle dans `useUserSync.ts` à 5 minutes
- [ ] Tester que Realtime fonctionne correctement
- [ ] Vérifier que les lenteurs sont résolues

