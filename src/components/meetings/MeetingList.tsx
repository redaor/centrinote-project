// 📋 Liste des réunions Daily.co
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, Calendar, Clock, Users, Video, Play, Trash2, 
  MoreVertical, Copy, Loader2, Search, Filter, AlertCircle, Mail, FileText, CheckCircle
} from 'lucide-react';
import { useMeetings, Meeting } from '../../hooks/useMeetings';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../components/AuthProvider';
import { ParticipantsForm } from './ParticipantsForm';
import { ParticipantsFormV2 } from './ParticipantsFormV2';
import { CreateMeetingPayload, MeetingParticipant } from '../../types/meetings';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { useSummary } from '../../hooks/useSummary';

export function MeetingList() {
  const { state } = useApp();
  const { darkMode } = state;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // ⚠️ IMPORTANT: Déclarer useMeetings() AVANT les useEffect qui l'utilisent
  const { 
    meetings, 
    loading, 
    error, 
    deleteMeeting, 
    totalMeetings, 
    activeCount, 
    completedCount,
    refresh 
  } = useMeetings();
  
  // 🔍 TRACE: Removed unnecessary effect that logs on every render

  // Nettoyer le message de confirmation après 5 secondes
  useEffect(() => {
    if (location.state?.meetingCompleted) {
      const timer = setTimeout(() => {
        // Nettoyer le state en remplaçant l'historique sans state
        navigate(location.pathname, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  // Gérer les paramètres URL pour les réunions terminées (depuis window.location.href)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const completedMeetingId = params.get('completed');
    
    if (completedMeetingId) {
      console.log('✅ [MEETINGS] Réunion terminée détectée depuis URL:', completedMeetingId);
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/meetings');
      
      // Afficher le message de confirmation
      // Le message sera affiché via la détection du statut 'completed' dans les réunions
      // Forcer un refresh pour mettre à jour les données
      setTimeout(() => {
        refresh();
      }, 500);
    }
  }, [refresh]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'active' | 'completed'>('all');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // États pour le formulaire de création avec participants
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [enableAiSummary, setEnableAiSummary] = useState(false);

  // Initialiser l'organisateur quand l'utilisateur est chargé (une seule fois)
  useEffect(() => {
    if (user && participants.length === 0) {
      const organizer: MeetingParticipant = {
        id: crypto.randomUUID(),  // 🆔 UUID stable
        name: user.name || user.email.split('@')[0],
        email: user.email,
        role: 'organizer'
      };

      setParticipants([organizer]);
    }
  }, [user, participants.length]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    if (!formTitle.trim()) {
      alert('Veuillez saisir un titre');
      return false;
    }

    if (!user) {
      alert('Utilisateur non connecté');
      return false;
    }

    // Vérifier que tous les participants ont un nom et email valide
    const invalidParticipants = participants.filter(p => 
      !p.name.trim() || !p.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
    );

    if (invalidParticipants.length > 0) {
      alert('Veuillez corriger les erreurs dans la liste des participants');
      return false;
    }

    // Vérifier les doublons
    const emails = participants.map(p => p.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    if (duplicates.length > 0) {
      alert('Des adresses email sont en doublon');
      return false;
    }

    return true;
  };

  // Fonction de création de réunion avec participants
  const handleCreateMeeting = async () => {
    if (!validateForm()) return;

    setCreateLoading(true);
    
      console.log('[CREATE] participants payload:', participants);

    try {
      const payload: CreateMeetingPayload = {
        title: formTitle.trim(),
        description: formDescription.trim() || 'Réunion créée avec participants',
        scheduled_at: new Date().toISOString(),
        duration_minutes: 60,
        participants,
        created_by: user!.id,
        enable_ai_summary: enableAiSummary
      };

      console.log('[CREATE] Full payload:', payload);
      console.log('[CREATE] Participants à envoyer:', participants.map(p => ({ name: p.name, email: p.email, role: p.role })));

      const response = await fetch('/.netlify/functions/create-meeting-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[CREATE] Response status:', response.status);
      
      const data = await response.json();
      console.log('[CREATE] Response data:', data);

      if (!data.success) {
        console.error('[CREATE] Failed:', data);
        alert(`❌ Erreur Daily (${response.status}): ${data.detail || data.reason || 'inconnue'}`);
        return;
      }

      console.log('✅ Réunion créée:', data.meetingId);
      console.log('📋 [CREATE] Données complètes reçues:', data);
      
      // Reset du formulaire AVANT le refresh pour éviter les conflits
      const createdTitle = formTitle.trim();
      setFormTitle('');
      setFormDescription('');
      setEnableAiSummary(false);
      setParticipants([{
        id: crypto.randomUUID(),
        name: user!.name || user!.email.split('@')[0],
        email: user!.email,
        role: 'organizer'
      }]);

      // 🔄 OPTIMISTIC UPDATE: Actualiser la liste immédiatement
      console.log('🔄 [CREATE] Actualisation de la liste après création...');

      // S'assurer que le filtre affiche toutes les réunions
      if (filterStatus !== 'all') {
        console.log('🔄 [CREATE] Réinitialisation du filtre à "all"');
        setFilterStatus('all');
      }

      // Refresh unique et simple
      await refresh();

      // Affichage de confirmation immédiat (non-bloquant)
      alert(`✅ Réunion "${createdTitle}" créée avec succès !`);

      console.log('✅ [CREATE] Réunion créée et liste actualisée');
      
      // ❌ PAS de redirection automatique - l'utilisateur doit cliquer sur "Démarrer"
      // Ne PAS naviguer automatiquement vers la réunion
      
    } catch (err) {
      console.error('[CREATE] Error:', err);
      alert('❌ Erreur de connexion: ' + (err as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  // 🚀 PERFORMANCE: Mémoriser le filtrage des réunions
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      const matchesSearch = !searchTerm ||
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || meeting.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [meetings, searchTerm, filterStatus]);
  
  // DEBUG: Log du filtrage (removed for performance)

  // 🚀 PERFORMANCE: Mémoriser la fonction sendInvitations
  const sendInvitations = useCallback(async (meeting: any) => {
    if (!meeting || !meeting.participants) return;
    
    const guests = meeting.participants.filter((p: any) => p.role !== 'organizer');
    if (guests.length === 0) {
      alert('Aucun invité à contacter');
      return;
    }
    
    const organizer = meeting.participants.find((p: any) => p.role === 'organizer');
    
    try {
      console.log('📧 [INVITES] Envoi invitations pour:', meeting.title);
      
      const payload = {
        meeting: {
          id: meeting.id,
          title: meeting.title,
          room_url: meeting.room_url,
          organizer: {
            name: organizer?.name || user?.name || user?.email?.split('@')[0],
            email: organizer?.email || user?.email
          }
        },
        invited: guests
      };
      
      const response = await fetch('/.netlify/functions/send-invites-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.results.sent}/${result.results.total} invitations envoyées`);
        if (result.results.failed.length > 0) {
          console.warn('Échecs:', result.results.failed);
        }
      } else {
        throw new Error(result.message || 'Erreur envoi invitations');
      }
    } catch (error) {
      console.error('❌ [INVITES] Erreur:', error);
      alert('❌ Erreur envoi invitations: ' + (error as Error).message);
    }
  }, [user]);

  // 🚀 PERFORMANCE: Mémoriser handleDelete
  const handleDelete = useCallback(async (meetingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réunion ?')) return;
    
    setDeleteLoading(meetingId);
    try {
      await deleteMeeting(meetingId);
    } catch (error) {
      console.error('Erreur suppression:', error);
    } finally {
      setDeleteLoading(null);
    }
  }, [deleteMeeting]);

  const copyRoomUrl = (roomUrl: string) => {
    navigator.clipboard.writeText(roomUrl);
    // TODO: Ajouter une notification toast
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled':
        return darkMode 
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
          : 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'active':
        return darkMode 
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'completed':
        return darkMode 
          ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' 
          : 'bg-slate-50 text-slate-700 border border-slate-200/60';
      case 'cancelled':
        return darkMode 
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
          : 'bg-rose-50 text-rose-700 border border-rose-200/60';
      default:
        return darkMode 
          ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' 
          : 'bg-slate-50 text-slate-700 border border-slate-200/60';
    }
  };

  const getStatusLabel = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'Planifiée';
      case 'active': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  // ✅ FIX: Ne pas montrer de loading screen si on a déjà des meetings en cache
  // Cela évite l'effet "page blanche" lors de la navigation
  const showLoadingScreen = loading && meetings.length === 0;

  if (showLoadingScreen) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Chargement des réunions...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎥 Mes Réunions
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Gérez vos réunions vidéo Daily.co
            </p>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <Link
              to="/meetings/new"
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvelle Réunion</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {totalMeetings}
                </p>
              </div>
              <Calendar className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </div>
          
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Actives</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeCount}
                </p>
              </div>
              <Video className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Terminées</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {completedCount}
                </p>
              </div>
              <Clock className={`w-8 h-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </div>
          </div>
          
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cette semaine</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {meetings.filter(m => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(m.created_at) > weekAgo;
                  }).length}
                </p>
              </div>
              <Users className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
          </div>
        </div>

        {/* Formulaire de création avec participants */}
        <div className={`mb-6 p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🚀 Créer une nouvelle réunion
          </h3>
          
          <div className="space-y-4">
            {/* Titre et description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Titre de la réunion *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Réunion équipe marketing"
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:border-blue-500 focus:ring-blue-500/20`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brève description..."
                  className={`w-full px-3 py-2 rounded border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:border-blue-500 focus:ring-blue-500/20`}
                />
              </div>
            </div>

            {/* Participants - Nouveau composant amélioré */}
            {user && (
              <ParticipantsFormV2
                participants={participants}
                onChange={setParticipants}
                organizer={{ name: user.name || user.email.split('@')[0], email: user.email }}
                darkMode={darkMode}
              />
            )}

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

            {/* Bouton de création */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setFormTitle('');
                  setFormDescription('');
                  setEnableAiSummary(false);
                  if (user) {
                    setParticipants([{
                      id: crypto.randomUUID(),  // 🆔 UUID stable
                      name: user.name || user.email.split('@')[0],
                      email: user.email,
                      role: 'organizer'
                    }]);
                  }
                }}
                disabled={createLoading}
                className={`px-4 py-2 rounded transition-colors ${
                  darkMode 
                    ? 'bg-gray-600 hover:bg-gray-700 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } disabled:opacity-50`}
              >
                Réinitialiser
              </button>
              
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={createLoading || !formTitle.trim() || !user}
                className={`flex items-center space-x-2 px-6 py-2 rounded transition-colors ${
                  createLoading || !formTitle.trim() || !user
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white disabled:opacity-50`}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Créer la réunion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Message de confirmation après quitter réunion */}
        {location.state?.meetingCompleted && (
          <div className={`mb-6 p-4 rounded-lg border animate-in slide-in-from-top duration-300 ${
            darkMode 
              ? 'bg-green-900/20 border-green-800 text-green-300' 
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <span className="font-medium">Réunion terminée</span>
                  <p className="text-sm mt-1">{location.state.message || 'Le résumé sera disponible dans quelques minutes.'}</p>
                </div>
              </div>
              {location.state.meetingId && (
                <Link
                  to={`/meetings/${location.state.meetingId}/summary`}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    darkMode
                      ? 'bg-green-700 hover:bg-green-600 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } hover:scale-105 active:scale-95`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Voir le résumé
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg border ${
            darkMode 
              ? 'bg-red-900/20 border-red-800 text-red-300' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Erreur</span>
            </div>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {/* Liste des réunions */}
        {filteredMeetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                darkMode={darkMode}
                onDelete={handleDelete}
                onCopyUrl={copyRoomUrl}
                onSendInvites={sendInvitations}
                deleteLoading={deleteLoading === meeting.id}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Video className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {searchTerm || filterStatus !== 'all' ? 'Aucune réunion trouvée' : 'Aucune réunion'}
            </h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchTerm || filterStatus !== 'all' 
                ? 'Essayez de modifier vos filtres de recherche.'
                : 'Créez votre première réunion vidéo pour commencer.'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <Link
                to="/meetings/new"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Créer une réunion</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 📊 Moniteur de performance */}
      <PerformanceMonitor darkMode={darkMode} />
    </div>
  );
}

// 🚀 PERFORMANCE: Composant MeetingCard mémorisé pour éviter les re-renders
const MeetingCard = React.memo(({ 
  meeting, 
  darkMode, 
  onDelete, 
  onCopyUrl, 
  onSendInvites,
  deleteLoading,
  getStatusColor,
  getStatusLabel,
  formatDate
}: {
  meeting: Meeting;
  darkMode: boolean;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
  onSendInvites: (meeting: Meeting) => void;
  deleteLoading: boolean;
  getStatusColor: (status: Meeting['status']) => string;
  getStatusLabel: (status: Meeting['status']) => string;
  formatDate: (date: string) => string;
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Polling du résumé pour les réunions terminées OU qui ont un enregistrement/transcription/résumé
  // ✅ Vérifier si la réunion a un enregistrement, une transcription ou un résumé IA
  const hasRecording = !!meeting.recording_url;
  const hasTranscript = !!meeting.transcript;
  const hasSummary = !!meeting.ai_summary;
  const isOver = meeting.status === 'completed' || !!meeting.ended_at || hasRecording || hasTranscript || hasSummary;

  const { summary } = useSummary(
    isOver ? meeting.id : null,
    {
      enabled: isOver,
      refetchInterval: isOver ? 5000 : undefined // Poll toutes les 5s jusqu'à ce que summary existe
    }
  );

  return (
    <div className={`
      ${darkMode 
        ? 'bg-gradient-to-br from-gray-800/50 to-gray-800 border-gray-700/50' 
        : 'bg-gradient-to-br from-white to-gray-50/50 border-gray-200/60'
      } 
      border rounded-2xl p-5 
      hover:shadow-lg hover:shadow-blue-500/10 
      transition-all duration-300 
      hover:border-blue-300/40 dark:hover:border-blue-600/30
      hover:-translate-y-0.5
    `}>
      {/* Bandeau "Réunion terminée" avec état génération */}
      {isOver && !summary && (
        <div className={`mb-4 p-3 rounded-xl border backdrop-blur-sm ${
          darkMode 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-amber-50/80 border-amber-200/60'
        }`}>
          <div className="flex items-center space-x-2.5">
            <Loader2 className={`w-3.5 h-3.5 animate-spin ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
              Réunion terminée – génération du résumé en cours…
            </span>
          </div>
        </div>
      )}
      
      {/* Bandeau "Réunion terminée" avec bouton résumé */}
      {isOver && summary && (
        <div className={`mb-4 p-3.5 rounded-xl border backdrop-blur-sm ${
          darkMode 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-emerald-50/80 border-emerald-200/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span className={`text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                Réunion terminée
              </span>
            </div>
            <Link
              to={`/meetings/${meeting.id}/summary`}
              className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                darkMode
                  ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              } hover:scale-105 active:scale-95`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Voir le résumé</span>
            </Link>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 pr-3">
          <h3 className={`font-semibold text-base mb-1.5 leading-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {meeting.title}
          </h3>
          {meeting.description && (
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
              {meeting.description}
            </p>
          )}
        </div>
        
        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1.5 rounded-lg transition-all ${
              darkMode 
                ? 'hover:bg-gray-700/60 text-gray-400 hover:text-gray-300' 
                : 'hover:bg-gray-100/80 text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          
          {showMenu && (
            <div className={`absolute right-0 top-10 z-10 w-48 rounded-xl shadow-xl border backdrop-blur-sm ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-600/50 shadow-gray-900/50' 
                : 'bg-white/95 border-gray-200/60 shadow-gray-900/10'
            }`}>
              <button
                onClick={() => {
                  onCopyUrl(meeting.room_url);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 text-left transition-colors rounded-lg ${
                  darkMode 
                    ? 'hover:bg-gray-700/60 text-gray-300' 
                    : 'hover:bg-blue-50/80 text-gray-700'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="text-sm">Copier le lien</span>
              </button>
              {/* Bouton envoi invitations */}
              <button
                onClick={() => {
                  onSendInvites(meeting);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 text-left transition-colors rounded-lg ${
                  darkMode 
                    ? 'hover:bg-gray-700/60 text-gray-300' 
                    : 'hover:bg-blue-50/80 text-gray-700'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="text-sm">Envoyer invitations ({meeting.participants?.filter((p: any) => p.role !== 'organizer').length || 0})</span>
              </button>
              <button
                onClick={() => {
                  onDelete(meeting.id);
                  setShowMenu(false);
                }}
                disabled={deleteLoading}
                className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-left text-red-500 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors rounded-lg disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span className="text-sm">Supprimer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statut et info */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
          {getStatusLabel(meeting.status)}
        </span>
        
        {meeting.participants.length > 0 && (
          <div className={`flex items-center space-x-1.5 text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Users className="w-3 h-3" />
            <span>{meeting.participants.length}</span>
          </div>
        )}
      </div>

      {/* Date */}
      {meeting.scheduled_at && (
        <div className={`flex items-center space-x-2 text-sm mb-4 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(meeting.scheduled_at)}</span>
        </div>
      )}


      {/* Action */}
      {/* ✅ Masquer le bouton "Démarrer" si la réunion est terminée et résumée */}
      {!(isOver && summary) && (
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              console.log('🎯 [BUTTON-START] === CLIC BOUTON DÉMARRER ===');
              console.log('📊 [BUTTON-START] État actuel:', {
                timestamp: new Date().toISOString(),
                meetingId: meeting.id,
                title: meeting.title,
                status: meeting.status,
                roomUrl: meeting.room_url,
                hasRoomUrl: !!meeting.room_url,
                participants: meeting.participants?.length || 0,
                currentPath: window.location.pathname,
                targetPath: `/meeting/${meeting.id}`
              });
              
              // Vérification basique - seulement l'ID est requis
              if (!meeting.id) {
                console.error('❌ [BUTTON-START] ID manquant, impossible de continuer');
                alert('❌ Erreur: ID de réunion manquant');
                return;
              }
              
              // Marquer comme en cours de navigation
              setIsNavigating(true);
              
              // NAVIGATION FORCÉE - Toujours utiliser window.location pour garantir le changement
              const targetUrl = `/meeting/${meeting.id}`;
              console.log('🚀 [BUTTON-START] Navigation FORCÉE vers:', targetUrl);
              
              // Force la navigation avec window.location.href (plus fiable)
              window.location.href = targetUrl;
              
              // Log pour confirmer
              console.log('✅ [BUTTON-START] Navigation déclenchée avec window.location.href');
              
              // Reset après un délai (au cas où la navigation échoue)
              setTimeout(() => setIsNavigating(false), 3000);
            }}
            disabled={isNavigating} // Désactiver pendant la navigation
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              isNavigating
                ? 'bg-gray-400 cursor-wait opacity-75'
                : meeting.status === 'active'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white cursor-pointer shadow-lg shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white cursor-pointer shadow-lg shadow-blue-500/30'
            } hover:scale-105 active:scale-95 hover:shadow-xl`}
            title={
              isNavigating
                ? 'Chargement...'
                : meeting.status === 'active' 
                  ? 'Rejoindre la réunion en cours' 
                  : 'Démarrer la réunion'
            }
          >
          {isNavigating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Chargement...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>
                {meeting.status === 'active' ? 'Rejoindre' : 'Démarrer'}
              </span>
            </>
          )}
          </button>
        </div>
      )}
    </div>
  );
});