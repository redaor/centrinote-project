// 📋 Liste des réunions Daily.co
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Calendar, Clock, Users, Video, Play, Trash2,
  MoreVertical, Copy, Loader2, Search, Filter, AlertCircle, Mail, FileText, CheckCircle,
  ArrowDownAZ, ArrowUpZA, X
} from 'lucide-react';
import { useMeetings, Meeting } from '../../hooks/useMeetings';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../components/AuthProvider';
import { ParticipantsForm } from './ParticipantsForm';
import { ParticipantsFormV2 } from './ParticipantsFormV2';
import { CreateMeetingPayload, MeetingParticipant } from '../../types/meetings';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { useSummary } from '../../hooks/useSummary';
import { MeetingProgress } from './MeetingProgress';
import { ModernCompletedMeetingCard } from './ModernCompletedMeetingCard';
import { ModernMeetingStats } from './ModernMeetingStats';
import { ModernMeetingForm } from './ModernMeetingForm';
import { useQuotaCheck } from '../../hooks/useQuotaCheck';
import { checkMeetingDurationLimit } from '../../services/quotaService';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';

export function MeetingList() {
  const { state } = useApp();
  const { darkMode } = state;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { check: checkQuota, increment: incrementQuotaUsage } = useQuotaCheck();
  const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();
  
  // ⚠️ IMPORTANT: Déclarer useMeetings() AVANT les useEffect qui l'utilisent
  const {
    meetings,
    loading,
    error,
    createMeeting: createMeetingFromHook,
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // A-Z par défaut
  const [completedSearchTerm, setCompletedSearchTerm] = useState(''); // Recherche spécifique aux réunions terminées
  
  // États pour le formulaire de création avec participants
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [enableAiSummary, setEnableAiSummary] = useState(false);
  const [canCreateMeeting, setCanCreateMeeting] = useState(true);
  const [checkingQuota, setCheckingQuota] = useState(true);

  // Vérifier le quota de réunions au chargement pour désactiver le bouton si nécessaire
  useEffect(() => {
    const checkMeetingQuota = async () => {
      // Attendre que l'utilisateur soit chargé
      if (!user?.id) {
        setCheckingQuota(false);
        setCanCreateMeeting(true); // Par défaut, permettre la création
        return;
      }

      try {
        setCheckingQuota(true);
        // Utiliser checkQuota du hook (qui gère déjà user.id en interne)
        const result = await checkQuota('meeting_count', 1);
        setCanCreateMeeting(result.allowed);
      } catch (error) {
        // Afficher l'erreur complète pour le debug
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Ignorer les erreurs réseau et timeout (normales)
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Timeout')) {
          // Ignorer silencieusement - permettre la création par défaut
          setCanCreateMeeting(true);
          return;
        }
        // Ne pas logger l'erreur "Utilisateur non connecté" car c'est normal au chargement
        if (!errorMessage.includes('Utilisateur non connecté')) {
          console.error('Erreur vérification quota réunion:', errorMessage, error);
        }
        // En cas d'erreur, permettre la création (la vérification se fera au moment de la création)
        setCanCreateMeeting(true);
      } finally {
        setCheckingQuota(false);
      }
    };

    // Attendre un peu pour que l'utilisateur soit chargé
    const timeoutId = setTimeout(() => {
      checkMeetingQuota();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user?.id, checkQuota]);

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
  const handleCreateMeeting = async (overrideData?: {
    title: string;
    description: string;
    participants: MeetingParticipant[];
    enableAiSummary: boolean;
  }) => {
    // Utiliser les données passées en paramètre ou les états locaux
    const meetingTitle = overrideData?.title || formTitle;
    const meetingDescription = overrideData?.description || formDescription;
    const meetingParticipants = overrideData?.participants || participants;
    const meetingEnableAiSummary = overrideData?.enableAiSummary ?? enableAiSummary;

    // Validation avec les données correctes
    if (!meetingTitle.trim()) {
      alert('Veuillez saisir un titre');
      return;
    }

    if (!user) {
      alert('Utilisateur non connecté');
      return;
    }

    // Vérifier que tous les participants ont un nom et email valide
    const invalidParticipants = meetingParticipants.filter(p =>
      !p.name.trim() || !p.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
    );

    if (invalidParticipants.length > 0) {
      alert('Veuillez corriger les erreurs dans la liste des participants');
      return;
    }

    // Vérifier les doublons
    const emails = meetingParticipants.map(p => p.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);

    if (duplicates.length > 0) {
      alert('Des adresses email sont en doublon');
      return;
    }

    setCreateLoading(true);

    try {
      // Vérifier les quotas avant création avec modals
      // Vérifier le quota de réunions
      const canCreateMeeting = await checkQuotaWithModal('meeting', 1);
      if (!canCreateMeeting) {
        setCreateLoading(false);
        return;
      }

      // Vérifier la durée de réunion
      const durationCheck = await checkMeetingDurationLimit(user!.id, 60);
      if (!durationCheck.allowed) {
        // Afficher modal pour durée limitée
        const canProceed = await checkQuotaWithModal('meeting', 1);
        if (!canProceed) {
          setCreateLoading(false);
          return;
        }
      }

      // Vérifier le quota de résumés si activé
      if (meetingEnableAiSummary) {
        const canGenerateSummary = await checkQuotaWithModal('summary', 1);
        if (!canGenerateSummary) {
          setEnableAiSummary(false);
        }
      }

      console.log('[CREATE] participants payload:', meetingParticipants);

      const payload: CreateMeetingPayload = {
        title: meetingTitle.trim(),
        description: meetingDescription.trim() || 'Réunion créée avec participants',
        scheduled_at: new Date().toISOString(),
        duration_minutes: 60,
        participants: meetingParticipants,
        created_by: user!.id,
        enable_ai_summary: meetingEnableAiSummary
      };

      console.log('[CREATE] Full payload:', payload);
      console.log('[CREATE] Participants à envoyer:', participants.map(p => ({ name: p.name, email: p.email, role: p.role })));

      // ✅ Utiliser la Supabase Edge Function via le hook useMeetings
      // Cette fonction utilise les secrets Supabase (DAILY_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
      const data = await createMeetingFromHook({
        title: payload.title,
        description: payload.description,
        scheduled_at: payload.scheduled_at,
        duration_minutes: payload.duration_minutes,
        participants: payload.participants,
        enable_ai_summary: payload.enable_ai_summary
      });

      console.log('[CREATE] Response data:', data);

      if (!data?.success) {
        console.error('[CREATE] Failed:', data);
        alert(`❌ Erreur création réunion: ${data?.error || data?.detail || 'inconnue'}`);
        setCreateLoading(false);
        return;
      }

      console.log('✅ Réunion créée:', data.meetingId);
      console.log('📋 [CREATE] Données complètes reçues:', data);
      
      // Incrémenter les quotas après création réussie
      try {
        await incrementQuotaUsage('meeting_count', 1);
        await incrementQuotaUsage('meeting_minutes', 60);
        if (enableAiSummary) {
          await incrementQuotaUsage('summary_count', 1);
        }
      } catch (quotaError) {
        console.error('⚠️ Erreur incrémentation quota (non bloquant):', quotaError);
      }
      
      // Reset du formulaire AVANT le refresh pour éviter les conflits
      const createdTitle = meetingTitle.trim();
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

  // 🚀 PERFORMANCE: Mémoriser le filtrage des réunions (sans tri ni recherche)
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      const matchesSearch = !searchTerm ||
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || meeting.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [meetings, searchTerm, filterStatus]);

  // Séparer les réunions terminées avec recherche et tri spécifiques
  const completedMeetings = useMemo(() => {
    const completed = filteredMeetings.filter(meeting => {
      const hasRecording = !!meeting.recording_url;
      const hasTranscript = !!meeting.transcript;
      const hasSummary = !!meeting.ai_summary;
      return meeting.status === 'completed' ||
             !!meeting.ended_at ||
             hasRecording ||
             hasTranscript ||
             hasSummary;
    });

    console.log('🔍 [COMPLETED] Réunions terminées avant recherche:', completed.length, completed.map(m => m.title));

    // Appliquer la recherche spécifique aux réunions terminées
    const searched = completed.filter(meeting => {
      if (!completedSearchTerm) return true;
      return meeting.title.toLowerCase().includes(completedSearchTerm.toLowerCase()) ||
             meeting.description?.toLowerCase().includes(completedSearchTerm.toLowerCase());
    });

    console.log('🔍 [COMPLETED] Après recherche (term="' + completedSearchTerm + '"):', searched.length, searched.map(m => m.title));

    // Appliquer le tri alphabétique (créer une copie pour éviter la mutation)
    const sorted = [...searched].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      const comparison = titleA.localeCompare(titleB, 'fr-FR', {
        sensitivity: 'base',
        numeric: true
      });
      // asc = A-Z (comparison normal), desc = Z-A (comparison inversé)
      const result = sortOrder === 'asc' ? comparison : -comparison;
      return result;
    });

    console.log('🔍 [COMPLETED] Après tri (' + sortOrder + '):', sorted.length, sorted.map(m => m.title));
    console.log('🔍 [COMPLETED] Premier titre:', sorted[0]?.title, '| Dernier titre:', sorted[sorted.length - 1]?.title);

    return sorted;
  }, [filteredMeetings, completedSearchTerm, sortOrder]);

  const activeMeetings = useMemo(() => {
    return filteredMeetings.filter(meeting => {
      const hasRecording = !!meeting.recording_url;
      const hasTranscript = !!meeting.transcript;
      const hasSummary = !!meeting.ai_summary;
      const isCompleted = meeting.status === 'completed' || 
                         !!meeting.ended_at || 
                         hasRecording || 
                         hasTranscript || 
                         hasSummary;
      return !isCompleted;
    });
  }, [filteredMeetings]);
  
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
      
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.functions.invoke('send-invites-batch', {
        body: payload
      });
      
      if (error) {
        throw new Error(error.message || 'Erreur envoi invitations');
      }
      
      if (data?.success) {
        alert(`✅ ${data.results.sent}/${data.results.total} invitations envoyées`);
        if (data.results.failed.length > 0) {
          console.warn('Échecs:', data.results.failed);
        }
      } else {
        throw new Error(data?.error || data?.message || 'Erreur envoi invitations');
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4 md:p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎥 Mes Réunions
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérez vos réunions vidéo Daily.co
            </p>
          </div>
          <div className="flex space-x-2 mt-3 md:mt-0">
            {checkingQuota ? (
              <div className="flex items-center space-x-2 px-4 py-2 md:px-6 md:py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm md:text-base">
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                <span>Vérification...</span>
              </div>
            ) : !canCreateMeeting ? (
              <button
                onClick={async () => {
                  // Afficher le modal d'upgrade
                  await checkQuotaWithModal('meeting', 1);
                }}
                className="flex items-center space-x-2 px-4 py-2 md:px-6 md:py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm md:text-base relative group"
                title="Quota de réunions atteint. Cliquez pour voir les options d'upgrade."
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>Quota atteint</span>
              </button>
            ) : (
              <Link
                to="/meetings/new"
                className="flex items-center space-x-2 px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>Nouvelle Réunion</span>
              </Link>
            )}
          </div>
        </div>

        {/* Stats modernes */}
        <ModernMeetingStats
          total={totalMeetings}
          active={activeCount}
          completed={completedCount}
          weekly={meetings.filter(m => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(m.created_at) > weekAgo;
          }).length}
          darkMode={darkMode}
        />

        {/* Formulaire de création moderne */}
        {user && (
          <ModernMeetingForm
            onSubmit={async (data) => {
              // Appeler directement avec les données du formulaire
              await handleCreateMeeting(data);
            }}
            onReset={() => {
              setFormTitle('');
              setFormDescription('');
              setEnableAiSummary(false);
              if (user) {
                setParticipants([{
                  id: crypto.randomUUID(),
                  name: user.name || user.email.split('@')[0],
                  email: user.email,
                  role: 'organizer'
                }]);
              }
            }}
            organizer={{
              name: user.name || user.email.split('@')[0],
              email: user.email
            }}
            darkMode={darkMode}
            isLoading={createLoading}
            canCreate={canCreateMeeting}
            checkingQuota={checkingQuota}
          />
        )}

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

        {/* Liste des réunions actives */}
        {activeMeetings.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Réunions actives
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeMeetings.map(meeting => (
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
          </div>
        )}

        {/* Section réunions terminées avec design moderne */}
        {completedMeetings.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 Résumés de Réunion
              </h2>

              {/* Barre de recherche et tri */}
              <div className="flex items-center gap-2">
                {/* Champ de recherche */}
                <div className="relative flex-1 sm:w-64">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={completedSearchTerm}
                    onChange={(e) => setCompletedSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setCompletedSearchTerm('');
                      }
                    }}
                    className={`
                      w-full pl-9 pr-8 py-1.5 rounded-lg text-sm border-2
                      transition-all duration-200
                      ${darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    `}
                  />
                  {/* Bouton pour vider la recherche */}
                  <button
                    onClick={() => setCompletedSearchTerm('')}
                    className={`
                      absolute right-1.5 top-1/2 transform -translate-y-1/2 p-0.5 rounded
                      transition-all z-20
                      ${completedSearchTerm
                        ? 'opacity-100 pointer-events-auto hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'opacity-0 pointer-events-none'
                      }
                    `}
                    aria-label="Vider la recherche"
                    tabIndex={completedSearchTerm ? 0 : -1}
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                {/* Bouton de tri A-Z / Z-A */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${darkMode
                      ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border-2 border-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                    }
                  `}
                  aria-label={sortOrder === 'asc' ? 'Trier A-Z' : 'Trier Z-A'}
                  title={sortOrder === 'asc' ? 'Trier A-Z' : 'Trier Z-A'}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowDownAZ className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpZA className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline text-[10px]">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </button>

                {/* Badge compteur */}
                <span className={`
                  text-sm px-3 py-1.5 rounded-lg
                  ${darkMode
                    ? 'bg-gray-800 text-gray-300 border-2 border-gray-700'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                  }
                `}>
                  {completedMeetings.length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {completedMeetings.map((meeting, idx) => {
                if (idx === 0) {
                  console.log(`🔍 [MAP] Rendering ${completedMeetings.length} cards, sortOrder: ${sortOrder}`);
                }
                return (
                  <div key={meeting.id} className="w-full">
                    <ModernCompletedMeetingCard
                      meeting={meeting}
                      darkMode={darkMode}
                      index={idx}
                      onViewSummary={(meetingId) => navigate(`/meetings/${meetingId}/summary`)}
                      onDownloadSummary={(meetingId) => {
                        // TODO: Implémenter le téléchargement
                        console.log('Télécharger résumé:', meetingId);
                      }}
                      onRefresh={refresh}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message si aucune réunion */}
        {filteredMeetings.length === 0 && (
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
      
      {/* Modal de limite de quota */}
      {quotaModal}
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

  // Calcul du pourcentage de progression pour la génération du résumé
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  useEffect(() => {
    if (isOver && !summary) {
      // Simuler une progression basée sur le temps écoulé depuis la fin de la réunion
      const endTime = meeting.ended_at ? new Date(meeting.ended_at).getTime() : Date.now();
      const now = Date.now();
      const elapsed = (now - endTime) / 1000; // secondes
      
      // Estimation : génération prend environ 30-60 secondes
      const estimatedDuration = 45; // secondes
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95); // Max 95% jusqu'à ce que le résumé soit réellement disponible
      
      setProgressPercentage(Math.round(progress));
      setEstimatedTime(Math.max(0, Math.round(estimatedDuration - elapsed)));
      
      // Mettre à jour toutes les secondes
      const interval = setInterval(() => {
        const newElapsed = (Date.now() - endTime) / 1000;
        const newProgress = Math.min((newElapsed / estimatedDuration) * 100, 95);
        setProgressPercentage(Math.round(newProgress));
        setEstimatedTime(Math.max(0, Math.round(estimatedDuration - newElapsed)));
      }, 1000);

      return () => clearInterval(interval);
    } else if (summary) {
      setProgressPercentage(100);
      setEstimatedTime(null);
    }
  }, [isOver, summary, meeting.ended_at]);

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
      {/* Barre de progression dynamique pour la génération du résumé */}
      {isOver && !summary && (
        <MeetingProgress
          status="generating"
          percentage={progressPercentage}
          eta={estimatedTime || undefined}
          darkMode={darkMode}
          meetingId={meeting.id}
          steps={['Analyse audio', 'Transcription', 'Génération résumé']}
          currentStep={progressPercentage < 33 ? 0 : progressPercentage < 66 ? 1 : 2}
        />
      )}
      
      {/* État terminé avec bouton résumé */}
      {isOver && summary && (
        <MeetingProgress
          status="completed"
          percentage={100}
          darkMode={darkMode}
          meetingId={meeting.id}
          onComplete={() => navigate(`/meetings/${meeting.id}/summary`)}
        />
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