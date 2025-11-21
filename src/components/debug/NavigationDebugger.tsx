import React, { useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

interface NavigationEvent {
  timestamp: string;
  pathname: string;
  currentView: string;
  navigationType: string;
  id: string;
}

export function NavigationDebugger() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { state } = useApp();
  const { currentView } = state;
  const [events, setEvents] = useState<NavigationEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // ✅ FIX: Désactiver logs en production
    if (import.meta.env.PROD) return;

    const event: NavigationEvent = {
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      pathname: location.pathname,
      currentView,
      navigationType,
      id: `${Date.now()}-${Math.random()}`
    };

    console.log('📊 [NAV-DEBUG] Événement navigation:', event);

    setEvents(prev => [...prev.slice(-9), event]);
  }, [location.pathname, currentView, navigationType]);

  // Raccourci clavier pour afficher/masquer
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs max-w-md shadow-2xl">
      <div className="flex justify-between items-center mb-2 border-b border-green-600 pb-2">
        <h3 className="font-bold text-green-300">🔍 Navigation Debugger</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-2 bg-blue-900/50 p-2 rounded">
        <div>📍 Current Path: <span className="text-yellow-300">{location.pathname}</span></div>
        <div>🎯 Current View: <span className="text-yellow-300">{currentView}</span></div>
        <div>🔄 Nav Type: <span className="text-yellow-300">{navigationType}</span></div>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        <div className="text-green-300 font-bold mb-1">History (derniers 10):</div>
        {events.map((event, index) => (
          <div 
            key={event.id} 
            className={`flex justify-between ${index === events.length - 1 ? 'text-yellow-300' : 'text-gray-400'}`}
          >
            <span>{event.timestamp}</span>
            <span>{event.pathname}</span>
            <span>[{event.currentView}]</span>
            <span className="text-xs">{event.navigationType}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 text-gray-500 text-xs">
        Ctrl+Shift+D pour masquer
      </div>
    </div>
  );
}