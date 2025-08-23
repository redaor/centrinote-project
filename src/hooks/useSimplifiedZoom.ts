import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { zoomMeetingSDK } from '../services/zoom/zoomMeetingSDKService';

interface ZoomConnection {
  isConnected: boolean;
  connectionInfo: any | null;
  isLoading: boolean;
  error: string | null;
}

interface ZoomMeeting {
  id: string;
  meeting_id: string;
  meeting_number: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  status: string;
  has_recording: boolean;
}

export function useSimplifiedZoom() {
  const { state } = useApp();
  const { user } = state;
  
  const [connection, setConnection] = useState<ZoomConnection>({
    isConnected: false,
    connectionInfo: null,
    isLoading: true,
    error: null
  });
  
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus();
      loadMeetings();
    }
  }, [user?.id]);

  const checkConnectionStatus = async () => {
    if (!user?.id) {
      setConnection({
        isConnected: false,
        connectionInfo: null,
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      const connectionInfo = await zoomMeetingSDK.getUserConnection(user.id);
      setConnection({
        isConnected: !!connectionInfo,
        connectionInfo,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnection({
        isConnected: false,
        connectionInfo: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection check failed'
      });
    }
  };

  const loadMeetings = async () => {
    if (!user?.id) return;
    
    setLoadingMeetings(true);
    try {
      const userMeetings = await zoomMeetingSDK.getUserMeetings(user.id);
      setMeetings(userMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const createMeeting = async (meetingData: any) => {
    try {
      const meeting = await zoomMeetingSDK.createMeeting(meetingData);
      if (meeting) {
        await loadMeetings(); // Refresh meetings list
        return meeting;
      }
      return null;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  };

  const connectUser = async (userInfo: any) => {
    try {
      const success = await zoomMeetingSDK.connectUser(userInfo);
      if (success) {
        await checkConnectionStatus(); // Refresh connection status
      }
      return success;
    } catch (error) {
      console.error('Error connecting user:', error);
      throw error;
    }
  };

  const disconnectUser = async () => {
    if (!user?.id) return false;
    
    try {
      const success = await zoomMeetingSDK.disconnectUser(user.id);
      if (success) {
        await checkConnectionStatus(); // Refresh connection status
      }
      return success;
    } catch (error) {
      console.error('Error disconnecting user:', error);
      return false;
    }
  };

  return {
    // Connection status
    connection,
    isConnected: connection.isConnected,
    connectionInfo: connection.connectionInfo,
    isLoadingConnection: connection.isLoading,
    connectionError: connection.error,
    
    // Meetings
    meetings,
    loadingMeetings,
    
    // Actions
    checkConnectionStatus,
    loadMeetings,
    createMeeting,
    connectUser,
    disconnectUser,
    
    // SDK service
    sdk: zoomMeetingSDK
  };
}