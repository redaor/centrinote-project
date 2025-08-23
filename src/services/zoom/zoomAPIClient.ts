/**
 * Zoom API Client - Direct Integration
 * 
 * This provides direct Zoom API integration when Edge Functions aren't available.
 * Uses client-side JWT generation for authentication.
 */

import { generateZoomJWT } from '../../utils/zoomJWT';

export interface ZoomMeetingConfig {
  topic: string;
  type?: number; // 1=instant, 2=scheduled, 3=recurring, 8=recurring with fixed time
  start_time?: string; // ISO string
  duration?: number; // minutes
  password?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    cn_meeting?: boolean;
    in_meeting?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    watermark?: boolean;
    use_pmi?: boolean;
    approval_type?: number; // 0=auto approve, 1=manual approve, 2=no registration
    audio?: string; // both, telephony, voip
    auto_recording?: string; // local, cloud, none
    waiting_room?: boolean;
  };
}

export interface ZoomMeetingResponse {
  id: number;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  created_at: string;
  join_url: string;
  password?: string;
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  settings: {
    host_video: boolean;
    participant_video: boolean;
    cn_meeting: boolean;
    in_meeting: boolean;
    join_before_host: boolean;
    mute_upon_entry: boolean;
    watermark: boolean;
    use_pmi: boolean;
    approval_type: number;
    audio: string;
    auto_recording: string;
    waiting_room: boolean;
  };
  start_url: string;
  pre_schedule: boolean;
}

export class ZoomAPIClient {
  private sdkKey: string;
  private sdkSecret: string;
  private baseURL = 'https://api.zoom.us/v2';

  constructor(sdkKey: string, sdkSecret: string) {
    this.sdkKey = sdkKey;
    this.sdkSecret = sdkSecret;
  }

  /**
   * Generate JWT token for API authentication
   */
  private generateJWT(): string {
    try {
      return generateZoomJWT(this.sdkKey, this.sdkSecret);
    } catch (error) {
      throw new Error(`Failed to generate JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make API request to Zoom
   */
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: any): Promise<any> {
    try {
      const jwt = this.generateJWT();
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      };

      const config: RequestInit = {
        method,
        headers,
        mode: 'cors' // Handle CORS
      };

      if (body && (method === 'POST' || method === 'PATCH')) {
        config.body = JSON.stringify(body);
      }

      console.log(`🌐 Making Zoom API request: ${method} ${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Zoom API error:', response.status, errorText);
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Zoom API authentication failed. Check SDK credentials.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Zoom API error ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Zoom API request successful');
      return data;

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('CORS')) {
        throw new Error('CORS error: Zoom API calls must be made server-side. Please use Edge Functions or a proxy server.');
      }
      throw error;
    }
  }

  /**
   * Create a meeting via Zoom API
   * 
   * NOTE: This will fail due to CORS in browser - use for server-side only
   * For client-side, use the mock meeting generation in zoomMeetingSDKService
   */
  async createMeeting(userId: string, config: ZoomMeetingConfig): Promise<ZoomMeetingResponse> {
    try {
      console.log('📅 Creating meeting via Zoom API:', config.topic);

      const meetingData = {
        topic: config.topic,
        type: config.type || 2, // Default to scheduled
        start_time: config.start_time,
        duration: config.duration || 30,
        password: config.password,
        agenda: config.agenda || '',
        settings: {
          host_video: config.settings?.host_video ?? true,
          participant_video: config.settings?.participant_video ?? true,
          cn_meeting: config.settings?.cn_meeting ?? false,
          in_meeting: config.settings?.in_meeting ?? false,
          join_before_host: config.settings?.join_before_host ?? false,
          mute_upon_entry: config.settings?.mute_upon_entry ?? false,
          watermark: config.settings?.watermark ?? false,
          use_pmi: config.settings?.use_pmi ?? false,
          approval_type: config.settings?.approval_type ?? 0,
          audio: config.settings?.audio || 'both',
          auto_recording: config.settings?.auto_recording || 'none',
          waiting_room: config.settings?.waiting_room ?? true
        }
      };

      const meeting = await this.makeRequest(`/users/${userId}/meetings`, 'POST', meetingData);
      
      console.log('✅ Meeting created via Zoom API:', meeting.id);
      return meeting;

    } catch (error) {
      console.error('❌ Failed to create meeting via Zoom API:', error);
      throw error;
    }
  }

  /**
   * Get user's meetings
   */
  async getUserMeetings(userId: string, type: 'scheduled' | 'live' | 'upcoming' = 'scheduled'): Promise<any> {
    try {
      return await this.makeRequest(`/users/${userId}/meetings?type=${type}`);
    } catch (error) {
      console.error('❌ Failed to get user meetings:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await this.makeRequest(`/meetings/${meetingId}`, 'DELETE');
      console.log('✅ Meeting deleted:', meetingId);
    } catch (error) {
      console.error('❌ Failed to delete meeting:', error);
      throw error;
    }
  }

  /**
   * Update a meeting
   */
  async updateMeeting(meetingId: string, updates: Partial<ZoomMeetingConfig>): Promise<void> {
    try {
      await this.makeRequest(`/meetings/${meetingId}`, 'PATCH', updates);
      console.log('✅ Meeting updated:', meetingId);
    } catch (error) {
      console.error('❌ Failed to update meeting:', error);
      throw error;
    }
  }
}

// Export a configured instance
export function createZoomAPIClient(): ZoomAPIClient | null {
  const sdkKey = import.meta.env.VITE_ZOOM_SDK_KEY;
  const sdkSecret = import.meta.env.VITE_ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    console.warn('⚠️ Zoom SDK credentials not configured');
    return null;
  }

  return new ZoomAPIClient(sdkKey, sdkSecret);
}