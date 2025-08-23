export interface ZoomUser {
  id: string;
  email: string;
  display_name: string;
  account_id: string;
  account_type: 'basic' | 'licensed' | 'on_prem';
}

export interface UserZoomIntegration {
  id: string;
  user_id: string;
  zoom_user_id: string;
  zoom_email: string;
  zoom_display_name?: string;
  zoom_account_id?: string;
  zoom_account_type?: string;
  authentication_method: 'sdk' | 'oauth';
  is_active: boolean;
  last_authenticated_at: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  zoom_meeting_id: string;
  zoom_user_id: string;
  title: string;
  description?: string;
  start_time: string;
  duration: number;
  timezone: string;
  meeting_url: string;
  join_url: string;
  password?: string;
  status: 'scheduled' | 'started' | 'ended' | 'cancelled';
  has_recording: boolean;
  recording_processed: boolean;
  summary_generated: boolean;
  emails_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  email: string;
  display_name: string;
  is_host: boolean;
  is_co_host: boolean;
  summary_email_sent: boolean;
  created_at: string;
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  summary_text: string;
  key_points: string[];
  action_items: ActionItem[];
  created_at: string;
}

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

export interface ZoomAuthResult {
  success: boolean;
  user?: any;
  integration?: UserZoomIntegration;
  error?: string;
}

export interface MeetingFormData {
  title: string;
  description: string;
  start_time: string;
  duration: number;
  timezone: string;
  password: string;
  participants: string[];
  host_video: boolean;
  participant_video: boolean;
  waiting_room: boolean;
}