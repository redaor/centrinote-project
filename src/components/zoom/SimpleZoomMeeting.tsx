import React, { useState } from 'react';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

interface MeetingFormData {
  topic: string;
  duration: number;
  password?: string;
  start_time?: string;
  agenda?: string;
}

interface ZoomMeetingResponse {
  id: number;
  topic: string;
  join_url: string;
  start_url: string;
  password?: string;
  start_time: string;
}

const SimpleZoomMeeting: React.FC = () => {
  const { user } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [meetingData, setMeetingData] = useState<ZoomMeetingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<MeetingFormData>({
    topic: '',
    duration: 60,
    password: '',
    agenda: ''
  });

  const N8N_MEETING_WEBHOOK = import.meta.env.VITE_N8N_ZOOM_MEETING_WEBHOOK || 'https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) : value
    }));
  };

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Vous devez être connecté pour créer une réunion');
      return;
    }

    if (!formData.topic.trim()) {
      setError('Le sujet de la réunion est obligatoire');
      return;
    }

    setLoading(true);
    setError(null);
    setMeetingData(null);

    try {
      const payload = {
        action: 'create_meeting',
        user_id: user.id,
        meeting_data: {
          topic: formData.topic,
          duration: formData.duration,
          password: formData.password || undefined,
          agenda: formData.agenda || undefined,
          type: 1, // Meeting instantané
          settings: {
            host_video: true,
            participant_video: true,
            cn_meeting: false,
            in_meeting: false,
            join_before_host: false,
            mute_upon_entry: false,
            watermark: false,
            use_pmi: false,
            approval_type: 2,
            audio: 'both',
            auto_recording: 'none'
          }
        }
      };

      console.log('🚀 Création réunion Zoom via n8n...', { 
        webhook_url: N8N_MEETING_WEBHOOK,
        payload: payload
      });

      const response = await fetch(N8N_MEETING_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response status:', response.status, response.statusText);
      
      let result;
      try {
        result = await response.json();
        console.log('📥 Response JSON:', result);
      } catch (parseError) {
        const textResponse = await response.text();
        console.log('📄 Response text:', textResponse);
        throw new Error(`Response parsing failed: ${textResponse}`);
      }

      if (response.ok && result.success) {
        console.log('✅ Réunion créée avec succès:', result.meeting);
        setMeetingData(result.meeting);
        
        // Réinitialiser le formulaire
        setFormData({
          topic: '',
          duration: 60,
          password: '',
          agenda: ''
        });
      } else {
        throw new Error(result.error || 'Erreur lors de la création de la réunion');
      }
    } catch (err: any) {
      console.error('❌ Erreur création réunion:', err);
      setError(err.message || 'Erreur lors de la création de la réunion');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Lien copié dans le presse-papiers !');
    });
  };

  const startMeetingNow = () => {
    if (meetingData?.start_url) {
      window.open(meetingData.start_url, '_blank');
    }
  };

  const joinMeeting = () => {
    if (meetingData?.join_url) {
      window.open(meetingData.join_url, '_blank');
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-600">Connectez-vous pour créer des réunions Zoom</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de création */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">📅</span>
          Créer une réunion Zoom
        </h3>

        <form onSubmit={createMeeting} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujet de la réunion *
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Réunion équipe projet"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (minutes)
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="15"
                max="1440"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe (optionnel)
              </label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Laisser vide pour aucun mot de passe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordre du jour (optionnel)
            </label>
            <textarea
              name="agenda"
              value={formData.agenda}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez les points à aborder..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Création en cours...' : '🚀 Créer la réunion'}
          </button>
        </form>
      </div>

      {/* Affichage des erreurs */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Affichage du résultat */}
      {meetingData && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <span className="mr-2">✅</span>
            Réunion créée avec succès !
          </h4>

          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-700">Sujet :</p>
              <p className="text-gray-900">{meetingData.topic}</p>
            </div>

            <div>
              <p className="font-medium text-gray-700">ID de la réunion :</p>
              <p className="text-gray-900 font-mono">{meetingData.id}</p>
            </div>

            {meetingData.password && (
              <div>
                <p className="font-medium text-gray-700">Mot de passe :</p>
                <p className="text-gray-900 font-mono">{meetingData.password}</p>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <p className="font-medium text-gray-700 mb-1">Lien pour démarrer (hôte) :</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meetingData.start_url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(meetingData.start_url)}
                    className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    📋 Copier
                  </button>
                </div>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">Lien pour rejoindre (participants) :</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meetingData.join_url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(meetingData.join_url)}
                    className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    📋 Copier
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={startMeetingNow}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                🎥 Démarrer maintenant (Hôte)
              </button>
              <button
                onClick={joinMeeting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                👥 Rejoindre (Participant)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleZoomMeeting;