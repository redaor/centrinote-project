// 📊 Onglet Résumé & Transcription pour la page de détail d'une réunion
import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, AlertCircle, Sparkles, ChevronDown, ChevronUp,
  Share2, X, Check, Send, Lightbulb
} from 'lucide-react';
import { useSummary } from '../../hooks/useSummary';

interface MeetingSummaryTabProps {
  meetingId: string;
}

export function MeetingSummaryTab({ meetingId }: MeetingSummaryTabProps) {
  const { summary, loading, error } = useSummary(meetingId);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImprovements, setShowImprovements] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [improvementText, setImprovementText] = useState('');
  const [improvementLoading, setImprovementLoading] = useState(false);
  const [improvementSuccess, setImprovementSuccess] = useState(false);

  // Mock participants (à remplacer par les vrais participants de la réunion)
  const mockParticipants = [
    { email: 'participant1@example.com', name: 'Alice Dupont' },
    { email: 'participant2@example.com', name: 'Bob Martin' },
    { email: 'participant3@example.com', name: 'Claire Rousseau' },
  ];

  // Pré-remplir le texte d'amélioration avec le résumé actuel
  useEffect(() => {
    if (summary?.summary?.title) {
      setImprovementText(summary.summary.title);
    }
  }, [summary]);

  const handleShare = async () => {
    if (selectedParticipants.length === 0) {
      alert('Veuillez sélectionner au moins un participant');
      return;
    }

    setShareLoading(true);
    try {
      const response = await fetch('/.netlify/functions/share-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          participants: selectedParticipants,
          summary: summary,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du partage');
      }

      setShareSuccess(true);
      setTimeout(() => {
        setShowShareModal(false);
        setShareSuccess(false);
        setSelectedParticipants([]);
      }, 2000);
    } catch (err) {
      console.error('❌ Erreur partage:', err);
      alert('Erreur lors du partage du résumé');
    } finally {
      setShareLoading(false);
    }
  };

  const handleSubmitImprovement = async () => {
    if (!improvementText.trim()) {
      alert('Veuillez saisir vos suggestions');
      return;
    }

    setImprovementLoading(true);
    try {
      const response = await fetch('/.netlify/functions/suggest-improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          suggestions: improvementText,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi');
      }

      setImprovementSuccess(true);
      setTimeout(() => {
        setShowImprovements(false);
        setImprovementSuccess(false);
        setImprovementText('');
      }, 2000);
    } catch (err) {
      console.error('❌ Erreur amélioration:', err);
      alert('Erreur lors de l\'envoi des suggestions');
    } finally {
      setImprovementLoading(false);
    }
  };

  const toggleParticipant = (email: string) => {
    setSelectedParticipants(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Génération du résumé en cours...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Aucun résumé disponible pour cette réunion
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badge IA générée + Boutons d'action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-full">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
            Résumé IA
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Partager
          </button>
          <button
            onClick={() => setShowImprovements(true)}
            className="inline-flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Lightbulb className="w-4 h-4 mr-1.5" />
            Proposer des améliorations
          </button>
        </div>
      </div>

      {/* Résumé principal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        {summary.summary?.title && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {summary.summary.title}
            </h3>
          </div>
        )}

        {/* Points clés */}
        {summary.summary?.key_points && summary.summary.key_points.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Points clés
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {summary.summary.key_points.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Décisions */}
        {summary.summary?.decisions && summary.summary.decisions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Décisions
            </h4>
            <ul className="space-y-2">
              {summary.summary.decisions.map((decision, idx) => (
                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-l-2 border-blue-500 pl-3">
                  {decision.what}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {summary.summary?.actions && summary.summary.actions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Actions à suivre
            </h4>
            <ul className="space-y-2">
              {summary.summary.actions.map((action, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{action.task}</span>
                    {action.owner && (
                      <span className="text-gray-500 dark:text-gray-500"> · {action.owner}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Transcription (repliable) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              Voir la transcription
            </span>
          </div>
          {showTranscript ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {showTranscript && summary.raw_transcript && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                {summary.raw_transcript}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Section exemples (collapsible) */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="w-full flex items-center justify-between p-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-200 text-sm">
              Exemples de bons résumés
            </span>
          </div>
          {showExamples ? (
            <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          )}
        </button>

        {showExamples && (
          <div className="p-4 border-t border-blue-200 dark:border-blue-800 space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-md p-3">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Exemple 1: Réunion de planification
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                "Planification Q2 2024 : Validation roadmap produit avec lancement beta v2.0 prévu pour mai. Actions: Alice - spec technique (15/04), Bob - maquettes UX (20/04)."
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-md p-3">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Exemple 2: Revue de projet
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                "Sprint review: 8/10 user stories complétées. Décisions: reporter feature X au sprint suivant, focus sur la performance. Actions: équipe dev - optimisation (cette semaine)."
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-md p-3">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Exemple 3: One-on-one
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                "Entretien mensuel avec Sarah : points positifs sur autonomie, objectif: formation React avancée. Actions: Sarah - inscription formation (fin semaine), Manager - validation budget."
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modale de partage */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Partager le résumé
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sélectionnez les participants qui recevront le résumé par email
            </p>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {mockParticipants.map((participant) => (
                <label
                  key={participant.email}
                  className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(participant.email)}
                    onChange={() => toggleParticipant(participant.email)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {participant.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {participant.email}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleShare}
              disabled={shareLoading || selectedParticipants.length === 0}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {shareLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : shareSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Envoyé !
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modale d'amélioration */}
      {showImprovements && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Proposer des améliorations
              </h3>
              <button
                onClick={() => setShowImprovements(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Modifiez le texte ci-dessous pour suggérer des améliorations au résumé
            </p>

            <textarea
              value={improvementText}
              onChange={(e) => setImprovementText(e.target.value)}
              rows={8}
              disabled={improvementSuccess}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Saisissez vos suggestions d'amélioration..."
            />

            {improvementSuccess ? (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Merci pour vos suggestions ! Nous les examinerons pour améliorer les futurs résumés.
                </p>
              </div>
            ) : (
              <button
                onClick={handleSubmitImprovement}
                disabled={improvementLoading}
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {improvementLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Soumettre
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
