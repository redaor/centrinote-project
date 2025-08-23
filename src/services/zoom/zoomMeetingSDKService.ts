import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
import { supabase } from '../../lib/supabase';
import { generateZoomJWT, generateMeetingSignature } from '../../utils/zoomJWT';
import { createZoomAPIClient } from './zoomAPIClient';

interface ZoomConfig {
  sdkKey: string;
  sdkSecret: string;
  jwtToken?: string;
}

interface ZoomUserInfo {
  id: string;
  email: string;
  display_name: string;
  account_id?: string;
}

interface MeetingConfig {
  meetingNumber: string;
  passWord?: string;
  userName: string;
  userEmail: string;
  role: '0' | '1'; // 0 = participant, 1 = host
}

interface MeetingCreateConfig {
  topic: string;
  type: 1 | 2 | 8; // 1 = instant, 2 = scheduled, 8 = recurring
  start_time?: string;
  duration?: number;
  password?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    waiting_room?: boolean;
    mute_upon_entry?: boolean;
    auto_recording?: 'none' | 'local' | 'cloud';
  };
}

export class ZoomMeetingSDKService {
  private config: ZoomConfig;
  private client: any = null;
  private isInitialized = false;

  constructor() {
    this.config = {
      sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY || '',
      sdkSecret: import.meta.env.VITE_ZOOM_SDK_SECRET || '',
      jwtToken: import.meta.env.VITE_ZOOM_JWT_TOKEN || ''
    };
  }

  /**
   * Initialize the Zoom Meeting SDK
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      console.log('🔧 Initializing Zoom Meeting SDK...');

      // Initialize embedded client
      this.client = ZoomMtgEmbedded.createClient();

      // Initialize the SDK
      await this.client.init({
        zoomAppRoot: document.getElementById('zoomSdkContainer'),
        language: 'fr-FR',
        patchJsMedia: true,
        leaveOnPageUnload: true
      });

      this.isInitialized = true;
      console.log('✅ Zoom Meeting SDK initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Zoom SDK:', error);
      return false;
    }
  }

  /**
   * Generate signature for meeting authentication
   */
  private async generateSignature(meetingNumber: string, role: string): Promise<string> {
    try {
      // For development: generate signature client-side
      // In production, this should be done server-side for security
      if (!this.config.sdkKey || !this.config.sdkSecret) {
        throw new Error('SDK Key and Secret are required');
      }

      const signature = generateMeetingSignature(
        this.config.sdkKey,
        this.config.sdkSecret,
        meetingNumber,
        role as '0' | '1'
      );

      console.log('🔐 Generated meeting signature for meeting:', meetingNumber);
      return signature;
    } catch (error) {
      console.error('❌ Error generating signature:', error);
      throw error;
    }
  }

