import React, { useState, useEffect } from 'react';
import {
  Bug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Database
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { zoomMeetingSDK } from '../../services/zoom/zoomMeetingSDKService';
import { testZoomDatabaseSetup } from '../../utils/testDatabase';

export function ZoomDebugInfo() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      refreshDebugInfo();
    }
  }, [isVisible, user?.id]);

  const refreshDebugInfo = async () => {
    setIsRefreshing(true);
    
    try {
      const info = {
        timestamp: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          authenticated: !!user
        },
        environment: {
          hasZoomSDKKey: !!import.meta.env.VITE_ZOOM_SDK_KEY,
          hasZoomSDKSecret: !!import.meta.env.VITE_ZOOM_SDK_SECRET,
          nodeEnv: import.meta.env.NODE_ENV,
          isDevelopment: import.meta.env.DEV
        },
        sdk: {
          configStatus: zoomMeetingSDK.getConfigStatus()
        },
        database: null,
        connection: null,
        meetings: []
      };

      // Test database connection
      try {
        info.database = await zoomMeetingSDK.testDatabaseConnection();
      } catch (error) {
        info.database = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }

      // Check user connection if user exists
      if (user?.id) {
        try {
          info.connection = await zoomMeetingSDK.getUserConnection(user.id);
          info.meetings = await zoomMeetingSDK.getUserMeetings(user.id);
        } catch (error) {
          info.connection = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }

      setDebugInfo(info);
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg transition-colors"
          title="Show Zoom Debug Info"
        >
          <Bug className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`
        ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-xl p-4 shadow-xl max-h-96 overflow-y-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bug className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Zoom Debug Info
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshDebugInfo}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Refresh debug info"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={() => {
                console.log('🧪 Running database test...');
                testZoomDatabaseSetup();
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Test database setup"
            >
              <Database className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Hide debug info"
            >
              <EyeOff className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <div className="space-y-3 text-sm">
            {/* User Status */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                {debugInfo.user?.authenticated ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  User Authentication
                </span>
              </div>
              <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {debugInfo.user?.authenticated ? (
                  <>
                    <div>ID: {debugInfo.user.id}</div>
                    <div>Email: {debugInfo.user.email}</div>
                  </>
                ) : (
                  <div>Not authenticated</div>
                )}
              </div>
            </div>

            {/* Environment */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Settings className="w-4 h-4 text-blue-500" />
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Environment
                </span>
              </div>
              <div className={`text-xs ml-6 space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="flex justify-between">
                  <span>SDK Key:</span>
                  {debugInfo.environment?.hasZoomSDKKey ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <div className="flex justify-between">
                  <span>SDK Secret:</span>
                  {debugInfo.environment?.hasZoomSDKSecret ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <div>Environment: {debugInfo.environment?.nodeEnv}</div>
                <div>Development: {debugInfo.environment?.isDevelopment ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {/* SDK Status */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                {debugInfo.sdk?.configStatus?.configured ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  SDK Configuration
                </span>
              </div>
              <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {debugInfo.sdk?.configStatus?.configured ? (
                  <div>SDK properly configured</div>
                ) : (
                  <div>
                    <div>Issues:</div>
                    <ul className="list-disc list-inside ml-2">
                      {debugInfo.sdk?.configStatus?.errors?.map((error: string, index: number) => (
                        <li key={index} className="text-red-400">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Database Status */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                {debugInfo.database?.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Database Connection
                </span>
              </div>
              <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {debugInfo.database?.success ? (
                  <div>
                    <div>✅ Connection successful</div>
                    <div>Table: zoom_user_connections accessible</div>
                    {debugInfo.database.details?.user_email && (
                      <div>Auth: {debugInfo.database.details.user_email}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-red-400">❌ {debugInfo.database?.error || 'Connection failed'}</div>
                    {debugInfo.database?.details?.hint && (
                      <div className="text-xs mt-1">Hint: {debugInfo.database.details.hint}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Connection Status */}
            {debugInfo.user?.authenticated && (
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  {debugInfo.connection && !debugInfo.connection.error ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Zoom Connection
                  </span>
                </div>
                <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {debugInfo.connection ? (
                    debugInfo.connection.error ? (
                      <div className="text-red-400">Error: {debugInfo.connection.error}</div>
                    ) : (
                      <>
                        <div>Email: {debugInfo.connection.zoom_email}</div>
                        <div>Display Name: {debugInfo.connection.zoom_display_name}</div>
                        <div>Active: {debugInfo.connection.is_active ? 'Yes' : 'No'}</div>
                        <div>Last Connected: {new Date(debugInfo.connection.last_connected_at).toLocaleString()}</div>
                      </>
                    )
                  ) : (
                    <div>No connection found</div>
                  )}
                </div>
              </div>
            )}

            {/* Meetings */}
            {debugInfo.meetings && (
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Meetings ({debugInfo.meetings.length})
                  </span>
                </div>
                <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {debugInfo.meetings.length === 0 ? (
                    <div>No meetings found</div>
                  ) : (
                    debugInfo.meetings.slice(0, 3).map((meeting: any) => (
                      <div key={meeting.id}>
                        {meeting.topic} - {meeting.status}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              Last updated: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleString() : 'Never'}
            </div>
          </div>
        )}

        {/* Error State */}
        {debugInfo?.error && (
          <div className="flex items-center space-x-2 text-red-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Error: {debugInfo.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}