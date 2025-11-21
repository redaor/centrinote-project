# Centinote-Notify

Système de notifications moderne style Dynamic Island pour Centinote.

## Installation

Le module est déjà inclus dans le projet. Aucune installation supplémentaire requise.

## Utilisation

### 1. Envelopper l'application avec `NotifyProvider`

Dans `App.tsx` ou votre composant racine :

```tsx
import { NotifyProvider, NotificationLayer } from './externals/centinote-notify';

function App() {
  return (
    <NotifyProvider>
      {/* Votre application */}
      <NotificationLayer theme="light" /> {/* ou "dark" */}
    </NotifyProvider>
  );
}
```

### 2. Utiliser le hook `useNotify`

```tsx
import { useNotify } from './externals/centinote-notify';

function MyComponent() {
  const { notify } = useNotify();

  const handleClick = () => {
    notify({
      level: 'success',
      title: 'Succès',
      body: 'Opération réussie !',
      icon: '✅',
    });
  };

  return <button onClick={handleClick}>Notifier</button>;
}
```

## API

### `notify(params)`

```typescript
notify({
  level: 'info' | 'success' | 'warning' | 'error' | 'automation',
  title: string,
  body: string,
  actions?: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
  }>;
  icon?: string;
})
```

### Exemples

#### Notification simple
```tsx
notify({
  level: 'info',
  title: 'Information',
  body: 'Voici une notification simple',
});
```

#### Notification avec actions
```tsx
notify({
  level: 'success',
  title: 'Sauvegarde réussie',
  body: 'Vos modifications ont été enregistrées',
  actions: [
    {
      label: 'Voir',
      onClick: () => console.log('Voir'),
      primary: true,
    },
    {
      label: 'Ignorer',
      onClick: () => console.log('Ignorer'),
    },
  ],
});
```

#### Notification d'automatisation (se rétracte après 3s)
```tsx
notify({
  level: 'automation',
  title: 'Automatisation exécutée',
  body: 'Votre citation du jour a été envoyée',
  icon: '💭',
});
```

## Agrégation automatique

Si plusieurs notifications arrivent en moins de 5 secondes, elles sont automatiquement agrégées en un résumé compact.

## Test de l'agrégation

Cliquez sur le bouton ci-dessous pour tester l'agrégation :

```tsx
function TestAggregation() {
  const { notify } = useNotify();

  const handleTest = () => {
    // Envoie 3 notifications rapides
    notify({
      level: 'info',
      title: 'Notification 1',
      body: 'Première notification',
    });
    
    setTimeout(() => {
      notify({
        level: 'success',
        title: 'Notification 2',
        body: 'Deuxième notification',
      });
    }, 1000);
    
    setTimeout(() => {
      notify({
        level: 'warning',
        title: 'Notification 3',
        body: 'Troisième notification',
      });
    }, 2000);
  };

  return (
    <button
      onClick={handleTest}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Test notify (3 notifications)
    </button>
  );
}
```

## Service Worker (Web Push)

Pour activer les notifications même quand l'onglet est fermé :

```tsx
import { initializePushNotifications } from './externals/centinote-notify';

// Au démarrage de l'application
initializePushNotifications().then(({ registration, subscription }) => {
  if (subscription) {
    console.log('Push notifications activées');
    // Envoyer la subscription au serveur pour stockage
  }
});
```

**Note** : Configurez `VITE_VAPID_PUBLIC_KEY` dans votre `.env` pour activer les push notifications.

## Accessibilité

- ✅ Support WCAG-AAA (contrastes élevés)
- ✅ `aria-live="polite"` pour les annonces vocales
- ✅ Support `prefers-reduced-motion`
- ✅ Support `prefers-contrast: high`
- ✅ Navigation au clavier (Tab, Enter, Espace)

## Thème

Le composant `NotificationLayer` accepte une prop `theme` :

```tsx
<NotificationLayer theme="light" />  // Thème clair
<NotificationLayer theme="dark" />   // Thème sombre
```

## Spécifications techniques

- **Bundle size** : < 15 kB minifié
- **Zéro dépendance** : Utilise uniquement React, TypeScript, Tailwind
- **Compatibilité** : Chrome, Safari, Firefox (2 dernières versions)
- **Animations** : Slide-in 0.3s ease-out, slide-out 0.2s ease-in

## Structure

```
src/externals/centinote-notify/
├─ index.ts           # Exports publics
├─ NotifyProvider.tsx # Contexte + reducer
├─ DynamicIsland.tsx  # Bulle animée
├─ NotificationLayer.tsx # Composant à placer dans App.tsx
├─ useNotify.ts       # Hook consommateur
├─ serviceWorker.ts   # Enregistrement + push
├─ styles.css         # Animations
├─ types.ts           # Types TypeScript
└─ README.md          # Documentation
```

