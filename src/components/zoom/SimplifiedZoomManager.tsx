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
  Play,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  X,
  Zap,
  Activity,
  Database,
  WifiOff
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { zoomMeetingSDK } from '../../services/zoom/zoomMeetingSDKService';
import { SimplifiedZoomMeeting } from './SimplifiedZoomMeeting';
import { ZoomDebugInfo } from './ZoomDebugInfo';
import { ZoomConnectionInterface } from './ZoomConnectionInterface';

interface ZoomMeeting {
  id: string;
  meeting_id: string;
  meeting_number: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  start_url?: string;
  password?: string;
  status: 'scheduled' | 'started' | 'ended' | 'cancelled';
  has_recording: boolean;
  created_at: string;
}

export function SimplifiedZoomManager() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  // States
  const [activeTab, setActiveTab] = useState<'meetings' | 'join' | 'create' | 'analytics'>('meetings');
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<ZoomMeeting | null>(null);
  const [showSDKMeeting, setShowSDKMeeting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'ended' | 'cancelled'>('all');
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  
  // Connection status
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  
  // Create meeting form
  const [createForm, setCreateForm] = useState({
    topic: '',
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // 1 hour from now
    duration: 60,
    password: '',
    agenda: '',
    host_video: true,
    participant_video: true,
    waiting_room: true,
    mute_upon_entry: false,
    auto_recording: 'none' as 'none' | 'local' | 'cloud'
  });
  
  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUserMeetings();
      checkConnectionStatus();
    }
  }, [user?.id]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadUserMeetings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const userMeetings = await zoomMeetingSDK.getUserMeetings(user.id);
      setMeetings(userMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!user?.id) return;
    
    try {
      const connection = await zoomMeetingSDK.getUserConnection(user.id);
      setIsConnected(!!connection);
      setConnectionInfo(connection);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!createForm.topic.trim()) {
      showMessage('error', 'Meeting topic is required');
      return;
    }

    setLoading(true);
    try {
      const meeting = await zoomMeetingSDK.createMeeting({
        topic: createForm.topic,
        type: 2, // Scheduled meeting
        start_time: createForm.start_time,
        duration: createForm.duration,
        password: createForm.password || undefined,
        agenda: createForm.agenda,
        settings: {
          host_video: createForm.host_video,
          participant_video: createForm.participant_video,
          waiting_room: createForm.waiting_room,
          mute_upon_entry: createForm.mute_upon_entry,
          auto_recording: createForm.auto_recording
        }
      });

      if (meeting) {
        showMessage('success', 'Meeting created successfully!');
        setCreateForm({
          topic: '',
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
          duration: 60,
          password: '',
          agenda: '',
          host_video: true,
          participant_video: true,
          waiting_room: true,
          mute_upon_entry: false,
          auto_recording: 'none'
        });
        setActiveTab('meetings');
        loadUserMeetings(); // Refresh meetings list
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithSDK = (meeting: ZoomMeeting) => {
    setSelectedMeeting(meeting);
    setShowSDKMeeting(true);
    setActiveTab('join');
  };

  const handleUserConnected = async (userInfo: any) => {
    try {
      // Update connection status
      await checkConnectionStatus();
      showMessage('success', `Connected as ${userInfo.userName || userInfo.zoom_display_name}`);
    } catch (error) {
      console.error('Error updating connection:', error);
    }
  };

  const handleConnectionSuccess = (connectionInfo: any) => {
    setIsConnected(true);
    setConnectionInfo(connectionInfo);
    showMessage('success', `Successfully connected to Zoom as ${connectionInfo.zoom_display_name}`);
    // Refresh meetings after connection
    loadUserMeetings();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showMessage('success', `${label} copied to clipboard!`);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const success = await zoomMeetingSDK.deleteMeeting(meetingId);
      
      if (success) {
        showMessage('success', 'Meeting deleted successfully');
        loadUserMeetings(); // Refresh the list
      } else {
        showMessage('error', 'Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to delete meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMeetings.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedMeetings.length} meetings? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const meetingId of selectedMeetings) {
      try {
        await zoomMeetingSDK.deleteMeeting(meetingId);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error deleting meeting:', meetingId, error);
      }
    }

    if (successCount > 0) {
      showMessage('success', `${successCount} meeting(s) deleted successfully`);
      loadUserMeetings();
    }
    
    if (errorCount > 0) {
      showMessage('error', `Failed to delete ${errorCount} meeting(s)`);
    }

    setSelectedMeetings([]);
    setBulkMode(false);
    setLoading(false);
  };

  const toggleMeetingSelection = (meetingId: string) => {
    setSelectedMeetings(prev => 
      prev.includes(meetingId) 
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  const selectAllMeetings = () => {
    if (selectedMeetings.length === filteredMeetings.length) {
      setSelectedMeetings([]);
    } else {
      setSelectedMeetings(filteredMeetings.map(m => m.id));
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.meeting_number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const MeetingCard = ({ meeting }: { meeting: ZoomMeeting }) => {
    const isUpcoming = new Date(meeting.start_time) > new Date() && meeting.status === 'scheduled';

    return (
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-6 hover:shadow-lg transition-all duration-200 relative
        ${bulkMode && selectedMeetings.includes(meeting.id) ? 'ring-2 ring-blue-500' : ''}
      `}>
        {bulkMode && (
          <div className="absolute top-4 right-4">
            <input
              type="checkbox"
              checked={selectedMeetings.includes(meeting.id)}
              onChange={() => toggleMeetingSelection(meeting.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
        )}
        
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
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                ID: {meeting.meeting_number}
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
              {meeting.status === 'scheduled' ? 'Scheduled' : 
               meeting.status === 'ended' ? 'Ended' : 'Cancelled'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {meeting.duration} minutes
            </span>
          </div>
          {meeting.has_recording && (
            <div className="flex items-center space-x-2">
              <Video className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Recorded
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isUpcoming && (
              <>
                <button
                  onClick={() => window.open(meeting.join_url, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Join</span>
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
            <button
              onClick={() => copyToClipboard(meeting.join_url, 'Join URL')}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
              title="Copy join URL"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => copyToClipboard(meeting.meeting_number, 'Meeting ID')}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
              title="Copy meeting ID"
            >
              <Database className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => console.log('Edit meeting:', meeting.id)}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode 
                  ? 'hover:bg-blue-800 text-blue-400 hover:text-blue-300' 
                  : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'
                }
              `}
              title="Edit meeting"
            >
              <Edit className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleDeleteMeeting(meeting.id)}
              className="p-2 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="Delete meeting"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // SDK configuration status can be checked if needed

  // Show connection interface if not connected
  if (!isConnected) {
    return (
      <>
        <ZoomDebugInfo />
        <ZoomConnectionInterface onConnectionSuccess={handleConnectionSuccess} />
      </>
    );
  }

  // Show meeting management interface if connected
  return (
    <>
      <ZoomDebugInfo />
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Zoom Meetings
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Create and join Zoom meetings with SDK integration
          </p>
        </div>
        
        {isConnected && connectionInfo && (
          <div className="text-right">
            <div className="flex items-center space-x-3">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Connected as {connectionInfo.zoom_display_name}
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {connectionInfo.zoom_email}
                </p>
              </div>
              <button
                onClick={async () => {
                  const success = await zoomMeetingSDK.disconnectUser(user?.id || '');
                  if (success) {
                    setIsConnected(false);
                    setConnectionInfo(null);
                    showMessage('success', 'Disconnected from Zoom');
                  }
                }}
                className={`
                  p-2 rounded-lg text-xs transition-colors
                  ${darkMode 
                    ? 'hover:bg-red-800 text-red-400 hover:text-red-300' 
                    : 'hover:bg-red-100 text-red-600 hover:text-red-700'
                  }
                `}
                title="Disconnect from Zoom"
              >
                <WifiOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { id: 'meetings', label: 'My Meetings', icon: Calendar },
          { id: 'join', label: 'Join Meeting', icon: Play },
          { id: 'create', label: 'Create Meeting', icon: Plus },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
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

      {/* Tab Content */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`
                  pl-10 pr-4 py-2 w-full rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`
                  px-3 py-2 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {filteredMeetings.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`
                    px-3 py-2 rounded-lg border transition-colors text-sm font-medium
                    ${bulkMode
                      ? 'bg-blue-500 text-white border-blue-500'
                      : darkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {bulkMode ? 'Exit Bulk' : 'Bulk Select'}
                </button>
                
                {bulkMode && selectedMeetings.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Delete {selectedMeetings.length}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Meeting Statistics */}
          {meetings.length > 0 && (
            <div className="space-y-4">
              {bulkMode && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedMeetings.length === filteredMeetings.length && filteredMeetings.length > 0}
                      onChange={selectAllMeetings}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Select All ({filteredMeetings.length} meetings)
                    </span>
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {selectedMeetings.length} selected
                  </span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                  <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {meetings.filter(m => m.status === 'scheduled').length}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Scheduled</p>
                  </div>
                </div>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {meetings.filter(m => m.status === 'ended').length}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
                  </div>
                </div>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                <div className="flex items-center space-x-2">
                  <Video className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {meetings.filter(m => m.has_recording).length}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recorded</p>
                  </div>
                </div>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {meetings.length}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Meetings Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No meetings found
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create your first meeting to get started
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'join' && (
        <div className="max-w-4xl mx-auto">
          {showSDKMeeting && selectedMeeting ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedMeeting.topic}
                </h2>
                <button
                  onClick={() => {
                    setShowSDKMeeting(false);
                    setSelectedMeeting(null);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <SimplifiedZoomMeeting
                meetingNumber={selectedMeeting.meeting_number}
                userName={(user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                userEmail={user?.email || ''}
                passWord={selectedMeeting.password}
                role="0"
                autoJoin={true}
                onMeetingEnd={() => {
                  setShowSDKMeeting(false);
                  setSelectedMeeting(null);
                }}
                onMeetingError={(error) => showMessage('error', error)}
                onUserConnected={handleUserConnected}
              />
            </div>
          ) : (
            <SimplifiedZoomMeeting
              onMeetingError={(error) => showMessage('error', error)}
              onUserConnected={handleUserConnected}
            />
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          <div className={`
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            border rounded-xl p-6
          `}>
            <h2 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create New Meeting
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Meeting Topic *
                </label>
                <input
                  type="text"
                  value={createForm.topic}
                  onChange={(e) => setCreateForm({...createForm, topic: e.target.value})}
                  placeholder="Team Meeting"
                  className={`
                    w-full px-4 py-3 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.start_time}
                    onChange={(e) => setCreateForm({...createForm, start_time: e.target.value})}
                    className={`
                      w-full px-4 py-3 rounded-lg border transition-colors
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
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={createForm.duration}
                    onChange={(e) => setCreateForm({...createForm, duration: parseInt(e.target.value)})}
                    className={`
                      w-full px-4 py-3 rounded-lg border transition-colors
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    `}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="Meeting password"
                  className={`
                    w-full px-4 py-3 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Agenda (optional)
                </label>
                <textarea
                  value={createForm.agenda}
                  onChange={(e) => setCreateForm({...createForm, agenda: e.target.value})}
                  rows={3}
                  placeholder="Meeting agenda..."
                  className={`
                    w-full px-4 py-3 rounded-lg border transition-colors resize-none
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                />
              </div>

              {/* Meeting Settings */}
              <div className="space-y-3">
                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Meeting Settings
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Host Video
                    </span>
                    <button
                      onClick={() => setCreateForm({...createForm, host_video: !createForm.host_video})}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${createForm.host_video ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${createForm.host_video ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Participant Video
                    </span>
                    <button
                      onClick={() => setCreateForm({...createForm, participant_video: !createForm.participant_video})}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${createForm.participant_video ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${createForm.participant_video ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Waiting Room
                    </span>
                    <button
                      onClick={() => setCreateForm({...createForm, waiting_room: !createForm.waiting_room})}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${createForm.waiting_room ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${createForm.waiting_room ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Mute on Entry
                    </span>
                    <button
                      onClick={() => setCreateForm({...createForm, mute_upon_entry: !createForm.mute_upon_entry})}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${createForm.mute_upon_entry ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${createForm.mute_upon_entry ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateMeeting}
                disabled={loading || !createForm.topic.trim()}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                <span>{loading ? 'Creating...' : 'Create Meeting'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="max-w-4xl mx-auto">
          <div className={`
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            border rounded-xl p-6 text-center
          `}>
            <BarChart3 className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Analytics Coming Soon
            </h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Meeting analytics and reporting features will be available here
            </p>
          </div>
        </div>
      )}
      </div>
    </>
  );
}