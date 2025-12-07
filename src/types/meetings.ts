// Types for meeting participants and creation payload

export type MeetingParticipant = {
  id: string;  // 🆔 Stable UUID for React keys
  name: string;
  email: string;
  role?: 'organizer' | 'guest';
};

export type CreateMeetingPayload = {
  title: string;
  description?: string;
  scheduled_at?: string;      // ISO date string
  duration_minutes?: number;  // default 60
  participants: MeetingParticipant[];
  created_by: string;         // userId
  enable_ai_summary?: boolean; // Activer l'enregistrement et le résumé automatique
};

export type Meeting = {
  id: string;
  title: string;
  description?: string;
  room_name: string;
  room_url: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  participants: MeetingParticipant[];
  created_by: string;
  created_at: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  duration_minutes: number;
  recording_url?: string;
  transcript?: string;
  ai_summary?: any;
};