// 🎯 Types TypeScript pour Google Meet
// Définitions complètes pour l'intégration Google Calendar/Meet
// ==============================================================

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  verified_email: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: GoogleAttendee[];
  conferenceData?: GoogleConferenceData;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
  created: string;
  updated: string;
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
  };
}

export interface GoogleAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
}

export interface GoogleConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: {
      type: 'hangoutsMeet';
    };
  };
  entryPoints: GoogleConferenceEntryPoint[];
  conferenceSolution: {
    key: {
      type: 'hangoutsMeet';
    };
    name: 'Google Meet';
    iconUri: string;
  };
  conferenceId: string;
}

export interface GoogleConferenceEntryPoint {
  entryPointType: 'video' | 'phone' | 'sip' | 'more';
  uri: string;
  label?: string;
  pin?: string;
  accessCode?: string;
  meetingCode?: string;
  passcode?: string;
  password?: string;
}

export interface GoogleMeetSession {
  user: GoogleUser;
  session: any;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}

export interface GoogleMeetAuthResult {
  success: boolean;
  error?: string;
  session?: GoogleMeetSession;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  attendees?: string[]; // Array of email addresses
  timeZone?: string;
}

export interface GoogleMeetingResponse {
  success: boolean;
  meeting?: GoogleCalendarEvent;
  meetingUrl?: string;
  error?: string;
}

export interface GoogleAuthState {
  isConnected: boolean;
  isLoading: boolean;
  user: GoogleUser | null;
  error: string | null;
  session: GoogleMeetSession | null;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  user?: GoogleUser;
  lastSync?: string;
  error?: string;
}

// Types pour les événements n8n
export interface GoogleMeetN8nEvent {
  event: 'google_meet_oauth_connected' | 'meeting_created' | 'meeting_updated' | 'meeting_deleted';
  data: {
    tokens?: GoogleTokens;
    meeting?: GoogleCalendarEvent;
    user?: GoogleUser;
  };
  timestamp: string;
  source: 'centrinote_google_meet';
}

// Types pour les réponses API Google
export interface GoogleCalendarListResponse {
  kind: 'calendar#events';
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  defaultReminders: Array<{
    method: string;
    minutes: number;
  }>;
  nextPageToken?: string;
  items: GoogleCalendarEvent[];
}

export interface GoogleCalendarResponse {
  kind: 'calendar#event';
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: GoogleAttendee[];
  conferenceData?: GoogleConferenceData;
}

// Configuration Google Meet
export interface GoogleMeetConfig {
  clientId: string;
  clientSecret?: string; // Côté serveur uniquement
  scopes: string[];
  redirectUri: string;
  n8nWebhookUrl?: string;
}

// Erreurs spécifiques Google Meet
export enum GoogleMeetErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  CALENDAR_NOT_FOUND = 'CALENDAR_NOT_FOUND',
  MEETING_NOT_FOUND = 'MEETING_NOT_FOUND',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class GoogleMeetError extends Error {
  constructor(
    public code: GoogleMeetErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GoogleMeetError';
  }
}

// États UI pour les composants
export type GoogleMeetConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type GoogleMeetLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface GoogleMeetUIState {
  connectionState: GoogleMeetConnectionState;
  loadingState: GoogleMeetLoadingState;
  error?: string;
  user?: GoogleUser;
  meetings?: GoogleCalendarEvent[];
}