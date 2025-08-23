import React, { useState, useEffect } from 'react';
import {
  Video,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  User,
  Mail,
  Calendar,
  Settings,
  ArrowRight,
  Lock,
  Wifi,
  WifiOff,
  Key
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { zoomMeetingSDK } from '../../services/zoom/zoomMeetingSDKService';

interface ZoomConnectionInterfaceProps {
  onConnectionSuccess: (connectionInfo: any) => void;
}

export function ZoomConnectionInterface({ onConnectionSuccess }: ZoomConnectionInterfaceProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionForm, setConnectionForm] = useState({
    displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    email: user?.email || '',
    password: ''
  });

  // Check SDK configuration
  const sdkConfigStatus = zoomMeetingSDK.getConfigStatus();
  const hasSDKConfig = sdkConfigStatus.configured;

  const handleConnectWithZoom = () => {
    if (!hasSDKConfig) {
      setConnectionError('Zoom SDK is not properly configured. Please check your environment variables.');
      return;
    }
    setShowConnectionModal(true);
    setConnectionError(null);
  };

  const handleConnectionSubmit = async () => {
    if (!connectionForm.displayName.trim() || !connectionForm.email.trim() || !connectionForm.password.trim()) {
      setConnectionError('Please fill in all required fields');
      return;
    }

    setConnecting(true);
    setConnectionError(null);

    try {
      console.log('🔄 Starting connection process...');
      
      // First attempt to authenticate with Zoom SDK using email and password
      console.log('🔐 Authenticating with Zoom...');
      const authResult = await zoomMeetingSDK.authenticateUser({
        email: connectionForm.email,
        password: connectionForm.password,
        displayName: connectionForm.displayName
      });

      if (!authResult.success) {
        console.error('❌ Zoom authentication failed:', authResult.error);
        setConnectionError(authResult.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      console.log('✅ Zoom authentication successful');

      // If authentication successful, connect user with the provided information
      console.log('💾 Saving connection to database...');
      const success = await zoomMeetingSDK.connectUser({
        user_id: user?.id,
        zoom_email: connectionForm.email,
        zoom_display_name: connectionForm.displayName,
        zoom_user_id: authResult.userId,
        zoom_account_id: authResult.accountId,
        is_active: true
      });

      if (success) {
        console.log('✅ Connection saved successfully');
        
        // Get the connection info and pass it up
        const connectionInfo = await zoomMeetingSDK.getUserConnection(user?.id || '');
        
        if (connectionInfo) {
          console.log('✅ Retrieved connection info:', connectionInfo);
          onConnectionSuccess(connectionInfo);
          setShowConnectionModal(false);
          
          // Clear the form for security
          setConnectionForm({
            displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
            email: user?.email || '',
            password: ''
          });
        } else {
          console.error('❌ Failed to retrieve connection info after saving');
          setConnectionError('Connection saved but failed to retrieve connection info. Please refresh and try again.');
        }
      } else {
        console.error('❌ Failed to save connection');
        setConnectionError('Failed to save connection. Please check your authentication and try again.');
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication error')) {
          errorMessage = 'Authentication failed: You are not logged into Centrinote properly. Please refresh and login again.';
        } else if (error.message.includes('Failed to save connection')) {
          errorMessage = 'Database error: ' + error.message;
        } else if (error.message.includes('required')) {
          errorMessage = 'Missing information: ' + error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setConnectionError(errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      {/* Main Connection Interface */}
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Connection Status Banner */}
          <div className={`
            ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}
            border rounded-xl p-8 text-center mb-8
          `}>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className={`
                  p-4 rounded-full
                  ${darkMode ? 'bg-blue-800' : 'bg-blue-100'}
                `}>
                  <WifiOff className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
            
            <h2 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Connect Your Zoom Account
            </h2>
            
            <p className={`text-lg mb-6 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              To start creating and managing Zoom meetings, you need to connect your Zoom account first.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-800/50' : 'bg-blue-100/50'}`}>
                <Shield className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                  Secure Connection
                </h3>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  SDK-based authentication for maximum security
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-800/50' : 'bg-blue-100/50'}`}>
                <Calendar className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                  Meeting Management
                </h3>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Create, join, and manage meetings seamlessly
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-800/50' : 'bg-blue-100/50'}`}>
                <Zap className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                  Integrated Experience
                </h3>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  No external redirects, everything in Centrinote
                </p>
              </div>
            </div>

            <button
              onClick={handleConnectWithZoom}
              disabled={!hasSDKConfig}
              className={`
                inline-flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold text-lg
                transition-all duration-200 transform hover:scale-105
                ${hasSDKConfig 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Video className="w-6 h-6" />
              <span>Connect with Zoom</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {!hasSDKConfig && (
              <p className={`mt-4 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                SDK configuration required. Please check ZOOM_SETUP.md for setup instructions.
              </p>
            )}
          </div>

          {/* Configuration Requirements */}
          {!hasSDKConfig && (
            <div className={`
              ${darkMode ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}
              border rounded-xl p-6
            `}>
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Configuration Required</h3>
                  <p className="text-sm mb-3">
                    Before you can connect with Zoom, the following configuration is needed:
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {sdkConfigStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  <p className="text-sm mt-3">
                    Please check <code className="bg-black/10 px-2 py-1 rounded">ZOOM_SETUP.md</code> for detailed setup instructions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {connectionError && (
            <div className={`
              ${darkMode ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-800'}
              border rounded-xl p-4 mt-4
            `}>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{connectionError}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`
            ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
            border rounded-xl p-6 w-full max-w-md shadow-2xl
          `}>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className={`
                  p-3 rounded-full transition-all duration-200
                  ${connecting 
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }
                `}>
                  {connecting ? (
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Video className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
              <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {connecting ? 'Authenticating...' : 'Connect with Zoom'}
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {connecting 
                  ? 'Please wait while we verify your Zoom credentials...' 
                  : 'Enter your Zoom credentials to connect your account'
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Display Name *
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={connectionForm.displayName}
                    onChange={(e) => setConnectionForm({...connectionForm, displayName: e.target.value})}
                    placeholder="Your display name"
                    disabled={connecting}
                    className={`
                      pl-10 pr-4 py-3 w-full rounded-lg border transition-colors
                      ${darkMode 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50
                    `}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="email"
                    value={connectionForm.email}
                    onChange={(e) => setConnectionForm({...connectionForm, email: e.target.value})}
                    placeholder="your.email@example.com"
                    disabled={connecting}
                    className={`
                      pl-10 pr-4 py-3 w-full rounded-lg border transition-colors
                      ${darkMode 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50
                    `}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zoom Password *
                </label>
                <div className="relative">
                  <Key className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="password"
                    value={connectionForm.password}
                    onChange={(e) => setConnectionForm({...connectionForm, password: e.target.value})}
                    placeholder="Your Zoom password"
                    disabled={connecting}
                    className={`
                      pl-10 pr-4 py-3 w-full rounded-lg border transition-colors
                      ${darkMode 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50
                    `}
                  />
                </div>
              </div>

              {connectionError && (
                <div className={`
                  p-3 rounded-lg flex items-center space-x-2
                  ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-800'}
                `}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{connectionError}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  setConnectionError(null);
                }}
                disabled={connecting}
                className={`
                  flex-1 px-4 py-3 rounded-lg font-medium transition-colors
                  ${darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                Cancel
              </button>
              <button
                onClick={handleConnectionSubmit}
                disabled={connecting || !connectionForm.displayName.trim() || !connectionForm.email.trim() || !connectionForm.password.trim()}
                className={`
                  flex-1 flex items-center justify-center space-x-2 px-4 py-3 
                  bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium
                  hover:shadow-md transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {connecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Connect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}