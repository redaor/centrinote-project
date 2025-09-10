import React, { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader } from 'lucide-react';
import { sendVerificationLink } from '../../services/emailLinkVerificationService';

// 🧪 Composant de test pour les liens de vérification email
// À utiliser uniquement en développement

export default function EmailLinkTest() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTest = async () => {
    if (!email || !userId) {
      setResult('❌ Email et User ID requis');
      setStatus('error');
      return;
    }

    setLoading(true);
    setResult('');
    setStatus('idle');

    try {
      const response = await sendVerificationLink(email, userId, 'signup');
      
      if (response.success) {
        setResult(`✅ ${response.message}\n🔗 Lien: ${response.verification_link || 'Généré côté n8n'}`);
        setStatus('success');
      } else {
        setResult(`❌ ${response.error}`);
        setStatus('error');
      }
    } catch (error) {
      setResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) return <Loader className="animate-spin h-5 w-5 text-blue-500" />;
    if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'error') return <XCircle className="h-5 w-5 text-red-500" />;
    return <Mail className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center mb-4">
        <Mail className="h-6 w-6 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Test Liens Email n8n
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email de test
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User ID (UUID)
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Test en cours...' : 'Tester endpoint n8n'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-3 rounded-lg border">
          <div className="flex items-start">
            {getStatusIcon()}
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Résultat du test
              </h4>
              <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
          💡 Instructions test
        </h4>
        <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>1. Entrez un email valide de test</li>
          <li>2. Générez un UUID pour User ID</li>
          <li>3. Cliquez "Tester" pour appeler n8n</li>
          <li>4. Vérifiez l'email reçu</li>
          <li>5. Testez le lien dans l'email</li>
        </ul>
      </div>
    </div>
  );
}

// Hook pour UUID generator en développement
export const generateTestUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};