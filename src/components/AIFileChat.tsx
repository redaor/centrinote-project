import { useState, DragEvent, ChangeEvent } from "react";
import { useAI } from "../hooks/useAI";

/**
 * Composant de chat IA avec support d'upload de fichiers
 * Supporte le drag & drop et la sélection de fichiers
 * Formats supportés: .txt, .md
 */
export default function AIFileChat() {
  const { ask, loading } = useAI();
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && isValidFile(dropped)) {
      setFile(dropped);
    } else if (dropped) {
      alert(`Format non supporté. Utilisez .txt ou .md (max 5 Mo)`);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
      setFile(selected);
    } else if (selected) {
      alert(`Format non supporté. Utilisez .txt ou .md (max 5 Mo)`);
    }
  };

  const isValidFile = (f: File): boolean => {
    const validTypes = ["text/plain", "text/markdown"];
    const validExtensions = [".txt", ".md", ".markdown"];
    const maxSize = 5 * 1024 * 1024; // 5 Mo

    const hasValidType = validTypes.includes(f.type);
    const hasValidExtension = validExtensions.some(ext => f.name.toLowerCase().endsWith(ext));

    if (f.size > maxSize) {
      return false;
    }

    return hasValidType || hasValidExtension;
  };

  const analyze = async () => {
    if (!file) {
      alert("Veuillez sélectionner un fichier");
      return;
    }

    if (!question.trim()) {
      alert("Veuillez poser une question");
      return;
    }

    setReply("");
    const response = await ask(question, file);
    setReply(response);
  };

  const reset = () => {
    setFile(null);
    setQuestion("");
    setReply("");
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 p-6">
      {/* En-tête */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analyse de documents par IA
        </h2>
        <p className="text-gray-600">
          Glissez un fichier .txt ou .md pour l'analyser avec l'IA connectée à Internet
        </p>
      </div>

      {/* Zone de drop */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-blue-500 bg-blue-50 scale-[1.02]"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".txt,.md,.markdown"
          className="hidden"
          onChange={handleSelect}
        />

        {/* Icône upload */}
        <div className="flex flex-col items-center space-y-3">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div>
            <p className="text-base text-gray-700 font-medium">
              Glissez un fichier ici ou cliquez pour sélectionner
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Formats supportés: .txt, .md • Taille max: 5 Mo
            </p>
          </div>
        </div>
      </div>

      {/* Fichier sélectionné */}
      {file && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-600">
                {(file.size / 1024).toFixed(2)} Ko
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFile(null);
            }}
            className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-2 transition-colors"
            title="Retirer le fichier"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Zone de question */}
      <div className="space-y-3">
        <label htmlFor="question" className="block text-sm font-medium text-gray-700">
          Posez votre question sur le document
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex: Résume ce document en 3 points, Quels sont les concepts clés ?, Traduis ce texte en anglais..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Boutons d'action */}
      <div className="flex space-x-3">
        <button
          onClick={analyze}
          disabled={!file || !question.trim() || loading}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Analyse en cours...
            </span>
          ) : (
            "Analyser le document"
          )}
        </button>

        {(file || reply) && (
          <button
            onClick={reset}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Résultat */}
      {reply && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-start space-x-3 mb-3">
            <svg
              className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Réponse de l'IA
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {reply}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex items-center space-x-2 text-sm text-green-700">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Document analysé avec GPT-4 connecté à Internet
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Aide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <h4 className="font-semibold mb-2 flex items-center">
          <svg
            className="h-5 w-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Exemples de questions
        </h4>
        <ul className="space-y-1 ml-7">
          <li>• Résume ce document en 3 points</li>
          <li>• Quels sont les concepts clés abordés ?</li>
          <li>• Traduis ce texte en anglais</li>
          <li>• Extrais les informations importantes</li>
          <li>• Crée un quiz basé sur ce contenu</li>
        </ul>
      </div>
    </div>
  );
}
