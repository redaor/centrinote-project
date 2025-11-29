// 📊 Composant pour afficher le résumé d'une réunion généré par IA
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText, Loader2, AlertCircle, CheckCircle, Download,
  Clock, Users, Target, Calendar, ArrowLeft, Save, Share2, Mail
} from 'lucide-react';
import { useSummary } from '../../hooks/useSummary';
import { useAuth } from '../../components/AuthProvider';
import { useNotes } from '../../hooks/useNotes';
import { Modal } from '../ui/Modal';

export function MeetingSummary() {
  const { id } = useParams<{ id: string }>();
  const { summary, loading, error, validateSummary } = useSummary(id || null);
  const { user } = useAuth();
  const { addNote } = useNotes();
  const [activeTab, setActiveTab] = useState<'summary' | 'decisions' | 'actions' | 'transcript'>('summary');
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!user?.id) {
      setValidationError('Vous devez être connecté pour valider un résumé');
      return;
    }

    setValidating(true);
    setValidationError(null);

    try {
      const success = await validateSummary(user.id);

      if (success) {
        console.log('✅ Résumé validé avec succès');
      } else {
        setValidationError('Erreur lors de la validation du résumé');
      }
    } catch (err) {
      console.error('❌ Erreur validation:', err);
      setValidationError('Une erreur est survenue lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const handleSaveToNotes = async () => {
    if (!summary) {
      setSaveError('Aucun résumé à enregistrer');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Formater le titre avec le nom de la réunion et la date
      const meetingDate = summary.meeting_started_at
        ? new Date(summary.meeting_started_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        : 'Date inconnue';

      const noteTitle = `📅 ${summary.meeting_title || 'Réunion'} - ${meetingDate}`;

      // Formater le contenu de la note avec toutes les informations
      let noteContent = '';

      // Section participants
      if (summary.meeting_participants && summary.meeting_participants.length > 0) {
        noteContent += '## 👥 Participants\n\n';
        summary.meeting_participants.forEach(p => {
          noteContent += `- ${p.name}${p.email ? ` (${p.email})` : ''}${p.role === 'organizer' ? ' - Organisateur' : ''}\n`;
        });
        noteContent += '\n';
      }

      // Section résumé
      if (summary.summary?.title) {
        noteContent += `## 📝 Résumé\n\n${summary.summary.title}\n\n`;
      }

      // Section points clés
      if (summary.summary?.key_points && summary.summary.key_points.length > 0) {
        noteContent += '## 🎯 Points clés\n\n';
        summary.summary.key_points.forEach(point => {
          noteContent += `- ${point}\n`;
        });
        noteContent += '\n';
      }

      // Section décisions
      if (summary.summary?.decisions && summary.summary.decisions.length > 0) {
        noteContent += '## ✅ Décisions\n\n';
        summary.summary.decisions.forEach(decision => {
          noteContent += `- **${decision.what}**`;
          if (decision.who) noteContent += ` (${decision.who})`;
          if (decision.deadline) noteContent += ` - Échéance: ${decision.deadline}`;
          noteContent += '\n';
        });
        noteContent += '\n';
      }

      // Section actions
      if (summary.summary?.actions && summary.summary.actions.length > 0) {
        noteContent += '## 📋 Actions à faire\n\n';
        summary.summary.actions.forEach(action => {
          noteContent += `- [ ] ${action.task}`;
          if (action.owner) noteContent += ` (${action.owner})`;
          if (action.due) noteContent += ` - Échéance: ${action.due}`;
          noteContent += '\n';
        });
        noteContent += '\n';
      }

      // Section transcription (optionnelle, peut être longue)
      if (summary.raw_transcript) {
        noteContent += '## 📄 Transcription complète\n\n';
        noteContent += '```\n' + summary.raw_transcript + '\n```\n';
      }

      // Enregistrer la note
      const newNote = await addNote(noteTitle, noteContent, ['réunion'], false);

      if (newNote) {
        console.log('✅ Résumé enregistré dans les notes:', newNote.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Masquer après 3s
      } else {
        setSaveError('Erreur lors de l\'enregistrement de la note');
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'enregistrement:', err);
      setSaveError('Une erreur est survenue lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleShareByEmail = async () => {
    if (!shareEmail.trim()) {
      setShareError('Veuillez entrer une adresse email');
      return;
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail)) {
      setShareError('Adresse email invalide');
      return;
    }

    setSharing(true);
    setShareError(null);

    try {
      console.log('📧 [SHARE] Envoi résumé par email via serveur...');

      // Extraire le nom du destinataire de l'email
      const recipientName = shareEmail.split('@')[0];

      // Appeler la fonction Netlify pour envoyer l'email
      const response = await fetch('/.netlify/functions/send-summary-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingId: id,
          recipientEmail: shareEmail,
          recipientName,
          customMessage: shareMessage.trim() || null
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Erreur lors de l\'envoi');
      }

      console.log('✅ [SHARE] Email envoyé avec succès:', result);

      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareModal(false);
        setShareEmail('');
        setShareMessage('');
      }, 3000);

    } catch (err) {
      console.error('❌ [SHARE] Erreur lors du partage par email:', err);
      setShareError(err instanceof Error ? err.message : 'Une erreur est survenue lors du partage');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Génération du résumé en cours...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Cela peut prendre quelques minutes
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Link 
            to="/meetings"
            className="mt-4 inline-block text-blue-500 hover:underline"
          >
            ← Retour aux réunions
          </Link>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Aucun résumé disponible pour cette réunion
          </p>
          <Link 
            to="/meetings"
            className="mt-4 inline-block text-blue-500 hover:underline"
          >
            ← Retour aux réunions
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: 'Résumé', icon: FileText },
    { id: 'decisions', label: 'Décisions', icon: Target },
    { id: 'actions', label: 'Actions', icon: CheckCircle },
    { id: 'transcript', label: 'Transcription', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/meetings"
            className="inline-flex items-center text-blue-500 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux réunions
          </Link>
          
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Résumé de réunion
            </h1>

            <div className="flex items-center gap-3">
              {/* Bouton Enregistrer dans les notes */}
              <button
                onClick={handleSaveToNotes}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enregistré !
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer dans les notes
                  </>
                )}
              </button>

              {/* Bouton Partager */}
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </button>

              {/* Badge ou bouton Valider */}
              {summary.validated_at ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validé
                </span>
              ) : (
                <button
                  onClick={handleValidate}
                  disabled={validating}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider ce résumé
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {summary.generated_at && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Généré le {new Date(summary.generated_at).toLocaleString('fr-FR')}
            </p>
          )}

          {/* Erreur de validation */}
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            </div>
          )}

          {/* Erreur d'enregistrement */}
          {saveError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            </div>
          )}

          {/* Succès d'enregistrement */}
          {saveSuccess && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600 dark:text-green-400">Résumé enregistré avec succès dans vos notes !</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {summary.summary?.title && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {summary.summary.title}
                  </h2>
                </div>
              )}

              {summary.summary?.key_points && summary.summary.key_points.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Points clés
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    {summary.summary.key_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.markdown && (
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: summary.markdown.replace(/\n/g, '<br />') 
                    }} 
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'decisions' && (
            <div>
              {summary.summary?.decisions && summary.summary.decisions.length > 0 ? (
                <div className="space-y-4">
                  {summary.summary.decisions.map((decision, idx) => (
                    <div 
                      key={idx}
                      className="border-l-4 border-blue-500 pl-4 py-2"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {decision.what}
                      </p>
                      <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {decision.who && (
                          <span className="flex items-center mr-4">
                            <Users className="w-4 h-4 mr-1" />
                            {decision.who}
                          </span>
                        )}
                        {decision.deadline && (
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Échéance: {decision.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune décision enregistrée
                </p>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div>
              {summary.summary?.actions && summary.summary.actions.length > 0 ? (
                <div className="space-y-4">
                  {summary.summary.actions.map((action, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <input 
                        type="checkbox" 
                        className="mt-1"
                        disabled
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {action.task}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {action.owner && (
                            <span className="flex items-center mr-4">
                              <Users className="w-4 h-4 mr-1" />
                              {action.owner}
                            </span>
                          )}
                          {action.due && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Échéance: {action.due}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune action enregistrée
                </p>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div>
              {summary.raw_transcript ? (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {summary.raw_transcript}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Transcription non disponible
                </p>
              )}
            </div>
          )}

          {/* Download */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-3">
            {summary.markdown && (
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(summary.markdown)}`}
                download={`resume-${id}.md`}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger le markdown
              </a>
            )}
            {summary.pdf_url && (
              <a
                href={summary.pdf_url}
                download
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger le PDF
              </a>
            )}
          </div>
        </div>

        {/* Modal de partage */}
        <Modal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareEmail('');
            setShareMessage('');
            setShareError(null);
          }}
          title="Partager le résumé"
          size="md"
        >
          <div className="p-6 space-y-4">
            {/* Partager par email uniquement (plus sécurisé) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Partager par email
              </h3>

              <div className="space-y-3">
                <div>
                  <label htmlFor="share-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresse email du destinataire
                  </label>
                  <input
                    id="share-email"
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="share-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message personnalisé (optionnel)
                  </label>
                  <textarea
                    id="share-message"
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Ajouter un message..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {shareError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{shareError}</p>
                  </div>
                )}

                {shareSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-600 dark:text-green-400">✅ Résumé envoyé par email avec succès !</p>
                  </div>
                )}

                <button
                  onClick={handleShareByEmail}
                  disabled={sharing}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                  {sharing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Préparation...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Envoyer par email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

