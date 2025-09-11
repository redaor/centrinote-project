// 📋 Liste des réunions Google Meet
// Composant pour afficher et gérer les réunions existantes
// ========================================================

import React from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  ExternalLink, 
  Trash2, 
  RefreshCw,
  Video,
  MapPin
} from 'lucide-react';
import { GoogleCalendarEvent } from '../../types/google-meet';
import { useGoogleMeet } from '../../hooks/useGoogleMeet';

interface MeetingsListProps {
  meetings: GoogleCalendarEvent[];
  loading: boolean;
  onRefresh: () => void;
  darkMode: boolean;
}

export const MeetingsList: React.FC<MeetingsListProps> = ({
  meetings,
  loading,
  onRefresh,
  darkMode
}) => {
  const { deleteMeeting } = useGoogleMeet();

  // Formater la date et heure
  const formatDateTime = (dateTimeStr: string, timeZone: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone
      }),
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      })
    };
  };

  // Obtenir le lien Google Meet
  const getMeetingUrl = (meeting: GoogleCalendarEvent): string | null => {
    return meeting.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || null;
  };

  // Supprimer une réunion
  const handleDeleteMeeting = async (eventId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réunion ?')) {
      const success = await deleteMeeting(eventId);
      if (success) {
        onRefresh();
      }
    }
  };

  // Déterminer le statut de la réunion
  const getMeetingStatus = (meeting: GoogleCalendarEvent) => {
    const now = new Date();
    const startTime = new Date(meeting.start.dateTime);
    const endTime = new Date(meeting.end.dateTime);

    if (now < startTime) {
      return { status: 'upcoming', label: 'À venir', color: 'blue' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'ongoing', label: 'En cours', color: 'green' };
    } else {
      return { status: 'ended', label: 'Terminée', color: 'gray' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Mes réunions Google Meet
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {meetings.length} réunion{meetings.length !== 1 ? 's' : ''} trouvée{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
            ${darkMode 
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Liste des réunions */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Chargement des réunions...
            </p>
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <div className={`
          text-center py-12 rounded-xl border-2 border-dashed
          ${darkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50/50'}
        `}>
          <Calendar className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Aucune réunion trouvée
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Vos prochaines réunions Google Meet apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => {
            const startDateTime = formatDateTime(meeting.start.dateTime, meeting.start.timeZone);
            const endDateTime = formatDateTime(meeting.end.dateTime, meeting.end.timeZone);
            const meetingUrl = getMeetingUrl(meeting);
            const status = getMeetingStatus(meeting);

            return (
              <div
                key={meeting.id}
                className={`
                  p-6 rounded-xl border transition-all duration-200 hover:shadow-lg
                  ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* En-tête de la réunion */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {meeting.summary || 'Réunion sans titre'}
                        </h3>
                        {meeting.description && (
                          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {meeting.description.length > 100 
                              ? `${meeting.description.substring(0, 100)}...`
                              : meeting.description
                            }
                          </p>
                        )}
                      </div>
                      
                      {/* Statut de la réunion */}
                      <div className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${status.color === 'blue' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : status.color === 'green'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }
                      `}>
                        {status.label}
                      </div>
                    </div>

                    {/* Détails de la réunion */}
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {startDateTime.date}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {startDateTime.time} - {endDateTime.time}
                        </span>
                      </div>

                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Users className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {meeting.attendees.length} participant{meeting.attendees.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <MapPin className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {meeting.start.timeZone}
                        </span>
                      </div>
                    </div>

                    {/* Participants (si présents) */}
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="space-y-1">
                        <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Participants :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {meeting.attendees.slice(0, 3).map((attendee, index) => (
                            <span
                              key={index}
                              className={`
                                px-2 py-1 rounded-full text-xs
                                ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}
                              `}
                            >
                              {attendee.displayName || attendee.email}
                            </span>
                          ))}
                          {meeting.attendees.length > 3 && (
                            <span className={`
                              px-2 py-1 rounded-full text-xs
                              ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}
                            `}>
                              +{meeting.attendees.length - 3} autres
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    {meetingUrl && (
                      <a
                        href={meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                          flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
                          ${status.status === 'ongoing'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : darkMode
                              ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }
                        `}
                      >
                        <Video className="w-4 h-4" />
                        <span>
                          {status.status === 'ongoing' ? 'Rejoindre' : 'Lien Meet'}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <a
                      href={meeting.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors
                        ${darkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Voir dans Calendar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Bouton de suppression */}
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    className={`
                      p-2 rounded-lg transition-colors
                      ${darkMode 
                        ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' 
                        : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                      }
                    `}
                    title="Supprimer la réunion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};