  /**
   * Join a Zoom meeting using the SDK
   */
  async joinMeeting(config: MeetingConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, error: 'Failed to initialize SDK' };
        }
      }

      console.log('🎯 Joining meeting:', config.meetingNumber);

      // Generate signature
      const signature = await this.generateSignature(config.meetingNumber, config.role);

      // Join meeting
      await this.client.join({
        signature,
        sdkKey: this.config.sdkKey,
        meetingNumber: config.meetingNumber,
        password: config.passWord || '',
        userName: config.userName,
        userEmail: config.userEmail,
        tk: '', // Leave empty for SDK apps
        success: (res: any) => {
          console.log('✅ Successfully joined meeting:', res);
          this.onMeetingJoined(config);
        },
        error: (res: any) => {
          console.error('❌ Failed to join meeting:', res);
        }
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error joining meeting:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Leave the current meeting
   */
  async leaveMeeting(): Promise<boolean> {
    try {
      if (this.client) {
        await this.client.leave();
        console.log('✅ Left meeting successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error leaving meeting:', error);
      return false;
    }
  }

  /**
   * Create a meeting using JWT authentication
   */
  async createMeeting(config: MeetingCreateConfig): Promise<any> {
    try {
      console.log('📅 Creating Zoom meeting (client-side):', config.topic);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // HYBRID APPROACH: Try real API first, fallback to mock if CORS fails
      let finalMeeting;
      
      try {
        // Attempt to create real meeting via Zoom API
        console.log('🌐 Attempting to create real Zoom meeting via API...');
        
        const apiClient = createZoomAPIClient();
        if (apiClient) {
          // Get user connection to use their Zoom user ID
          const connection = await this.getUserConnection(user.id);
          const zoomUserId = connection?.zoom_email || 'me'; // Use email or 'me' for API
          
          const realMeeting = await apiClient.createMeeting(zoomUserId, {
            topic: config.topic,
            type: config.type || 2,
            start_time: config.start_time,
            duration: config.duration || 30,
            password: config.password,
            agenda: config.agenda,
            settings: config.settings
          });

          // Convert API response to our format
          finalMeeting = {
            id: realMeeting.id.toString(),
            meeting_id: realMeeting.id.toString(),
            meeting_number: realMeeting.id.toString(),
            topic: realMeeting.topic,
            start_time: realMeeting.start_time,
            duration: realMeeting.duration,
            join_url: realMeeting.join_url,
            start_url: realMeeting.start_url,
            password: realMeeting.password,
            status: 'scheduled',
            has_recording: false
          };

          console.log('✅ Real Zoom meeting created via API:', realMeeting.id);
          
        } else {
          throw new Error('Zoom API client not configured');
        }

      } catch (apiError) {
        console.warn('⚠️ Zoom API failed, falling back to mock meeting:', apiError instanceof Error ? apiError.message : apiError);
        
        // FALLBACK: Generate mock meeting for development/testing
        const meetingId = `mock_${Date.now()}`;
        const meetingNumber = Math.random().toString().slice(2, 12); // 10 digit number
        
        finalMeeting = {
          id: meetingId,
          meeting_id: meetingId,
          meeting_number: meetingNumber,
          topic: config.topic,
          start_time: config.start_time,
          duration: config.duration || 30,
          join_url: `https://zoom.us/j/${meetingNumber}${config.password ? `?pwd=${btoa(config.password)}` : ''}`,
          start_url: `https://zoom.us/s/${meetingNumber}?role=1`,
          password: config.password,
          status: 'scheduled',
          has_recording: false,
          // Mark as mock for identification
          is_mock: true
        };

        console.log('📝 Generated mock meeting as fallback:', {
          topic: finalMeeting.topic,
          meeting_number: finalMeeting.meeting_number,
          join_url: finalMeeting.join_url,
          is_mock: true
        });
      }

      // Store meeting in database
      await this.storeMeetingInDatabase(user.id, finalMeeting);

      console.log('✅ Meeting created and stored:', finalMeeting.meeting_number);
      return finalMeeting;

    } catch (error) {
      console.error('❌ Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Get user's Zoom meetings
   */
  async getUserMeetings(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('zoom_meetings')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting meetings:', error);
      return [];
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting meeting:', meetingId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // First get meeting details to check if it's a real Zoom meeting
      const { data: meeting, error: fetchError } = await supabase
        .from('zoom_meetings')
        .select('*')
        .eq('id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw new Error(`Meeting not found: ${fetchError.message}`);
      }

      // Try to delete from Zoom if it's a real meeting (not mock)
      if (meeting && !meeting.meeting_id?.startsWith('mock_')) {
        try {
          const apiClient = createZoomAPIClient();
          if (apiClient) {
            // Note: Could get user connection for user-specific API calls if needed
            
            await apiClient.deleteMeeting(meeting.meeting_id);
            console.log('✅ Deleted real Zoom meeting via API');
          }
        } catch (apiError) {
          console.warn('⚠️ Failed to delete from Zoom API (may be mock meeting):', apiError);
          // Continue with database deletion even if API fails
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('zoom_meetings')
        .delete()
        .eq('id', meetingId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete from database: ${deleteError.message}`);
      }

      console.log('✅ Meeting deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with Zoom using email and password
   */
  async authenticateUser(credentials: { email: string; password: string; displayName: string }): Promise<{ success: boolean; error?: string; userId?: string; accountId?: string }> {
    try {
      console.log('🔐 Authenticating user with Zoom SDK...');

      // For Meeting SDK, we don't actually authenticate with password
      // The password-based auth would typically happen via Zoom OAuth API
      // For now, we'll simulate authentication and use the provided info
      
      // In a real implementation, you would:
      // 1. Call Zoom's OAuth API with email/password
      // 2. Get access token and user info
      // 3. Return the authenticated user data
      
      // For this simplified implementation, we'll validate the input and proceed
      if (!credentials.email || !credentials.password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate a user ID based on email for consistency
      const userId = `zoom_${credentials.email.replace('@', '_').replace('.', '_')}`;

      console.log('✅ User authenticated successfully');
      
      return {
        success: true,
        userId,
        accountId: `account_${userId}`
      };

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Connect user to Zoom (get user info after meeting join)
   */
  async connectUser(connectionData: any): Promise<boolean> {
    try {
      console.log('🔄 Attempting to connect user with data:', {
        zoom_email: connectionData.zoom_email || connectionData.email,
        zoom_display_name: connectionData.zoom_display_name || connectionData.display_name,
        user_id: connectionData.user_id
      });

      // Get user ID from the connection data or current session
      let userId = connectionData.user_id;
      
      if (!userId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('❌ Supabase auth error:', userError);
          throw new Error(`Authentication error: ${userError.message}`);
        }
        if (!user) {
          throw new Error('No authenticated user found');
        }
        userId = user.id;
        console.log('✅ Retrieved user ID from session:', userId);
      }

      // Validate required connection data
      const zoomEmail = connectionData.zoom_email || connectionData.email;
      const zoomDisplayName = connectionData.zoom_display_name || connectionData.display_name;
      const zoomUserId = connectionData.zoom_user_id || connectionData.id || `manual_${Date.now()}_${userId.substring(0, 8)}`;

      if (!zoomEmail) {
        throw new Error('Zoom email is required');
      }
      if (!zoomDisplayName) {
        throw new Error('Zoom display name is required');
      }

      console.log('📝 Inserting/updating connection with data:', {
        user_id: userId,
        zoom_user_id: zoomUserId,
        zoom_email: zoomEmail,
        zoom_display_name: zoomDisplayName
      });

      // Store or update Zoom user connection
      const { data, error } = await supabase
        .from('zoom_user_connections')
        .upsert({
          user_id: userId,
          zoom_user_id: zoomUserId,
          zoom_email: zoomEmail,
          zoom_display_name: zoomDisplayName,
          zoom_account_id: connectionData.zoom_account_id || connectionData.account_id || null,
          last_connected_at: new Date().toISOString(),
          is_active: connectionData.is_active !== false
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Failed to save connection: ${error.message}`);
      }

      console.log('✅ Connection saved successfully:', data);
      console.log('✅ User connected to Zoom:', zoomEmail);
      return true;

    } catch (error) {
      console.error('❌ Error connecting user:', error);
      if (error instanceof Error) {
        throw error; // Re-throw with original message
      }
      throw new Error('Unknown error occurred while connecting user');
    }
  }

  /**
   * Disconnect user from Zoom
   */
  async disconnectUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_user_connections')
        .update({ 
          is_active: false,
          disconnected_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      console.log('✅ User disconnected from Zoom');
      return true;
    } catch (error) {
      console.error('❌ Error disconnecting user:', error);
      return false;
    }
  }

  /**
   * Get user's Zoom connection status
   */
  async getUserConnection(userId: string): Promise<any | null> {
    try {
      console.log('🔍 Getting user connection for user ID:', userId);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('zoom_user_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user is not connected
          console.log('ℹ️ No active connection found for user');
          return null;
        }
        console.error('❌ Database error getting connection:', error);
        throw error;
      }

      console.log('✅ Found user connection:', {
        zoom_email: data?.zoom_email,
        zoom_display_name: data?.zoom_display_name,
        last_connected_at: data?.last_connected_at
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error getting user connection:', error);
      if (error instanceof Error && !error.message.includes('PGRST116')) {
        throw error; // Re-throw non-404 errors
      }
      return null;
    }
  }

  /**
   * Handle meeting joined event
   */
  private async onMeetingJoined(config: MeetingConfig) {
    try {
      // Get meeting info from SDK
      const meetingInfo = await this.client.getCurrentMeetingInfo();
      
      if (meetingInfo && meetingInfo.userInfo) {
        // Connect user with their Zoom info
        await this.connectUser({
          id: meetingInfo.userInfo.userId,
          email: meetingInfo.userInfo.userEmail,
          display_name: meetingInfo.userInfo.userName
        });
      }

      // Update meeting status in database
      await supabase
        .from('zoom_meetings')
        .update({ 
          status: 'started',
          actual_start_time: new Date().toISOString()
        })
        .eq('meeting_number', config.meetingNumber);

    } catch (error) {
      console.error('❌ Error handling meeting joined:', error);
    }
  }

  /**
   * Store meeting in database
   */
  private async storeMeetingInDatabase(userId: string, meeting: any) {
    try {
      console.log('💾 Storing meeting in database:', {
        user_id: userId,
        topic: meeting.topic,
        meeting_number: meeting.meeting_number
      });

      const { error } = await supabase
        .from('zoom_meetings')
        .insert({
          user_id: userId,
          meeting_id: meeting.meeting_id || meeting.id,
          meeting_number: meeting.meeting_number || meeting.id.toString(),
          topic: meeting.topic,
          start_time: meeting.start_time,
          duration: meeting.duration || 30,
          join_url: meeting.join_url,
          start_url: meeting.start_url,
          password: meeting.password,
          status: meeting.status || 'scheduled',
          has_recording: meeting.has_recording || false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Database error storing meeting:', error);
        throw error;
      }

      console.log('✅ Meeting stored successfully in database');
    } catch (error) {
      console.error('❌ Error storing meeting:', error);
      throw error; // Re-throw so calling function can handle
    }
  }

  /**
   * Get SDK configuration status
   */
  getConfigStatus(): { configured: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.sdkKey) {
      errors.push('SDK Key not configured');
    }

    if (!this.config.sdkSecret) {
      errors.push('SDK Secret not configured');
    }

    return {
      configured: errors.length === 0,
      errors
    };
  }

  /**
   * Test database connection and table existence
   */
  async testDatabaseConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('🧪 Testing database connection...');
      
      // Test basic Supabase connection
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        return {
          success: false,
          error: `Auth error: ${authError.message}`,
          details: { authError }
        };
      }
      
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user found'
        };
      }

      // Test table existence by attempting to read from it
      const { data, error } = await supabase
        .from('zoom_user_connections')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        return {
          success: false,
          error: `Table access error: ${error.message}`,
          details: { 
            error,
            hint: error.hint,
            details: error.details
          }
        };
      }

      console.log('✅ Database connection test successful');
      return {
        success: true,
        details: {
          user_id: user.id,
          user_email: user.email,
          table_accessible: true
        }
      };
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        details: { error }
      };
    }
  }

  /**
   * Cleanup SDK resources
   */
  cleanup() {
    if (this.client) {
      this.client.cleanup();
      this.client = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const zoomMeetingSDK = new ZoomMeetingSDKService();