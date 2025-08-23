import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  Settings,
  BarChart3,
  Search,
  Filter,
  Play,
  Pause,
  Edit,
  Trash2,
  Send,
  Copy,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
  Link,
  Unlink,
  Zap,
  Activity,
  Database
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useZoomMeetings } from '../../hooks/useZoomMeetings';
import { ZoomMeeting, ZoomSettings } from '../../types/zoom';
import { zoomService } from '../../services/zoomService';
import { ZoomMeetingSDK } from './ZoomMeetingSDK';

export function EnhancedZoomInterface() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  const {
    meetings,
    participants,
    loading,
    error,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    sendInvitations,
    getStats,
    getMeetingParticipants
  } = useZoomMeetings();

  // Enhanced states
  const [activeTab, setActiveTab] = useState<'meetings' | 'sdk' | 'analytics' | 'webhooks' | 'settings'>('meetings');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'ended' | 'cancelled'>('all');
  
  // SDK Integration states
  const [showSDKMeeting, setShowSDKMeeting] = useState(false);
  const [selectedMeetingForSDK, setSelectedMeetingForSDK] = useState<ZoomMeeting | null>(null);
  
  // N8N Webhook states
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  
  // Authentication states
  const [isZoomConnected, setIsZoomConnected] = useState(false);
  const [isCheckingZoomAuth, setIsCheckingZoomAuth] = useState(true);
  const [isConnectingZoom, setIsConnectingZoom] = useState(false);
  const [authMethod, setAuthMethod] = useState<'sdk' | 'oauth'>('sdk');
  
  // Integration stats
  const [integrationStats, setIntegrationStats] = useState<any>({});
  
  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkZoomConnection();
    loadIntegrationStats();
    loadWebhookEvents();
  }, [user?.id]);

  const checkZoomConnection = async () => {
    if (!user?.id) return;
    
    setIsCheckingZoomAuth(true);
    try {
      const isAuthenticated = await zoomService.isUserAuthenticated(user.id);
      setIsZoomConnected(isAuthenticated);
      
      if (isAuthenticated) {
        const integration = await zoomService.getUserIntegration(user.id);
        setAuthMethod(integration?.authentication_method as 'sdk' | 'oauth' || 'sdk');
      }
    } catch (error) {
      console.error('Error checking Zoom connection:', error);
      setIsZoomConnected(false);
    } finally {
      setIsCheckingZoomAuth(false);
    }
  };

  const loadIntegrationStats = async () => {
    if (!user?.id) return;
    
    try {
      const stats = await zoomService.getIntegrationStats(user.id);
      setIntegrationStats(stats);
    } catch (error) {
      console.error('Error loading integration stats:', error);
    }
  };

  const loadWebhookEvents = async () => {
    if (!user?.id) return;
    
    try {
      // Load recent webhook events from meetings
      const userMeetings = await zoomService.getUserMeetings(user.id);
      const allEvents: any[] = [];
      
      userMeetings.forEach(meeting => {
        if (meeting.webhook_events) {
          const events = Array.isArray(meeting.webhook_events) ? meeting.webhook_events : [];
          events.forEach(event => {
            allEvents.push({
              ...event,
              meeting_id: meeting.id,
              meeting_title: meeting.title
            });
          });
        }
      });
      
      // Sort by timestamp (most recent first)
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setWebhookEvents(allEvents.slice(0, 50)); // Keep last 50 events
    } catch (error) {
      console.error('Error loading webhook events:', error);
    }
  };

  const handleConnectZoom = async () => {
    if (!user?.id) {
      showMessage('error', 'Utilisateur non connecté');
      return;
    }

    setIsConnectingZoom(true);
    
    try {
      const result = await zoomService.authenticateUser(authMethod);
      
      if (result.success) {
        setIsZoomConnected(true);
        showMessage('success', `Connexion Zoom ${authMethod.toUpperCase()} réussie !`);
        loadIntegrationStats();
      } else {
        showMessage('error', result.error || 'Erreur de connexion Zoom');
      }
    } catch (error) {
      console.error('Error connecting to Zoom:', error);
      showMessage('error', 'Erreur lors de la connexion à Zoom');
    } finally {
      setIsConnectingZoom(false);
    }
  };

  const handleDisconnectZoom = async () => {
    if (!user?.id || !confirm('Êtes-vous sûr de vouloir vous déconnecter de Zoom ?')) {
      return;
    }

    try {
      const success = await zoomService.disconnectUser(user.id, authMethod);
      if (success) {
        setIsZoomConnected(false);
        showMessage('success', 'Déconnexion Zoom réussie');
      } else {
        showMessage('error', 'Erreur lors de la déconnexion');
      }
    } catch (error) {
      console.error('Error disconnecting from Zoom:', error);
      showMessage('error', 'Erreur lors de la déconnexion');
    }
  };

  const handleJoinWithSDK = (meeting: ZoomMeeting) => {
    setSelectedMeetingForSDK(meeting);
    setShowSDKMeeting(true);
  };

  const handleTestN8NWebhook = async () => {
    if (!user?.id) return;
    
    try {
      const testPayload = {
        event: 'test_webhook',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        message: 'Test webhook from Centrinote Zoom integration'
      };
      
      const success = await zoomService.triggerN8NWorkflow('test', 'webhook_test', testPayload);
      
      if (success) {
        showMessage('success', 'Test webhook envoyé avec succès');
        setWebhookStatus('connected');
      } else {
        showMessage('error', 'Échec du test webhook');
        setWebhookStatus('error');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      showMessage('error', 'Erreur lors du test webhook');
      setWebhookStatus('error');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const MeetingCardEnhanced = ({ meeting }: { meeting: ZoomMeeting }) => {
    const meetingParticipants = getMeetingParticipants(meeting.id);
    const isUpcoming = meeting.start_time > new Date() && meeting.status === 'scheduled';

    return (
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6 hover:shadow-lg transition-all duration-200
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`
              p-3 rounded-lg
              ${meeting.status === 'scheduled' 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : meeting.status === 'ended'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }
            `}>
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {meeting.topic}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {new Date(meeting.start_time).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`
              px-3 py-1 text-xs font-medium rounded-full
              ${meeting.status === 'scheduled'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : meeting.status === 'ended'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }
            `}>
              {meeting.status === 'scheduled' ? 'Planifiée' : 
               meeting.status === 'ended' ? 'Terminée' : 'Annulée'}
            </span>
          </div>
        </div>

        {/* Enhanced Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {meeting.join_url && isUpcoming && (
              <>
                <button
                  onClick={() => window.open(meeting.join_url, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Rejoindre</span>
                </button>
                
                <button
                  onClick={() => handleJoinWithSDK(meeting)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <Zap className="w-4 h-4" />
                  <span>SDK</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Existing action buttons... */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3 animate-slide-down
          ${message.type === 'success' 
            ? darkMode 
              ? 'bg-green-800 text-green-200 border border-green-700' 
              : 'bg-green-100 text-green-800 border border-green-200'
            : darkMode 
              ? 'bg-red-800 text-red-200 border border-red-700' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-2 p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Enhanced Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { id: 'meetings', label: 'Réunions', icon: Video },
          { id: 'sdk', label: 'SDK', icon: Zap },
          { id: 'analytics', label: 'Analyses', icon: BarChart3 },
          { id: 'webhooks', label: 'Webhooks', icon: Activity },
          { id: 'settings', label: 'Paramètres', icon: Settings }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`
              px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2
              ${activeTab === id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* SDK Tab */}
      {activeTab === 'sdk' && (
        <div className="space-y-6">
          <div className={`
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            border rounded-xl p-6
          `}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Zoom Web SDK Integration
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Rejoignez les réunions directement dans l'interface web avec une expérience intégrée.
            </p>
            
            {showSDKMeeting && selectedMeetingForSDK ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedMeetingForSDK.topic}
                  </h4>
                  <button
                    onClick={() => {
                      setShowSDKMeeting(false);
                      setSelectedMeetingForSDK(null);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <ZoomMeetingSDK
                  meetingNumber={selectedMeetingForSDK.zoom_meeting_id}
                  userName={user?.user_metadata?.full_name || user?.email || 'Utilisateur'}
                  userEmail={user?.email || ''}
                  passWord={selectedMeetingForSDK.password}
                  role="0"
                  onMeetingEnd={() => {
                    setShowSDKMeeting(false);
                    setSelectedMeetingForSDK(null);
                  }}
                  onMeetingError={(error) => {
                    showMessage('error', `Erreur SDK: ${error}`);
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Prêt pour le SDK
                </p>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cliquez sur "SDK" dans une réunion pour l'ouvrir ici
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className={`
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            border rounded-xl p-6
          `}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                N8N Webhooks Integration
              </h3>
              <div className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${webhookStatus === 'connected' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : webhookStatus === 'error'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }
              `}>
                {webhookStatus === 'connected' ? 'Connecté' : 
                 webhookStatus === 'error' ? 'Erreur' : 'Déconnecté'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Configuration
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      N8N Webhook URL
                    </label>
                    <input
                      type="url"
                      value={n8nWebhookUrl}
                      onChange={(e) => setN8nWebhookUrl(e.target.value)}
                      placeholder="https://n8n.srv886297.hstgr.cloud/webhook/zoom-events"
                      className={`
                        w-full px-3 py-2 rounded-lg border transition-colors
                        ${darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20
                      `}
                    />
                  </div>
                  
                  <button
                    onClick={handleTestN8NWebhook}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Tester Webhook</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Événements récents ({webhookEvents.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {webhookEvents.slice(0, 10).map((event, index) => (
                    <div
                      key={index}
                      className={`
                        p-3 rounded-lg border
                        ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.event_type}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {event.meeting_title && (
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {event.meeting_title}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {webhookEvents.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Aucun événement webhook
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meetings Tab - Enhanced */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          {/* Connection Status */}
          {!isCheckingZoomAuth && (
            <div className={`
              ${isZoomConnected 
                ? darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                : darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
              }
              border rounded-xl p-6
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isZoomConnected 
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                    }
                  `}>
                    {isZoomConnected ? (
                      <Link className="w-5 h-5 text-white" />
                    ) : (
                      <Unlink className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${
                      isZoomConnected 
                        ? darkMode ? 'text-green-400' : 'text-green-800'
                        : darkMode ? 'text-yellow-400' : 'text-yellow-800'
                    }`}>
                      {isZoomConnected ? `Connecté à Zoom (${authMethod.toUpperCase()})` : 'Connexion Zoom requise'}
                    </h3>
                    <p className={`text-sm ${
                      isZoomConnected 
                        ? darkMode ? 'text-green-300' : 'text-green-700'
                        : darkMode ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>
                      {isZoomConnected 
                        ? 'Vous pouvez créer des réunions Zoom avec votre compte'
                        : 'Connectez votre compte Zoom pour créer des réunions personnalisées'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isZoomConnected ? (
                    <button
                      onClick={handleDisconnectZoom}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
                        ${darkMode 
                          ? 'border-red-700 text-red-400 hover:bg-red-900/20'
                          : 'border-red-300 text-red-700 hover:bg-red-50'
                        }
                      `}
                    >
                      <Unlink className="w-4 h-4" />
                      <span>Déconnecter</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <select
                        value={authMethod}
                        onChange={(e) => setAuthMethod(e.target.value as 'sdk' | 'oauth')}
                        className={`
                          px-3 py-2 rounded-lg border text-sm
                          ${darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                          }
                        `}
                      >
                        <option value="sdk">SDK Auth</option>
                        <option value="oauth">OAuth</option>
                      </select>
                      
                      <button
                        onClick={handleConnectZoom}
                        disabled={isConnectingZoom}
                        className={`
                          flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                          ${isConnectingZoom
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                          }
                          text-white
                        `}
                      >
                        {isConnectingZoom ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Link className="w-4 h-4" />
                        )}
                        <span>{isConnectingZoom ? 'Connexion...' : 'Se connecter'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Integration Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Réunions SDK</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {integrationStats.total_meetings || 0}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enregistrements</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {integrationStats.recordings_processed || 0}
                  </p>
                </div>
                <Video className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Résumés IA</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {integrationStats.summaries_generated || 0}
                  </p>
                </div>
                <Database className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Webhooks</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {webhookEvents.length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Enhanced Meeting List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map(meeting => (
                <MeetingCardEnhanced key={meeting.id} meeting={meeting} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Aucune réunion trouvée
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Créez votre première réunion Zoom pour commencer
              </p>
            </div>
          )}
        </div>
      )}

      {/* Other tabs (analytics, settings) remain the same... */}
    </div>
  );
}