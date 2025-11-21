import { AppRouter } from './components/routing/AppRouter';
import { NotificationLayer } from './externals/centinote-notify';
import { useApp } from './contexts/AppContext';
import './styles/neurodesign.css';
import './externals/centinote-notify/styles.css';

function App() {
  const { state } = useApp();
  const theme = state.darkMode ? 'dark' : 'light';

  return (
    <div className="App">
      <AppRouter />
      <NotificationLayer theme={theme} />
    </div>
  );
}

export default App;