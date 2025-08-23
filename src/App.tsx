import React, { useEffect } from 'react';
import { AppRouter } from './components/routing/AppRouter';
// @ts-ignore - Composant de test temporaire
import ZoomTest from './components/ZoomTest.jsx';

function App() {
  return (
    <div className="App">
      <AppRouter />
      
      {/* Composant de test temporaire */}
      <ZoomTest />
    </div>
  );
}

export default App;