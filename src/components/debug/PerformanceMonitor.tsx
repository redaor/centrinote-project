// 📊 Moniteur de performance en temps réel
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, Database, Wifi } from 'lucide-react';

interface PerformanceMetrics {
  componentRenderTime: number;
  supabaseQueryTime: number;
  webhookResponseTime: number;
  totalLoadTime: number;
  rerendersCount: number;
}

interface PerformanceMonitorProps {
  darkMode?: boolean;
  onMetricsChange?: (metrics: PerformanceMetrics) => void;
}

export function PerformanceMonitor({ darkMode = false, onMetricsChange }: PerformanceMonitorProps) {
  // Désactiver en production pour éviter les calculs inutiles
  if (import.meta.env.PROD) {
    return null;
  }

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    componentRenderTime: 0,
    supabaseQueryTime: 0,
    webhookResponseTime: 0,
    totalLoadTime: 0,
    rerendersCount: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  // Tracker les re-renders (optimisé)
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    setMetrics(prev => ({ ...prev, rerendersCount: prev.rerendersCount + 1 }));
  }, []); // Seulement au mount, pas à chaque render

  // Observer les métriques de performance du navigateur
  useEffect(() => {
    const updateMetrics = () => {
      if (performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntries) {
          const newMetrics = {
            ...metrics,
            totalLoadTime: navigationEntries.loadEventEnd - navigationEntries.navigationStart,
            componentRenderTime: performance.now()
          };
          setMetrics(newMetrics);
          onMetricsChange?.(newMetrics);
        }
      }
    };

    const timer = setInterval(updateMetrics, 1000);
    return () => clearInterval(timer);
  }, [metrics, onMetricsChange]);

  // Écouter les logs de performance personnalisés
  useEffect(() => {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      
      // Parser les logs de performance Supabase
      if (message.includes('[PERFORMANCE] Fetch meetings took')) {
        const timeMatch = message.match(/(\d+\.?\d*)ms/);
        if (timeMatch) {
          setMetrics(prev => ({ ...prev, supabaseQueryTime: parseFloat(timeMatch[1]) }));
        }
      }
      
      // Parser les logs de performance webhook
      if (message.includes('[ROUTER] Webhook') && message.includes('success via proxy')) {
        const timeMatch = message.match(/(\d+)ms/);
        if (timeMatch) {
          setMetrics(prev => ({ ...prev, webhookResponseTime: parseInt(timeMatch[1]) }));
        }
      }
      
      originalConsoleLog.apply(console, args);
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  const getMetricColor = (value: number, type: 'time' | 'count') => {
    if (type === 'time') {
      if (value < 100) return 'text-green-500';
      if (value < 500) return 'text-yellow-500';
      return 'text-red-500';
    } else {
      if (value < 5) return 'text-green-500';
      if (value < 20) return 'text-yellow-500';
      return 'text-red-500';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 right-4 p-2 rounded-full shadow-lg transition-opacity hover:opacity-80 ${ 
          darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
        }`}
        title="Afficher les métriques de performance"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg border min-w-80 ${
      darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center space-x-2">
          <Activity className="w-4 h-4" />
          <span>Performance</span>
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className={`text-sm px-2 py-1 rounded transition-colors ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3" />
            <span>Chargement total</span>
          </div>
          <span className={getMetricColor(metrics.totalLoadTime, 'time')}>
            {metrics.totalLoadTime.toFixed(0)}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-3 h-3" />
            <span>Requête Supabase</span>
          </div>
          <span className={getMetricColor(metrics.supabaseQueryTime, 'time')}>
            {metrics.supabaseQueryTime.toFixed(1)}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="w-3 h-3" />
            <span>Webhook n8n</span>
          </div>
          <span className={getMetricColor(metrics.webhookResponseTime, 'time')}>
            {metrics.webhookResponseTime}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-3 h-3" />
            <span>Re-renders</span>
          </div>
          <span className={getMetricColor(metrics.rerendersCount, 'count')}>
            {metrics.rerendersCount}
          </span>
        </div>

        <div className={`pt-2 border-t text-xs ${
          darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
        }`}>
          Render #{renderCount} • 
          {metrics.totalLoadTime < 1000 ? ' 🟢 Rapide' : 
           metrics.totalLoadTime < 3000 ? ' 🟡 Moyen' : ' 🔴 Lent'}
        </div>
      </div>
    </div>
  );
}