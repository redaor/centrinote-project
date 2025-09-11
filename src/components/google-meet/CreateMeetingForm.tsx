// 📝 Formulaire de création de réunion Google Meet
// Interface pour créer de nouvelles réunions avec Google Meet
// ==========================================================

import React, { useState } from 'react';
import { Calendar, Clock, Users, FileText, Video, Plus, X } from 'lucide-react';
import { useGoogleMeet } from '../../hooks/useGoogleMeet';
import { CreateMeetingRequest, GoogleCalendarEvent } from '../../types/google-meet';

interface CreateMeetingFormProps {
  onMeetingCreated?: (meeting: GoogleCalendarEvent) => void;
  darkMode: boolean;
}

export const CreateMeetingForm: React.FC<CreateMeetingFormProps> = ({
  onMeetingCreated,
  darkMode
}) => {
  const { createMeeting } = useGoogleMeet();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    attendees: ['']
  });

  // Gérer les changements de champs
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-remplir la date de fin si elle n'est pas définie
    if (field === 'startDate' && !formData.endDate) {
      setFormData(prev => ({
        ...prev,
        endDate: value
      }));
    }
  };

  // Ajouter un participant
  const addAttendee = () => {
    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, '']
    }));
  };

  // Supprimer un participant
  const removeAttendee = (index: number) => {
    if (formData.attendees.length > 1) {
      setFormData(prev => ({
        ...prev,
        attendees: prev.attendees.filter((_, i) => i !== index)
      }));
    }
  };

  // Mettre à jour un participant
  const updateAttendee = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map((att, i) => i === index ? email : att)
    }));
  };

  // Valider le formulaire
  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Le titre est requis';
    }
    
    if (!formData.startDate || !formData.startTime) {
      return 'La date et heure de début sont requises';
    }
    
    if (!formData.endDate || !formData.endTime) {
      return 'La date et heure de fin sont requises';
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (endDateTime <= startDateTime) {
      return 'L\'heure de fin doit être après l\'heure de début';
    }

    if (startDateTime < new Date()) {
      return 'La réunion ne peut pas être programmée dans le passé';
    }

    return null;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const request: CreateMeetingRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        timeZone: formData.timeZone,
        attendees: formData.attendees.filter(email => email.trim() && email.includes('@'))
      };

      const result = await createMeeting(request);

      if (result.success && result.meeting) {
        setSuccess(`Réunion créée avec succès ! Lien : ${result.meetingUrl}`);
        onMeetingCreated?.(result.meeting);
        
        // Réinitialiser le formulaire
        setFormData({
          title: '',
          description: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees: ['']
        });
      } else {
        setError(result.error || 'Erreur lors de la création de la réunion');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setIsCreating(false);
    }
  };

  // Obtenir la date/heure par défaut (dans 1 heure)
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    now.setSeconds(0);
    
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    
    return { date, time };
  };

  const defaultDateTime = getDefaultDateTime();

  return (
    <div className={`max-w-2xl mx-auto p-6 rounded-xl border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Créer une réunion Google Meet
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Planifiez une nouvelle visioconférence
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titre */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <FileText className="w-4 h-4 inline mr-2" />
            Titre de la réunion *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            placeholder="Ex: Réunion équipe - Point mensuel"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Description (optionnel)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            placeholder="Ordre du jour, objectifs, notes..."
          />
        </div>

        {/* Date et heure de début */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Calendar className="w-4 h-4 inline mr-2" />
              Date de début *
            </label>
            <input
              type="date"
              value={formData.startDate || defaultDateTime.date}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Clock className="w-4 h-4 inline mr-2" />
              Heure de début *
            </label>
            <input
              type="time"
              value={formData.startTime || defaultDateTime.time}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </div>
        </div>

        {/* Date et heure de fin */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Date de fin *
            </label>
            <input
              type="date"
              value={formData.endDate || defaultDateTime.date}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Heure de fin *
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <Users className="w-4 h-4 inline mr-2" />
            Participants (optionnel)
          </label>
          <div className="space-y-2">
            {formData.attendees.map((email, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateAttendee(index, e.target.value)}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="email@exemple.com"
                />
                {formData.attendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttendee(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addAttendee}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 border-dashed transition-colors ${
                darkMode
                  ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400'
                  : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un participant</span>
            </button>
          </div>
        </div>

        {/* Messages de statut */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={isCreating}
          className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isCreating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 hover:scale-105'
          } text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Création en cours...</span>
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              <span>Créer la réunion</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};