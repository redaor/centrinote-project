import AIFileChat from "../components/AIFileChat";

/**
 * Page de démonstration de l'upload et analyse de fichiers par IA
 */
export default function AIFilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* En-tête de la page */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Analyse de Documents par IA
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Uploadez vos documents texte et posez des questions. L'IA GPT-4 connectée à Internet
            analysera votre contenu et vous fournira des réponses précises.
          </p>
        </div>

        {/* Composant principal */}
        <AIFileChat />

        {/* Section d'information */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Rapide et puissant
            </h3>
            <p className="text-sm text-gray-600">
              Analyse instantanée de vos documents avec GPT-4, l'IA la plus avancée d'OpenAI
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sécurisé et privé
            </h3>
            <p className="text-sm text-gray-600">
              Vos documents sont traités de manière sécurisée et ne sont jamais stockés
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connecté à Internet
            </h3>
            <p className="text-sm text-gray-600">
              L'IA peut rechercher des informations en temps réel pour enrichir ses réponses
            </p>
          </div>
        </div>

        {/* Footer avec statistiques */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">3</div>
              <div className="text-sm text-gray-600">Modes d'IA disponibles</div>
              <div className="text-xs text-gray-500 mt-1">
                Normal • Recherche web • Analyse document
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">5 Mo</div>
              <div className="text-sm text-gray-600">Taille maximale</div>
              <div className="text-xs text-gray-500 mt-1">
                Formats TXT et Markdown
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">GPT-4</div>
              <div className="text-sm text-gray-600">Modèle d'IA utilisé</div>
              <div className="text-xs text-gray-500 mt-1">
                La plus avancée d'OpenAI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
