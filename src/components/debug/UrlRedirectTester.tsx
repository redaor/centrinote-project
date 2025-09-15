import React, { useState } from 'react';
import { 
  Link, 
  ExternalLink, 
  Copy, 
  TestTube, 
  CheckCircle,
  ArrowRight,
  Mail,
  Users,
  Zap
} from 'lucide-react';

export function UrlRedirectTester() {
  const [testRoomName, setTestRoomName] = useState('PoorTrainsCounterObviously');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const testUrl = `${baseUrl}/collaboration?room=${testRoomName}`;

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Erreur copie URL:', error);
    }
  };

  const handleTestRedirect = () => {
    // Ouvrir dans un nouvel onglet pour tester
    window.open(testUrl, '_blank');
  };

  const generateRandomRoom = () => {
    const adjectives = ['Poor', 'Happy', 'Quick', 'Smart', 'Bright'];
    const nouns = ['Trains', 'Cars', 'Books', 'Stars', 'Ideas'];
    const verbs = ['Counter', 'Dance', 'Jump', 'Sing', 'Run'];
    const adverbs = ['Obviously', 'Quickly', 'Clearly', 'Smoothly', 'Perfectly'];
    
    const randomRoom = [
      adjectives[Math.floor(Math.random() * adjectives.length)],
      nouns[Math.floor(Math.random() * nouns.length)],
      verbs[Math.floor(Math.random() * verbs.length)],
      adverbs[Math.floor(Math.random() * adverbs.length)]
    ].join('');
    
    setTestRoomName(randomRoom);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <TestTube className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            🔗 Testeur de Redirection URL
          </h2>
          <p className="text-gray-600">
            Tester les liens d'email vers les réunions Jitsi
          </p>
        </div>
      </div>

      {/* Configuration du test */}
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            📧 Simulation email n8n
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de salle Jitsi (comme généré par n8n)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testRoomName}
                  onChange={(e) => setTestRoomName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: PoorTrainsCounterObviously"
                />
                <button
                  onClick={generateRandomRoom}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ancien système (mauvais) */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <ExternalLink className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">❌ Avant (mauvais)</span>
                </div>
                <div className="text-sm text-red-700 mb-3">
                  Sort de l'app Centrinote
                </div>
                <code className="block bg-red-100 p-2 rounded text-xs text-red-800 break-all">
                  https://meet.jit.si/{testRoomName}
                </code>
              </div>

              {/* Nouveau système (bon) */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Link className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">✅ Maintenant (bon)</span>
                </div>
                <div className="text-sm text-green-700 mb-3">
                  Reste dans l'interface Centrinote
                </div>
                <code className="block bg-green-100 p-2 rounded text-xs text-green-800 break-all">
                  {testUrl}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Actions de test */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibent text-gray-900 mb-4">
            🧪 Actions de test
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Copier URL */}
            <button
              onClick={() => handleCopyUrl(testUrl)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {copiedUrl === testUrl ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Copié!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copier URL</span>
                </>
              )}
            </button>

            {/* Tester redirection */}
            <button
              onClick={handleTestRedirect}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Tester redirection</span>
            </button>

            {/* Simuler email */}
            <button
              onClick={() => handleCopyUrl(`Rejoindre la réunion: ${testUrl}`)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              {copiedUrl?.includes('Rejoindre') ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Copié!</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Simuler email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Workflow de test */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            📋 Workflow de test
          </h3>
          
          <ol className="space-y-3 text-sm text-yellow-800">
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <div>
                <strong>Cliquer "Tester redirection"</strong> - Ouvre un nouvel onglet avec l'URL de test
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <div>
                <strong>Vérifier que ça reste dans Centrinote</strong> - L'interface ne devrait pas rediriger vers meet.jit.si
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <div>
                <strong>Vérifier auto-join</strong> - La salle Jitsi devrait se charger automatiquement
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-medium">4</span>
              <div>
                <strong>Tester avec email</strong> - Copier l'email simulé et l'envoyer à quelqu'un
              </div>
            </li>
          </ol>
        </div>

        {/* Résultat attendu */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            ✅ Résultat attendu
          </h3>
          
          <div className="space-y-2 text-sm text-green-800">
            <p>• L'utilisateur clique sur le lien d'email</p>
            <p>• Il arrive sur <code>https://centrinote.fr/collaboration?room={testRoomName}</code></p>
            <p>• L'interface Centrinote détecte le paramètre <code>?room=</code></p>
            <p>• La réunion Jitsi se lance automatiquement <strong>dans l'interface Centrinote</strong></p>
            <p>• L'utilisateur garde accès à tous les outils Centrinote (notes, documents, etc.)</p>
          </div>
        </div>
      </div>
    </div>
  );
}