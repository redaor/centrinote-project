// 🎯 Types TypeScript pour l'intégration Zoom
// Définitions complètes pour l'authentification et les données Zoom
// ================================================================

export interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  type: number;
  account_id: string;
  timezone: string;
  verified: boolean;
  created_at: string;
  last_login_time: string;
}

export interface ZoomMeeting {
  id: string;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  created_at: string;
  start_url: string;
  join_url: string;
  password?: string;
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  settings: ZoomMeetingSettings;
  recurrence?: ZoomMeetingRecurrence;
}

export interface ZoomMeetingSettings {
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
  enforce_login: boolean;
  enforce_login_domains: string;
  alternative_hosts: string;
  close_registration: boolean;
  show_share_button: boolean;
  allow_multiple_devices: boolean;
  registrants_confirmation_email: boolean;
  waiting_room: boolean;
  request_permission_to_unmute_participants: boolean;
  global_dial_in_countries: string[];
  global_dial_in_numbers: ZoomDialInNumber[];
  contact_name: string;
  contact_email: string;
  registrants_email_notification: boolean;
  meeting_authentication: boolean;
  authentication_option: string;
  authentication_domains: string;
}

export interface ZoomMeetingRecurrence {
  type: number;
  repeat_interval: number;
  weekly_days: string;
  monthly_day: number;
  monthly_week: number;
  monthly_week_day: number;
  end_times: number;
  end_date_time: string;
}

export interface ZoomDialInNumber {
  country: string;
  country_name: string;
  city: string;
  number: string;
  type: string;
}

export interface ZoomWebhookEvent {
  event: string;
  payload: {
    account_id: string;
    object: any;
  };
  event_ts: number;
}

export interface ZoomMeetingCreateRequest {
  topic: string;
  type?: number; // 1 = Instant, 2 = Scheduled, 3 = Recurring no fixed time, 8 = Recurring fixed time
  start_time?: string;
  duration?: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: Partial<ZoomMeetingSettings>;
  recurrence?: Partial<ZoomMeetingRecurrence>;
}

export interface ZoomAuthState {
  isConnected: boolean;
  isLoading: boolean;
  user: ZoomUser | null;
  error: string | null;
  session: any | null;
}

export interface ZoomConnectionStatus {
  connected: boolean;
  user?: ZoomUser;
  lastSync?: string;
  error?: string;
}

// Types pour les événements Zoom webhook
export type ZoomEventType = 
  | 'meeting.started'
  | 'meeting.ended'
  | 'meeting.participant_joined'
  | 'meeting.participant_left'
  | 'recording.completed'
  | 'recording.transcript_completed';

export interface ZoomEventPayload {
  event: ZoomEventType;
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      timezone: string;
      duration: number;
      participant?: {
        user_id: string;
        user_name: string;
        email: string;
        join_time: string;
        leave_time?: string;
      };
      recording_files?: ZoomRecordingFile[];
    };
  };
  event_ts: number;
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

// Types pour l'intégration n8n
export interface N8nZoomWebhookPayload {
  event: string;
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  };
  user_id?: string;
  meeting_data?: any;
  timestamp: string;
  source: string;
}

export interface ZoomApiError {
  code: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}