import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/global.css';
import { AuthProvider } from './components/AuthProvider.tsx';
import { AppProvider } from './contexts/AppContext.tsx';

// DEBUG: Activer le traçage removeChild en développement
if (import.meta.env.DEV) {
  if (import.meta.env.DEV) {
  import('./utils/debugRemoveChild').then(({ setupRemoveChildDebug }) => {
    setupRemoveChildDebug();
  });
}

  // ✅ PATCH: Diagnostic autocomplete automatique (dev only)
  if (import.meta.env.DEV) {
  import('./utils/autocompleteCheck').then(({ setupAutocompleteCheck }) => {
    setupAutocompleteCheck();
  });
}
}

// SECURITY: Désactiver Google Translate et autres extensions qui manipulent le DOM
import('./utils/disableTranslate').then(({ disableTranslateExtensions, protectCriticalElements }) => {
  disableTranslateExtensions();
  // Protéger après le chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', protectCriticalElements);
  } else {
    protectCriticalElements();
  }
});

// Make sure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id "root" in your HTML.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppProvider>
  </StrictMode>
);