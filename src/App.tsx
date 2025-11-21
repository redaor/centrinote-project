import { AppRouter } from './components/routing/AppRouter';
import { NotificationLayer } from './externals/centinote-notify';
import './styles/neurodesign.css';

function App() {
  return (
    <div className="App">
      <AppRouter />
      <NotificationLayer />
    </div>
  );
}

export default App;