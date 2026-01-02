import { AppRouter } from './components/routing/AppRouter';
import { InstallPrompt } from './components/InstallPrompt';
import './styles/neurodesign.css';

function App() {
  return (
    <div className="App">
      <AppRouter />
      <InstallPrompt />
    </div>
  );
}

export default App;