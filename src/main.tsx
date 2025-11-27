import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/global.css';
import { AuthProvider } from './components/AuthProvider.tsx';
import { AppProvider } from './contexts/AppContext.tsx';

// PERF: Charger les outils de debug de manière asynchrone pour ne pas bloquer le démarrage
if (import.meta.env.DEV) {
  // PERF: Dynamic import pour éviter de bloquer le thread principal
  import('./utils/debugRemoveChild').then(({ setupRemoveChildDebug }) => {
    setupRemoveChildDebug();
  }).catch(err => {
    console.warn('Debug removeChild non disponible:', err);
  });

  // PERF: Autocomplete check en arrière-plan
  import('./utils/autocompleteCheck').then(({ setupAutocompleteCheck }) => {
    setupAutocompleteCheck();
  }).catch(err => {
    console.warn('Autocomplete check non disponible:', err);
  });
}

// PERF: Charger les protections de sécurité après le paint initial
if (typeof requestIdleCallback !== 'undefined') {
  // PERF: Utiliser requestIdleCallback si disponible
  requestIdleCallback(() => {
    import('./utils/disableTranslate').then(({ disableTranslateExtensions, protectCriticalElements }) => {
      disableTranslateExtensions();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', protectCriticalElements);
      } else {
        protectCriticalElements();
      }
    });
  });
} else {
  // PERF: Fallback pour Safari/navigateurs anciens
  import('./utils/disableTranslate').then(({ disableTranslateExtensions, protectCriticalElements }) => {
    disableTranslateExtensions();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', protectCriticalElements);
    } else {
      protectCriticalElements();
    }
  });
}

// PERF: Vérification rapide du DOM
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id "root" in your HTML.');
}

// PERF: Render immédiat pour réduire Time-to-Interactive
createRoot(rootElement).render(
  <StrictMode>
    <AppProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppProvider>
  </StrictMode>
);