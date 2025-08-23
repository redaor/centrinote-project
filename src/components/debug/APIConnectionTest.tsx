/**
 * Composant de test pour vérifier la connexion API
 */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  response?: any;
  error?: string;
  duration?: number;
}

export const APIConnectionTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const tests = [
    { endpoint: '/health', label: 'Health Check', method: 'healthCheck' },
    { endpoint: '/healthz', label: 'Alternative Health', method: 'healthz' },
    { endpoint: '/auth/me', label: 'Auth Status', method: 'getAuthStatus' },
  ];

  const runTest = async (test: any): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const response = await (apiClient as any)[test.method]();
      const duration = Date.now() - startTime;
      
      return {
        endpoint: test.endpoint,
        status: 'success',
        response,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        endpoint: test.endpoint,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Initialize with pending status
    const initialResults = tests.map(test => ({
      endpoint: test.endpoint,
      status: 'pending' as const
    }));
    setResults(initialResults);

    // Run tests sequentially
    const finalResults: TestResult[] = [];
    for (const test of tests) {
      const result = await runTest(test);
      finalResults.push(result);
      setResults([...finalResults]);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runAllTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🔗 Test de Connexion API Backend
        </h2>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md font-medium ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Tests en cours...' : 'Relancer les tests'}
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => {
          const result = results[index];
          
          return (
            <div key={test.endpoint} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {result ? getStatusIcon(result.status) : '⏳'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{test.label}</h3>
                    <p className="text-sm text-gray-600">
                      {test.endpoint}
                    </p>
                  </div>
                </div>
                
                {result?.duration && (
                  <span className="text-sm text-gray-500">
                    {result.duration}ms
                  </span>
                )}
              </div>

              {result && (
                <div className="ml-8">
                  <p className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                    {result.status === 'success' ? 'Succès' : 
                     result.status === 'error' ? 'Erreur' : 'En cours...'}
                  </p>
                  
                  {result.response && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        Voir la réponse
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  {result.error && (
                    <div className="mt-2 p-3 bg-red-50 rounded">
                      <p className="text-sm text-red-800">{result.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Informations</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Backend URL:</strong> {import.meta.env.VITE_BACKEND_URL || 'http://localhost:5174'}</li>
          <li><strong>Frontend URL:</strong> {window.location.origin}</li>
          <li><strong>Environnement:</strong> {import.meta.env.PROD ? 'Production' : 'Développement'}</li>
        </ul>
      </div>
    </div>
  );
};

export default APIConnectionTest;