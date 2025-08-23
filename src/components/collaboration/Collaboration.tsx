import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  MessageCircle,
  Video,
  Share2,
  UserPlus,
  Settings,
  Clock,
  FileText,
  Activity,
  X,
  Save,
  Search,
  Mail,
  Calendar,
  User,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { ChatWindow } from './ChatWindow';
import { JitsiMeeting } from './JitsiMeeting';
import { JitsiMeetingCreator } from './JitsiMeetingCreator';
import { JitsiMeetingRoom } from '../../services/jitsiService';

interface ActiveSession {
  id: string;
  title: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
  }>;
  type: 'document' | 'study' | 'discussion' | 'video';
  startTime: Date;
  isActive: boolean;
  description?: string;
  documentIds?: string[];
  meetingRoom?: JitsiMeetingRoom;
}

interface NewSessionForm {
  title: string;
  type: 'document' | 'study' | 'discussion' | 'video';
  description: string;
  scheduledFor: string;
  duration: number;
  documentIds: string[];
  participants: string[];
}

interface InviteForm {
  email: string;
  message: string;
  role: 'viewer' | 'editor' | 'admin';
}

export function Collaboration() {
  const { state } = useApp();
  const { darkMode, documents } = state;
  const [activeTab, setActiveTab] = useState<'sessions' | 'shared' | 'invites'>('sessions');
  
  // États pour les modals et vues
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // États pour Jitsi
  const [showJitsiCreator, setShowJitsiCreator] = useState(false);
  const [currentJitsiMeeting, setCurrentJitsiMeeting] = useState<JitsiMeetingRoom | null>(null);
  const [jitsiMeetings, setJitsiMeetings] = useState<JitsiMeetingRoom[]>([]);

  // États pour les formulaires
  const [newSessionForm, setNewSessionForm] = useState<NewSessionForm>({
    title: '',
    type: 'study',
    description: '',
    scheduledFor: new Date().toISOString().slice(0, 16),
    duration: 60,
    documentIds: [],
    participants: []
  });

  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    message: 'Rejoignez-moi sur Centrinote pour collaborer !',
    role: 'editor'
  });

  // Mock data pour les sessions actives (étendu avec statut en temps réel)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([
    {
      id: '1',
      title: 'Machine Learning Notes Review',
      participants: [
        { id: '1', name: 'John Doe', isOnline: true },
        { id: '2', name: 'Alice Smith', isOnline: true },
        { id: '3', name: 'Bob Johnson', isOnline: false }
      ],
      type: 'document',
      startTime: new Date(Date.now() - 30 * 60000),
      isActive: true,
      description: 'Révision collaborative des notes sur le machine learning',
      documentIds: ['1']
    },
    {
      id: '2',
      title: 'Study Group - AI Concepts',
      participants: [
        { id: '1', name: 'John Doe', isOnline: true },
        { id: '4', name: 'Sarah Wilson', isOnline: true }
      ],
      type: 'study',
      startTime: new Date(Date.now() - 15 * 60000),
      isActive: true,
      description: 'Session d\'étude sur les concepts d\'IA'
    }
  ]);

  // Mock data pour les invitations envoyées
  const [sentInvites, setSentInvites] = useState([
    { id: '1', email: 'marie@example.com', status: 'pending', sentAt: new Date() },
    { id: '2', email: 'pierre@example.com', status: 'accepted', sentAt: new Date(Date.now() - 86400000) }
  ]);

  const sharedDocuments = documents.filter(doc => doc.isShared);

  // Simuler la mise à jour du statut "Live" en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSessions(prev => prev.map(session => {
        const onlineParticipants = session.participants.filter(p => p.isOnline).length;
        return {
          ...session,
          isActive: onlineParticipants > 0
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const resetNewSessionForm = () => {
    setNewSessionForm({
      title: '',
      type: 'study',
      description: '',
      scheduledFor: new Date().toISOString().slice(0, 16),
      duration: 60,
      documentIds: [],
      participants: []
    });
  };

  const resetInviteForm = () => {
    setInviteForm({
      email: '',
      message: 'Rejoignez-moi sur Centrinote pour collaborer !',
      role: 'editor'
    });
  };

  // Fonction pour créer une nouvelle session
  const handleCreateSession = () => {
    if (!newSessionForm.title.trim()) {
      showMessage("Le titre de la session est obligatoire !");
      return;
    }

    if (newSessionForm.type === 'video') {
      // Ouvrir le créateur de réunion Jitsi
      setShowJitsiCreator(true);
      setShowNewSessionModal(false);
      return;
    }

    const newSession: ActiveSession = {
      id: Date.now().toString(),
      title: newSessionForm.title.trim(),
      type: newSessionForm.type,
      description: newSessionForm.description.trim(),
      startTime: new Date(newSessionForm.scheduledFor),
      isActive: new Date(newSessionForm.scheduledFor) <= new Date(),
      participants: [
        { id: '1', name: 'John Doe', isOnline: true } // Utilisateur actuel
      ],
      documentIds: newSessionForm.documentIds
    };

    setActiveSessions(prev => [...prev, newSession]);
    setShowNewSessionModal(false);
    resetNewSessionForm();
    showMessage("Session créée avec succès !");
  };

  // Fonction pour gérer la création d'une réunion Jitsi
  const handleJitsiMeetingCreated = (room: JitsiMeetingRoom) => {
    setJitsiMeetings(prev => [...prev, room]);
    setCurrentJitsiMeeting(room);
    setShowJitsiCreator(false);
    showMessage("Réunion vidéo créée avec succès !");
  };

  // Fonction pour rejoindre une réunion Jitsi
  const handleJoinJitsiMeeting = (room: JitsiMeetingRoom) => {
    setCurrentJitsiMeeting(room);
  };

  // Fonction pour quitter une réunion Jitsi
  const handleLeaveJitsiMeeting = () => {
    setCurrentJitsiMeeting(null);
  };

  // Fonction pour envoyer une invitation
  const handleSendInvite = () => {
    if (!inviteForm.email.trim()) {
      showMessage("L'email est obligatoire !");
      return;
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      showMessage("Format d'email invalide !");
      return;
    }

    // Vérifier si l'invitation n'a pas déjà été envoyée
    if (sentInvites.some(invite => invite.email === inviteForm.email)) {
      showMessage("Une invitation a déjà été envoyée à cette adresse !");
      return;
    }

    const newInvite = {
      id: Date.now().toString(),
      email: inviteForm.email.trim(),
      status: 'pending' as const,
      sentAt: new Date(),
      message: inviteForm.message.trim(),
      role: inviteForm.role
    };

    setSentInvites(prev => [...prev, newInvite]);
    setShowInviteModal(false);
    resetInviteForm();
    showMessage("Invitation envoyée avec succès !");
  };

  // Fonction pour rejoindre une session
  const handleJoinSession = (sessionId: string) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (session?.type === 'video' && session.meetingRoom) {
      handleJoinJitsiMeeting(session.meetingRoom);
    } else {
      setCurrentSessionId(sessionId);
      showMessage("Connexion à la session...");
    }
  };

  // Fonction pour ouvrir le chat
  const handleOpenChat = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowChatWindow(true);
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'document':
        return FileText;
      case 'study':
        return Users;
      case 'discussion':
        return MessageCircle;
      case 'video':
        return Video;
      default:
        return Users;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'from-blue-500 to-blue-600';
      case 'study':
        return 'from-teal-500 to-teal-600';
      case 'discussion':
        return 'from-purple-500 to-purple-600';
      case 'video':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const SessionCard = ({ session }: { session: ActiveSession }) => {
    const Icon = getSessionIcon(session.type);
    
    return (
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-lg p-6 hover:shadow-md transition-all duration-200
      `}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${getSessionColor(session.type)}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {session.title}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {session.type === 'video' ? 'Réunion vidéo' : session.type} • {formatDuration(session.startTime)}
              </p>
              {session.description && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {session.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {session.isActive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-500 font-medium">Live</span>
              </div>
            )}
            {session.type === 'video' && session.meetingRoom?.config.enableE2EE && (
              <Shield className="w-4 h-4 text-green-500" title="Chiffrement E2EE" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {session.participants.slice(0, 3).map((participant, index) => (
                <div
                  key={participant.id}
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium
                    ${participant.isOnline 
                      ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400' 
                      : 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400'
                    }
                    text-white
                  `}
                  style={{ zIndex: 10 - index }}
                  title={`${participant.name} - ${participant.isOnline ? 'En ligne' : 'Hors ligne'}`}
                >
                  {participant.name.split(' ').map(n => n[0]).join('')}
                </div>
              ))}
              {session.participants.length > 3 && (
                <div className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium
                  ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'}
                `}>
                  +{session.participants.length - 3}
                </div>
              )}
            </div>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {session.participants.length} participants
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {session.type !== 'video' && (
              <button 
                onClick={() => handleOpenChat(session.id)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
                `}
                title="Ouvrir le chat"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
            
            <button 
              onClick={() => handleJoinSession(session.id)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${session.type === 'video'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-md'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:shadow-md'
                }
              `}
            >
              {session.type === 'video' ? 'Rejoindre la vidéo' : 'Rejoindre'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Si on est en réunion Jitsi, afficher le composant JitsiMeeting
  if (currentJitsiMeeting) {
    return (
      <JitsiMeeting
        room={currentJitsiMeeting}
        onLeave={handleLeaveJitsiMeeting}
      />
    );
  }

  // Si on crée une réunion Jitsi, afficher le créateur
  if (showJitsiCreator) {
    return (
      <div className="p-6">
        <JitsiMeetingCreator
          darkMode={darkMode}
          onMeetingCreated={handleJitsiMeetingCreated}
          onCancel={() => setShowJitsiCreator(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
          ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'}
          border ${darkMode ? 'border-green-700' : 'border-green-200'}
        `}>
          {message}
        </div>
      )}

      {/* Chat Window */}
      {showChatWindow && currentSessionId && (
        <div className="fixed bottom-4 right-4 z-40">
          <ChatWindow
            sessionId={currentSessionId}
            onClose={() => {
              setShowChatWindow(false);
              setCurrentSessionId(null);
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Hub de Collaboration
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Travaillez ensemble en temps réel avec Jitsi Meet
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowInviteModal(true)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
              ${darkMode 
                ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <UserPlus className="w-4 h-4" />
            <span>Inviter</span>
          </button>
          <button 
            onClick={() => setShowNewSessionModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Session</span>
          </button>
          <button 
            onClick={() => setShowJitsiCreator(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
          >
            <Video className="w-4 h-4" />
            <span>Réunion Vidéo</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors
            ${activeTab === 'sessions'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          Sessions Actives
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors
            ${activeTab === 'shared'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          Documents Partagés
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors
            ${activeTab === 'invites'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          Équipe
        </button>
      </div>

      {/* Content */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sessions Actives</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activeSessions.filter(s => s.isActive).length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Réunions Vidéo</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {jitsiMeetings.length}
                  </p>
                </div>
                <Video className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Documents Partagés</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {sharedDocuments.length}
                  </p>
                </div>
                <Share2 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Collaborateurs</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {sentInvites.filter(i => i.status === 'accepted').length + 1}
                  </p>
                </div>
                <Users className="w-8 h-8 text-teal-500" />
              </div>
            </div>
          </div>

          {/* Réunions Jitsi actives */}
          {jitsiMeetings.length > 0 && (
            <div className="space-y-4">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Réunions Vidéo Disponibles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jitsiMeetings.map(meeting => (
                  <div
                    key={meeting.id}
                    className={`
                      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                      border rounded-lg p-4 hover:shadow-md transition-all duration-200
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {meeting.name}
                          </h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Créée par {meeting.createdBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {meeting.config.enableE2EE && (
                          <Shield className="w-4 h-4 text-green-500" title="Chiffrement E2EE" />
                        )}
                        {meeting.password && (
                          <Lock className="w-4 h-4 text-yellow-500" title="Protégé par mot de passe" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Créée {meeting.createdAt.toLocaleDateString()} à {meeting.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const shareLink = `${meeting.url}`;
                            navigator.clipboard.writeText(shareLink);
                            showMessage("Lien copié !");
                          }}
                          className={`
                            p-2 rounded-lg transition-colors
                            ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
                          `}
                          title="Copier le lien"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleJoinJitsiMeeting(meeting)}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-lg hover:shadow-md transition-all duration-200"
                        >
                          Rejoindre
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions traditionnelles */}
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Sessions de Collaboration
            </h2>
            {activeSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
            {activeSessions.length === 0 && (
              <div className="text-center py-12">
                <Users className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Aucune session active
                </h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Créez une nouvelle session de collaboration pour travailler avec d'autres.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shared' && (
        <div className="space-y-4">
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Documents Partagés
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedDocuments.map(doc => (
              <div
                key={doc.id}
                className={`
                  ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  border rounded-lg p-4 hover:shadow-md transition-all duration-200
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {doc.title}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {doc.collaborators.length} collaborateurs
                      </p>
                    </div>
                  </div>
                  <Share2 className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                    {doc.updatedAt.toLocaleDateString()}
                  </span>
                  <button className="text-blue-500 hover:text-blue-600">
                    Ouvrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="space-y-6">
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Gestion de l'Équipe
          </h2>
          
          {/* Invitations envoyées */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Invitations Envoyées
            </h3>
            {sentInvites.length > 0 ? (
              <div className="space-y-3">
                {sentInvites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {invite.email}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Envoyée le {invite.sentAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`
                      px-2 py-1 text-xs rounded-full
                      ${invite.status === 'accepted' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }
                    `}>
                      {invite.status === 'accepted' ? 'Acceptée' : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Aucune invitation envoyée pour le moment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal Nouvelle Session */}
      {showNewSessionModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowNewSessionModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-96 max-h-[90vh] overflow-y-auto
          `}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Créer une Nouvelle Session
              </h2>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Titre de la session *
                </label>
                <input
                  type="text"
                  value={newSessionForm.title}
                  onChange={(e) => setNewSessionForm({...newSessionForm, title: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Ex: Révision Machine Learning"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Type de session
                </label>
                <select
                  value={newSessionForm.type}
                  onChange={(e) => setNewSessionForm({...newSessionForm, type: e.target.value as 'document' | 'study' | 'discussion' | 'video'})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                >
                  <option value="study">Session d'étude</option>
                  <option value="document">Révision de document</option>
                  <option value="discussion">Discussion</option>
                  <option value="video">Réunion vidéo (Jitsi)</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={newSessionForm.description}
                  onChange={(e) => setNewSessionForm({...newSessionForm, description: e.target.value})}
                  rows={3}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors resize-none
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Décrivez l'objectif de cette session..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date et heure
                </label>
                <input
                  type="datetime-local"
                  value={newSessionForm.scheduledFor}
                  onChange={(e) => setNewSessionForm({...newSessionForm, scheduledFor: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={newSessionForm.duration}
                  onChange={(e) => setNewSessionForm({...newSessionForm, duration: parseInt(e.target.value)})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
              </div>

              {newSessionForm.type === 'document' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Documents à réviser
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {documents.map(doc => (
                      <label key={doc.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newSessionForm.documentIds.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSessionForm({
                                ...newSessionForm,
                                documentIds: [...newSessionForm.documentIds, doc.id]
                              });
                            } else {
                              setNewSessionForm({
                                ...newSessionForm,
                                documentIds: newSessionForm.documentIds.filter(id => id !== doc.id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {doc.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {newSessionForm.type === 'video' && (
                <div className={`
                  ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}
                  border rounded-lg p-3
                `}>
                  <div className="flex items-center space-x-2">
                    <Video className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                      Réunion vidéo sécurisée avec Jitsi Meet
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Chiffrement E2EE, aucune installation requise, compatible tous appareils
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSession}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>Créer la Session</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Invitation */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowInviteModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-96
          `}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Inviter un Collaborateur
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Adresse email *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="exemple@email.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({...inviteForm, role: e.target.value as 'viewer' | 'editor' | 'admin'})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                >
                  <option value="viewer">Lecteur</option>
                  <option value="editor">Éditeur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Message personnalisé
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({...inviteForm, message: e.target.value})}
                  rows={3}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors resize-none
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Ajoutez un message personnel..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleSendInvite}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
              >
                <Mail className="w-4 h-4" />
                <span>Envoyer l'Invitation</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}