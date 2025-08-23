import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Users,
  PhoneOff,
  Maximize,
  Minimize,
  MessageCircle,
  Settings,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { zoomMeetingSDK } from '../../services/zoom/zoomMeetingSDKService';

interface SimplifiedZoomMeetingProps {
  meetingNumber?: string;
  userName?: string;
  userEmail?: string;
  passWord?: string;
  role?: '0' | '1'; // 0 = participant, 1 = host
  autoJoin?: boolean;
  onMeetingEnd?: () => void;
  onMeetingError?: (error: string) => void;
  onUserConnected?: (userInfo: any) => void;
}

export function SimplifiedZoomMeeting({
  meetingNumber = '',
  userName = '',
  userEmail = '',
  passWord = '',
  role = '0',
  autoJoin = false,
  onMeetingEnd,
  onMeetingError,
  onUserConnected
}: SimplifiedZoomMeetingProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  // States
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isJoining, setIsJoining] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(!meetingNumber);
  
  // Form states
  const [formData, setFormData] = useState({
    meetingNumber: meetingNumber,
    userName: userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    userEmail: userEmail || user?.email || '',
    passWord: passWord,
    role: role
  });
  
  // Meeting controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSDK();
    
    // Create SDK container element if it doesn't exist
    if (!document.getElementById('zoomSdkContainer')) {
      const container = document.createElement('div');
      container.id = 'zoomSdkContainer';
      container.style.width = '100%';
      container.style.height = '600px';
      container.style.position = 'relative';
      if (sdkContainerRef.current) {
        sdkContainerRef.current.appendChild(container);
      }
    }

    return () => {
      if (isInMeeting) {
        leaveMeeting();
      }
      zoomMeetingSDK.cleanup();
    };
  }, []);

  useEffect(() => {
    if (autoJoin && meetingNumber && !isInMeeting && sdkStatus === 'ready') {
      handleJoinMeeting();
    }
  }, [autoJoin, meetingNumber, isInMeeting, sdkStatus]);

  const initializeSDK = async () => {
    try {
      setSdkStatus('loading');
      setError(null);
      
      const initialized = await zoomMeetingSDK.initialize();
      
      if (initialized) {
        setSdkStatus('ready');
        console.log('✅ Zoom SDK ready');
      } else {
        throw new Error('Failed to initialize Zoom SDK');
      }
    } catch (error) {
      console.error('❌ SDK initialization error:', error);
      setSdkStatus('error');
      setError(error instanceof Error ? error.message : 'SDK initialization failed');
      onMeetingError?.(error instanceof Error ? error.message : 'SDK initialization failed');
    }
  };

  const handleJoinMeeting = async () => {
    if (!formData.meetingNumber.trim()) {
      setError('Meeting number is required');
      return;
    }

    if (!formData.userName.trim()) {
      setError('Your name is required');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await zoomMeetingSDK.joinMeeting({
        meetingNumber: formData.meetingNumber,
        userName: formData.userName,
        userEmail: formData.userEmail,
        passWord: formData.passWord,
        role: formData.role
      });

      if (result.success) {
        setIsInMeeting(true);
        setShowConnectionForm(false);
        
        // Notify parent component
        onUserConnected?.({
          meetingNumber: formData.meetingNumber,
          userName: formData.userName,
          userEmail: formData.userEmail,
          role: formData.role
        });
        
        console.log('✅ Successfully joined meeting');
      } else {
        throw new Error(result.error || 'Failed to join meeting');
      }
    } catch (error) {
      console.error('❌ Join meeting error:', error);
      setError(error instanceof Error ? error.message : 'Failed to join meeting');
      onMeetingError?.(error instanceof Error ? error.message : 'Failed to join meeting');
    } finally {
      setIsJoining(false);
    }
  };

  const leaveMeeting = async () => {
    try {
      await zoomMeetingSDK.leaveMeeting();
      setIsInMeeting(false);
      setShowConnectionForm(true);
      onMeetingEnd?.();
    } catch (error) {
      console.error('❌ Leave meeting error:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // Clear error when user types
  };

  // SDK Loading State
  if (sdkStatus === 'loading') {
    return (
      <div className={`
        ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-8 text-center
      `}>
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Initializing Zoom SDK
        </h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Setting up meeting environment...
        </p>
      </div>
    );
  }

  // SDK Error State
  if (sdkStatus === 'error') {
    return (
      <div className={`
        ${darkMode ? 'bg-gray-900 border-red-800' : 'bg-white border-red-200'}
        border rounded-xl p-8 text-center
      `}>
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          SDK Initialization Failed
        </h3>
        <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {error}
        </p>
        <button
          onClick={initializeSDK}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Connection Form
  if (showConnectionForm && !isInMeeting) {
    return (
      <div 
        ref={containerRef}
        className={`
          ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-xl p-6
        `}
      >
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Video className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Join Zoom Meeting
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter meeting details to join
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Meeting Number *
              </label>
              <input
                type="text"
                value={formData.meetingNumber}
                onChange={(e) => handleInputChange('meetingNumber', e.target.value)}
                placeholder="123 456 789"
                className={`
                  w-full px-4 py-3 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Name *
              </label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => handleInputChange('userName', e.target.value)}
                placeholder="John Doe"
                className={`
                  w-full px-4 py-3 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                type="email"
                value={formData.userEmail}
                onChange={(e) => handleInputChange('userEmail', e.target.value)}
                placeholder="john@example.com"
                className={`
                  w-full px-4 py-3 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Password (if required)
              </label>
              <input
                type="password"
                value={formData.passWord}
                onChange={(e) => handleInputChange('passWord', e.target.value)}
                placeholder="Meeting password"
                className={`
                  w-full px-4 py-3 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
              />
            </div>

            <button
              onClick={handleJoinMeeting}
              disabled={isJoining}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {isJoining ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>{isJoining ? 'Joining...' : 'Join Meeting'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Meeting Interface
  if (isInMeeting) {
    return (
      <div 
        ref={containerRef}
        className={`
          ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-xl overflow-hidden
          ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'relative'}
        `}
      >
        {/* Meeting Header */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
        `}>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Meeting: {formData.meetingNumber}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {participantsCount} participant{participantsCount > 1 ? 's' : ''}
            </span>
            
            <button
              onClick={toggleFullscreen}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
              `}
            >
              {isFullscreen ? (
                <Minimize className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              ) : (
                <Maximize className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              )}
            </button>
          </div>
        </div>

        {/* Zoom SDK Container */}
        <div 
          ref={sdkContainerRef}
          className="relative"
          style={{ height: isFullscreen ? 'calc(100vh - 140px)' : '500px' }}
        >
          {/* SDK will render here */}
        </div>

        {/* Meeting Controls */}
        <div className={`
          flex items-center justify-center space-x-3 p-4 border-t
          ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
        `}>
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`
              p-3 rounded-full transition-all duration-200
              ${isAudioMuted 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-600 hover:bg-gray-700'
              } text-white
            `}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`
              p-3 rounded-full transition-all duration-200
              ${isVideoOff 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-600 hover:bg-gray-700'
              } text-white
            `}
            title={isVideoOff ? 'Start Video' : 'Stop Video'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            className="p-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200"
            title="Share Screen"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            className="p-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200"
            title="Chat"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          <button
            onClick={leaveMeeting}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}