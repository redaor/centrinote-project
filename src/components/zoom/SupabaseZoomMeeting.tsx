// 📅 Composant de gestion des réunions Zoom via Supabase OAuth
// Utilise les tokens automatiquement gérés par Supabase pour créer/gérer des réunions
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useSupabaseZoom } from '../../hooks/useSupabaseZoom';
import { n8nZoomIntegration } from '../../services/n8nZoomIntegration';
import { useAuth } from '../AuthProvider';

interface Meeting {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
}

export default function SupabaseZoomMeeting() {
  const { user } = useAuth();
  const { isConnected, loading, createMeeting, getMeetings } = useSupabaseZoom();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Formulaire de création
  const [newMeeting, setNewMeeting] = useState({
    topic: '',
    startTime: '',
    duration: 60,
    agenda: ''
  });

  useEffect(() => {
    if (isConnected) {
      loadMeetings();
    }
  }, [isConnected]);

  // Charger la liste des réunions
  const loadMeetings = async () => {
    if (!isConnected) return;

    try {
      setLoadingMeetings(true);
      setError(null);
      
      const meetingsList = await getMeetings();
      setMeetings(meetingsList);
      
    } catch (err) {
      console.error('❌ Erreur chargement réunions:', err);
      setError(err instanceof Error ? err.message : 'Erreur chargement réunions');
    } finally {
      setLoadingMeetings(false);
    }
  };

  // Créer une nouvelle réunion
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMeeting.topic.trim()) {
      setError('Le sujet de la réunion est requis');
      return;
    }

    try {
      setCreatingMeeting(true);
      setError(null);
      
      const startTime = newMeeting.startTime ? new Date(newMeeting.startTime) : undefined;
      
      const meeting = await createMeeting(
        newMeeting.topic.trim(),
        startTime,
        newMeeting.duration
      );
      
      console.log('✅ Réunion créée:', meeting);
      
      // Ajouter à la liste locale
      setMeetings(prev => [meeting, ...prev]);
      
      // Réinitialiser le formulaire
      setNewMeeting({
        topic: '',
        startTime: '',
        duration: 60,
        agenda: ''
      });
      
      // Optionnel : notifier n8n de la nouvelle réunion pour workflows automatiques
      if (user) {
        try {
          await n8nZoomIntegration.callWorkflow({
            workflow: 'zoom-meeting-created',
            userId: user.id,
            data: {
              meeting_id: meeting.id,
              topic: meeting.topic,
              join_url: meeting.join_url,
              created_via: 'supabase_oauth'
            },
            requiresZoomAuth: true
          });
        } catch (n8nError) {
          console.warn('⚠️ Erreur notification n8n (non bloquant):', n8nError);
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur création réunion:', err);
      setError(err instanceof Error ? err.message : 'Erreur création réunion');
    } finally {
      setCreatingMeeting(false);
    }
  };

  // Démarrer enregistrement via n8n
  const handleStartRecording = async (meetingId: number) => {
    if (!user) return;

    try {
      const result = await n8nZoomIntegration.startRecordingTranscription(user.id, meetingId.toString());
      
      if (result.success) {
        alert('✅ Enregistrement démarré avec succès !');
      } else {
        alert(`❌ Erreur: ${result.error}`);
      }
      
    } catch (err) {
      console.error('❌ Erreur démarrage enregistrement:', err);
      alert('❌ Erreur lors du démarrage de l\'enregistrement');
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-yellow-800">Connectez-vous à Zoom pour gérer vos réunions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de création */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">➕</span>
          Créer une nouvelle réunion
        </h3>
        
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujet de la réunion *
            </label>
            <input
              type="text"
              value={newMeeting.topic}
              onChange={(e) => setNewMeeting(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="Ex: Réunion équipe - Planning semaine"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date et heure (optionnel)
              </label>
              <input
                type="datetime-local"
                value={newMeeting.startTime}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour une réunion instantanée
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (minutes)
              </label>
              <select
                value={newMeeting.duration}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h30</option>
                <option value={120}>2 heures</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creatingMeeting || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {creatingMeeting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                <>
                  <span className="mr-2">📅</span>
                  Créer la réunion
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-red-500 text-xl mr-3">❌</span>
            <div>
              <h4 className="font-medium text-red-800">Erreur</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des réunions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📋</span>
            Mes réunions Zoom
          </h3>
          <button
            onClick={loadMeetings}
            disabled={loadingMeetings}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center text-sm"
          >
            {loadingMeetings ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                Chargement...
              </>
            ) : (
              <>
                <span className="mr-2">🔄</span>
                Actualiser
              </>
            )}
          </button>
        </div>
        
        {meetings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <p>Aucune réunion trouvée</p>
            <p className="text-sm mt-2">Créez votre première réunion ci-dessus</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">{meeting.topic}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>🆔 ID: {meeting.id}</p>
                      <p>🕒 Début: {new Date(meeting.start_time).toLocaleString('fr-FR')}</p>
                      <p>⏱️ Durée: {meeting.duration} minutes</p>
                      {meeting.password && <p>🔒 Mot de passe: {meeting.password}</p>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <a
                      href={meeting.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors text-center"
                    >
                      🔗 Rejoindre
                    </a>
                    
                    <button
                      onClick={() => handleStartRecording(meeting.id)}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      🎥 Enregistrer
                    </button>
                    
                    <button
                      onClick={() => navigator.clipboard.writeText(meeting.join_url)}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                    >
                      📋 Copier lien
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}