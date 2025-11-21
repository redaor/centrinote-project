// 📅 Composant refactorisé pour planifier une réunion Daily.co avec neurodesign
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetings, CreateMeetingData } from '../../hooks/useMeetings';
import { useAuth } from '../AuthProvider';
import { useToasts, createSuccessToast, createErrorToast } from '../../hooks/useToasts';
import { useScheduling } from '../../hooks/useScheduling';
import { useParticipantsForm } from '../../hooks/useParticipantsForm';

// Composants modulaires
import { MeetingCreateCard } from './MeetingCreateCard';
import { MeetingTitleField } from './MeetingTitleField';
import { ParticipantsBlock } from './ParticipantsBlock';
import { SchedulingBlock } from './SchedulingBlock';
import { ActionsBar } from './ActionsBar';
import { ToastContainer } from '../ui/ToastContainer';
import { useApp } from '../../contexts/AppContext';

export function MeetingScheduler() {
  const navigate = useNavigate();
  const { createMeeting } = useMeetings();
  const { user } = useAuth();
  const { state } = useApp();
  const { darkMode } = state;
  
  // État local
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enableAiSummary, setEnableAiSummary] = useState(false);
  
  // Hooks métier
  const { toasts, showToast, removeToast } = useToasts();
  const scheduling = useScheduling();
  const participantsForm = useParticipantsForm({
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    email: user?.email || ''
  });

  // Validation globale
  const canSubmit = 
    title.trim().length > 0 &&
    title.length <= 100 &&
    participantsForm.validation.isValid &&
    scheduling.isValid &&
    !loading;

  // Progression pour gamification
  const progress = {
    completed: [
      title.trim().length > 0, // Titre rempli
      participantsForm.organizer.name.trim() && participantsForm.organizer.email.trim(), // Organisateur
      participantsForm.validation.isValid && scheduling.isValid // Tout validé
    ].filter(Boolean).length,
    total: 3,
    percentage: 0,
    isComplete: false
  };
  progress.percentage = Math.round((progress.completed / progress.total) * 100);
  progress.isComplete = progress.completed === progress.total;

  // Actions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      // Préparer les données selon le nouveau format
      const schedulingData = scheduling.getSchedulingData();
      
      // Formater les participants avec name, email, role (format attendu par create-meeting-v3)
      const formattedParticipants = participantsForm.participants.map(p => ({
        name: p.name,
        email: p.email,
        role: p.role || 'guest'
      }));
      
      const meetingData: CreateMeetingData = {
        title: title.trim(),
        description: description.trim() || undefined,
        participants: formattedParticipants, // Format: [{name, email, role}]
        enable_ai_summary: enableAiSummary,
        // Ajouts pour la planification
        ...(schedulingData.mode === 'scheduled' ? {
          scheduled_at: schedulingData.starts_at,
          // Pour l'instant, garder la durée par défaut
          duration_minutes: 60
        } : {
          duration_minutes: 60
        })
      };

      console.log('📝 [SCHEDULER] Données du formulaire:', meetingData);

      const result = await createMeeting(meetingData);
      
      if (result.success) {
        console.log('✅ [SCHEDULER] Réunion créée avec succès:', result);
        
        if (schedulingData.mode === 'scheduled') {
          showToast(createSuccessToast(
            'Réunion planifiée !',
            `Programmée pour le ${scheduling.getDisplayDate()}`
          ));
          // Retourner à la liste des réunions
          setTimeout(() => navigate('/meetings'), 1500);
        } else {
          showToast(createSuccessToast(
            'Réunion créée !',
            'Vous pouvez maintenant la démarrer depuis la liste'
          ));
          
          // 🔄 CORRECTION: Pas de navigation automatique - retourner à la liste
          console.log('📋 [SCHEDULER] Réunion créée, retour à la liste pour éviter auto-join');
          setTimeout(() => {
            console.log('🧭 [SCHEDULER] Navigation vers /meetings');
            navigate('/meetings');
          }, 1500);
        }
      } else {
        throw new Error(result.error || 'Erreur lors de la création');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      showToast(createErrorToast('Erreur', errorMsg));
      console.error('❌ [SCHEDULER] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setEnableAiSummary(false);
    setError(null);
    scheduling.resetToDefault();
    // Note: participantsForm conserve l'organisateur mais on peut reset les invités si besoin
    showToast({
      type: 'info',
      title: 'Formulaire réinitialisé',
      duration: 2000
    });
  };

  return (
    <>
      <MeetingCreateCard
        progress={progress}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      >
        {/* Layout en grille 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Titre + Participants */}
          <div className="space-y-8">
            <MeetingTitleField
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              error={title.length > 100 ? 'Le titre est trop long' : null}
            />

            <ParticipantsBlock
              participants={participantsForm.participants}
              organizer={participantsForm.organizer}
              validation={participantsForm.validation}
              stats={participantsForm.stats}
              onAddParticipant={participantsForm.addParticipant}
              onRemoveParticipant={participantsForm.removeParticipant}
              onUpdateParticipant={participantsForm.updateParticipant}
              onBulkImport={participantsForm.addBulkParticipants}
              onUpdateOrganizer={participantsForm.setOrganizer}
            />
          </div>

          {/* Colonne droite : Planification + Options */}
          <div className="space-y-8">
            <SchedulingBlock
              mode={scheduling.mode}
              scheduledDate={scheduling.scheduledDate}
              timezone={scheduling.timezone}
              isValid={scheduling.isValid}
              validationError={scheduling.validationError}
              displayDate={scheduling.getDisplayDate()}
              onModeChange={scheduling.setMode}
              onDateChange={scheduling.setScheduledDate}
              onTimezoneChange={scheduling.setTimezone}
            />

            {/* Option : Résumé automatique par IA */}
            <div className={`p-4 rounded-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAiSummary}
                  onChange={(e) => setEnableAiSummary(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    🤖 Générer un résumé automatique
                  </div>
                  <div className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Active l'enregistrement de la réunion et génère automatiquement un résumé avec transcription, décisions et actions après la réunion.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Actions (pleine largeur) */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <ActionsBar
            onReset={handleReset}
            onSubmit={handleSubmit}
            loading={loading}
            canSubmit={canSubmit}
            isScheduled={scheduling.mode === 'scheduled'}
            scheduledDisplayDate={scheduling.getDisplayDate()}
          />
        </div>
      </MeetingCreateCard>

      {/* Container pour les toasts */}
      <ToastContainer 
        toasts={toasts} 
        onRemove={removeToast} 
        darkMode={darkMode}
      />
    </>
  );
}