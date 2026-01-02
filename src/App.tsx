import { AppRouter } from './components/routing/AppRouter';
import { InstallPrompt } from './components/InstallPrompt';
import { InstallInfoBanner } from './components/InstallInfoBanner';
import './styles/neurodesign.css';

function App() {
  return (
    <div className="App">
      <AppRouter />
      <InstallPrompt />
      <InstallInfoBanner />
    </div>
  );
}

export default App;