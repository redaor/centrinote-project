# 🔍 Guide de Debug - Centinote-Notify

## ✅ Corrections appliquées

1. **Logique d'affichage corrigée** : Suppression de `isAnimating` qui bloquait l'affichage
2. **Synchronisation des IDs** : L'ID de notification est maintenant passé dans l'action `ADD`
3. **Ordre des providers** : `NotifyProvider` est maintenant dans `main.tsx` après `AppProvider`
4. **Logs de debug** : Ajout de logs pour tracer le flux des notifications

## 🧪 Comment tester

### 1. Vérifier les logs dans la console

Ouvrez la console (F12) et testez une notification. Vous devriez voir :

```
🔔 [NOTIFY] Notification déclenchée: {level: 'success', title: '...', ...}
🔔 [NOTIFY] Ajout de la première notification immédiatement, ID: notif-...
🔔 [REDUCER] Notification ajoutée avec ID: notif-... isVisible: true
🔔 [NotificationLayer] State: {notificationsCount: 1, isVisible: true, ...}
🔔 [DynamicIsland] Render: {hasNotification: true, isVisible: true, ...}
```

### 2. Vérifier l'affichage

- Une bulle blanche/transparente devrait apparaître en haut de l'écran (centrée)
- Style Dynamic Island avec animation slide-in depuis le haut
- Le contenu de la notification (titre, body, icône) devrait être visible

### 3. Si ça ne fonctionne toujours pas

Vérifiez dans la console :

1. **Est-ce que `🔔 [NOTIFY] Notification déclenchée` apparaît ?**
   - ❌ Non → Le hook `useNotify()` n'est pas accessible ou le composant n'est pas dans `NotifyProvider`
   - ✅ Oui → Continuez

2. **Est-ce que `🔔 [REDUCER] Notification ajoutée` apparaît ?**
   - ❌ Non → Le dispatch ne fonctionne pas
   - ✅ Oui → Continuez

3. **Est-ce que `🔔 [NotificationLayer] State` montre `isVisible: true` ?**
   - ❌ Non → Le state n'est pas mis à jour correctement
   - ✅ Oui → Le problème est dans `DynamicIsland`

4. **Est-ce que `🔔 [DynamicIsland] Render` montre `hasNotification: true` et `isVisible: true` ?**
   - ❌ Non → Le problème est dans la logique de rendu
   - ✅ Oui → Le problème est dans le CSS ou le positionnement

## 🔧 Points de vérification

### Structure des providers (main.tsx)
```tsx
<AppProvider>
  <AuthProvider>
    <NotifyProvider>  ← Doit être ici
      <App />
    </NotifyProvider>
  </AuthProvider>
</AppProvider>
```

### NotificationLayer dans App.tsx
```tsx
function App() {
  const { state } = useApp();
  const theme = state.darkMode ? 'dark' : 'light';
  
  return (
    <div className="App">
      <AppRouter />
      <NotificationLayer theme={theme} />  ← Doit être ici
    </div>
  );
}
```

### Utilisation dans les composants
```tsx
import { useNotify } from '../../externals/centinote-notify';

const { notify } = useNotify();
notify({ level: 'success', title: 'Test', body: 'Test body' });
```

## 🐛 Problèmes connus et solutions

### Problème : Les notifications ne s'affichent pas
**Solution** : Vérifiez que `NotificationLayer` est bien rendu dans `App.tsx`

### Problème : `useNotifyContext must be used within NotifyProvider`
**Solution** : Vérifiez que `NotifyProvider` enveloppe bien tous les composants qui utilisent `useNotify()`

### Problème : Les notifications s'affichent mais disparaissent immédiatement
**Solution** : Vérifiez les logs pour voir si l'auto-suppression se déclenche trop tôt

## 📊 Structure du flux

1. **Composant** appelle `notify({ ... })`
2. **NotifyProvider.notify()** ajoute la notification au state via `dispatch({ type: 'ADD', ... })`
3. **notificationReducer** met à jour le state avec `isVisible: true`
4. **NotificationLayer** lit le state et passe les props à `DynamicIsland`
5. **DynamicIsland** rend la notification si `isVisible === true` et `notification !== null`

