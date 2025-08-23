import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Users,
  Settings,
  Phone,
  PhoneOff,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  MessageCircle,
  Hand,
  Camera,
  CameraOff,
  Recording,
  Square,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { ZoomSDKAuth } from '../../services/zoom/zoomSDKAuth';

interface ZoomMeetingSDKProps {
  meetingNumber: string;
  userName: string;
  userEmail: string;
  passWord?: string;
  role?: '0' | '1'; // 0 = participant, 1 = host
  onMeetingEnd?: () => void;
  onMeetingError?: (error: string) => void;
}

export function ZoomMeetingSDK({
  meetingNumber,
  userName,
  userEmail,
  passWord,
  role = '0',
  onMeetingEnd,
  onMeetingError
}: ZoomMeetingSDKProps) {
  const { state } = useApp();
  const { darkMode } = state;
  const sdkAuthRef = useRef<ZoomSDKAuth>(new ZoomSDKAuth());

  // Meeting states
  const [isJoining, setIsJoining] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio/Video controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Participants
  const [participantsCount, setParticipantsCount] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Refs
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zoomMeetingRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Zoom SDK when component mounts
    initializeZoomSDK();

    return () => {
      // Cleanup on unmount
      if (isInMeeting) {
        leaveMeeting();
      }
    };
  }, []);

  const initializeZoomSDK = async () => {
    try {
      console.log('🔧 Initializing Zoom Meeting SDK...');
      
      // Load Zoom SDK if not already loaded
      if (!(window as any).ZoomMtg) {
        await loadZoomSDK();
      }

      const ZoomMtg = (window as any).ZoomMtg;
      
      // Set up SDK configuration
      ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();

      // Set language
      ZoomMtg.i18n.load('fr-FR');
      ZoomMtg.i18n.reload('fr-FR');

      // Register event callbacks
      ZoomMtg.inMeetingServiceListener('onUserJoin', onUserJoin);
      ZoomMtg.inMeetingServiceListener('onUserLeave', onUserLeave);
      ZoomMtg.inMeetingServiceListener('onMeetingStatus', onMeetingStatus);
      ZoomMtg.inMeetingServiceListener('onRecordingStatus', onRecordingStatus);

      zoomMeetingRef.current = ZoomMtg;
      console.log('✅ Zoom SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Zoom SDK:', error);
      setMeetingError('Failed to initialize Zoom SDK');
      onMeetingError?.('Failed to initialize Zoom SDK');
    }
  };

  const loadZoomSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).ZoomMtg) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://source.zoom.us/2.18.0/lib/vendor/react.min.js';
      script.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://source.zoom.us/2.18.0/lib/vendor/react-dom.min.js';
        script2.onload = () => {
          const script3 = document.createElement('script');
          script3.src = 'https://source.zoom.us/2.18.0/lib/vendor/redux.min.js';
          script3.onload = () => {
            const script4 = document.createElement('script');
            script4.src = 'https://source.zoom.us/2.18.0/lib/vendor/lodash.min.js';
            script4.onload = () => {
              const script5 = document.createElement('script');
              script5.src = 'https://source.zoom.us/2.18.0/lib/ZoomMtg.min.js';
              script5.onload = () => resolve();
              script5.onerror = () => reject(new Error('Failed to load ZoomMtg.min.js'));
              document.head.appendChild(script5);
            };
            script4.onerror = () => reject(new Error('Failed to load lodash'));
            document.head.appendChild(script4);
          };
          script3.onerror = () => reject(new Error('Failed to load redux'));
          document.head.appendChild(script3);
        };
        script2.onerror = () => reject(new Error('Failed to load react-dom'));
        document.head.appendChild(script2);
      };
      script.onerror = () => reject(new Error('Failed to load react'));
      document.head.appendChild(script);
    });
  };

  const joinMeeting = async () => {
    setIsJoining(true);
    setMeetingError(null);

    try {
      const result = await sdkAuthRef.current.joinMeeting({
        meetingNumber,
        userName,
        userEmail,
        passWord,
        role
      });

      if (result.success) {
        setIsInMeeting(true);
        console.log('✅ Successfully joined Zoom meeting');
      } else {
        throw new Error(result.error || 'Failed to join meeting');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join meeting';
      console.error('❌ Error joining meeting:', errorMessage);
      setMeetingError(errorMessage);
      onMeetingError?.(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const leaveMeeting = async () => {
    try {
      await sdkAuthRef.current.leaveMeeting();
      setIsInMeeting(false);
      setIsJoining(false);
      onMeetingEnd?.();
    } catch (error) {
      console.error('❌ Error leaving meeting:', error);
    }
  };

  // SDK Event handlers
  const onUserJoin = (data: any) => {
    console.log('👤 User joined:', data);
    setParticipantsCount(prev => prev + 1);
  };

  const onUserLeave = (data: any) => {
    console.log('👋 User left:', data);
    setParticipantsCount(prev => Math.max(0, prev - 1));
  };

  const onMeetingStatus = (data: any) => {
    console.log('📊 Meeting status:', data);
    if (data.meetingStatus === 'MEETING_STATUS_ENDED') {
      setIsInMeeting(false);
      onMeetingEnd?.();
    }
  };

  const onRecordingStatus = (data: any) => {
    console.log('🎬 Recording status:', data);
    setIsRecording(data.isRecording);
  };

  // Control functions (these would interface with Zoom SDK)
  const toggleAudio = () => {
    if (zoomMeetingRef.current) {
      if (isAudioMuted) {
        zoomMeetingRef.current.muteAudio({ mute: false });
      } else {
        zoomMeetingRef.current.muteAudio({ mute: true });
      }
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (zoomMeetingRef.current) {
      if (isVideoOff) {
        zoomMeetingRef.current.muteVideo({ mute: false });
      } else {
        zoomMeetingRef.current.muteVideo({ mute: true });
      }
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = () => {
    if (zoomMeetingRef.current) {
      if (isScreenSharing) {
        zoomMeetingRef.current.stopShareScreen();
      } else {
        zoomMeetingRef.current.startShareScreen();
      }
      setIsScreenSharing(!isScreenSharing);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      meetingContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (meetingError && !isInMeeting) {
    return (
      <div className={`
        ${darkMode ? 'bg-gray-900' : 'bg-white'} 
        rounded-xl p-8 text-center border 
        ${darkMode ? 'border-red-800' : 'border-red-200'}
      `}>
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Erreur de connexion
        </h3>
        <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {meetingError}
        </p>
        <button
          onClick={() => {
            setMeetingError(null);
            joinMeeting();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!isInMeeting) {
    return (
      <div className={`
        ${darkMode ? 'bg-gray-900' : 'bg-white'} 
        rounded-xl p-8 text-center border 
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
      `}>
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <Video className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Rejoindre la réunion
        </h3>
        <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Réunion: {meetingNumber}
        </p>
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Utilisateur: {userName} ({userEmail})
        </p>
        <button
          onClick={joinMeeting}
          disabled={isJoining}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 mx-auto"
        >
          {isJoining ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Video className="w-5 h-5" />
          )}
          <span>{isJoining ? 'Connexion...' : 'Rejoindre la réunion'}</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={meetingContainerRef}
      className={`
        ${darkMode ? 'bg-gray-900' : 'bg-white'} 
        rounded-xl overflow-hidden border 
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
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
            Réunion en cours
          </span>
          {isRecording && (
            <div className="flex items-center space-x-1 text-red-500">
              <Recording className="w-4 h-4" />
              <span className="text-sm">REC</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`
              flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
            `}
          >
            <Users className="w-4 h-4" />
            <span>{participantsCount}</span>
          </button>
          
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

      {/* Meeting Content */}
      <div className="relative">
        {/* Zoom SDK will render here */}
        <div id="zmmtg-root" className="w-full h-96"></div>
        
        {/* Meeting placeholder (when SDK is not rendering) */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center">
            <Video className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Chargement de la réunion...
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Controls */}
      <div className={`
        flex items-center justify-center space-x-2 p-4 border-t 
        ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
      `}>
        {/* Audio Control */}
        <button
          onClick={toggleAudio}
          className={`
            p-3 rounded-full transition-all duration-200
            ${isAudioMuted 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-500 hover:bg-gray-600'
            } text-white
          `}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Control */}
        <button
          onClick={toggleVideo}
          className={`
            p-3 rounded-full transition-all duration-200
            ${isVideoOff 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-500 hover:bg-gray-600'
            } text-white
          `}
        >
          {isVideoOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`
            p-3 rounded-full transition-all duration-200
            ${isScreenSharing 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-500 hover:bg-gray-600'
            } text-white
          `}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Chat */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200"
        >
          <MessageCircle className="w-5 h-5" />
        </button>

        {/* Leave Meeting */}
        <button
          onClick={leaveMeeting}
          className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className={`
          absolute top-0 right-0 w-80 h-full border-l
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}>
          <div className="p-4">
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Participants ({participantsCount})
            </h3>
            {/* Participants list would go here */}
          </div>
        </div>
      )}
    </div>
  );
}