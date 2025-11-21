import { AppRouter } from './components/routing/AppRouter';
import { NotifyProvider, NotificationLayer } from './externals/centinote-notify';
import './styles/neurodesign.css';
import './externals/centinote-notify/styles.css';

function App() {
  // Le thème sera détecté dynamiquement dans NotificationLayer via AppContext
  // Pour l'instant, on utilise 'light' par défaut
  return (
    <NotifyProvider>
      <div className="App">
        <AppRouter />
        <NotificationLayerWithTheme />
      </div>
    </NotifyProvider>
  );
}

// Composant séparé pour accéder au contexte App
function NotificationLayerWithTheme() {
  // On va utiliser un hook personnalisé ou passer le thème depuis le contexte
  // Pour l'instant, on détecte le thème via la classe CSS ou localStorage
  const getTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
                     localStorage.getItem('theme') === 'dark' ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    }
    return 'light';
  };

  return <NotificationLayer theme={getTheme()} />;
}

export default App;