// 🎬 Types pour le système d'enregistrement et rapports
// Interfaces TypeScript pour Jitsi Recording + n8n Integration
// ==============================================================

export interface RecordingConsent {
  participantId: string;
  participantName: string;
  hasConsented: boolean;
  timestamp: Date;
  ipAddress?: string;
  consentMethod: 'explicit' | 'implicit';
}

export interface RecordingConfig {
  autoStart: boolean;
  requireConsent: boolean;
  saveToCloud: boolean;
  generateReport: boolean;
  n8nWebhookUrl: string;
  storageProvider: 'drive' | 's3' | 'local' | 'jitsi';
  maxDuration: number; // en minutes
  quality: 'low' | 'medium' | 'high';
  includeScreenShare: boolean;
  includeChat: boolean;
  notifyParticipants: boolean;
  retentionPeriod: number; // en jours
}

export interface N8nWebhookPayload {
  event: 'recording_started' | 'recording_stopped' | 'participant_joined' | 'participant_left' | 'consent_changed';
  roomName: string;
  roomId: string;
  timestamp: Date;
  participants: Array<{
    id: string;
    name: string;
    email?: string;
    joinedAt: Date;
    hasConsented?: boolean;
  }>;
  recordingUrl?: string;
  recordingId?: string;
  metadata: {
    documentIds?: string[];
    sessionType: 'document' | 'study' | 'discussion' | 'video';
    sessionTitle?: string;
    duration?: number; // en secondes
    organizerId: string;
    organizerName: string;
    e2eeEnabled: boolean;
    chatHistory?: Array<{
      timestamp: Date;
      author: string;
      message: string;
    }>;
  };
  recordingConfig: RecordingConfig;
}

export interface RecordingStatus {
  isRecording: boolean;
  recordingId?: string;
  startTime?: Date;
  duration?: number; // en secondes
  fileSize?: number; // en bytes
  recordingUrl?: string;
  status: 'idle' | 'starting' | 'recording' | 'stopping' | 'processing' | 'completed' | 'error';
  error?: string;
  participantConsents: RecordingConsent[];
  allParticipantsConsented: boolean;
  consentPending: string[]; // IDs des participants sans consentement
}

export interface GeneratedReport {
  id: string;
  sessionId: string;
  roomName: string;
  title: string;
  generatedAt: Date;
  status: 'generating' | 'completed' | 'error';
  type: 'transcript' | 'summary' | 'action_items' | 'full_report';
  fileUrl?: string;
  downloadUrl?: string;
  metadata: {
    duration: number;
    participantCount: number;
    wordCount?: number;
    keyTopics?: string[];
    actionItems?: Array<{
      task: string;
      assignee?: string;
      priority: 'low' | 'medium' | 'high';
      dueDate?: Date;
    }>;
    summary?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
  error?: string;
}

export interface RecordingEvent {
  type: 'recording_started' | 'recording_stopped' | 'consent_required' | 'consent_granted' | 'consent_denied' | 'report_generated' | 'error_occurred';
  timestamp: Date;
  roomName: string;
  participantId?: string;
  participantName?: string;
  data?: any;
  message?: string;
}

export interface ConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  participantName: string;
  sessionTitle: string;
  organizerName: string;
  recordingConfig: RecordingConfig;
  isLoading?: boolean;
}

export interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  recordingStatus: RecordingStatus;
  canStartRecording: boolean;
  isLoading: boolean;
  disabled?: boolean;
}

// Types manquants pour le composant Collaboration
export interface RecordingMetrics {
  totalRecordings: number;
  totalDuration: number; // en minutes
  averageParticipants: number;
  reportGenerationRate: number; // pourcentage
  storageUsed: number; // en MB
  costEstimate: number; // en euros
  topTopics: string[];
  monthlyStats: Array<{
    month: string;
    recordings: number;
    duration: number;
  }>;
}

export interface N8nWebhookResponse {
  success: boolean;
  workflowId?: string;
  executionId?: string;
  error?: string;
  timestamp: Date;
}

export interface ReportsListProps {
  reports: GeneratedReport[];
  isLoading: boolean;
  onRefresh: () => void;
  onDownload: (report: GeneratedReport) => void;
  onDelete?: (reportId: string) => void;
}

export interface RecordingSettingsProps {
  config: RecordingConfig;
  onChange: (config: RecordingConfig) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
  canModify?: boolean;
}

export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  workflowId?: string;
  executionId?: string;
  error?: string;
  timestamp: Date;
}

export interface CloudStorageConfig {
  provider: 'drive' | 's3' | 'local';
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucket?: string;
    driveFolder?: string;
  };
  basePath?: string;
  maxFileSize?: number; // en MB
  retention?: number; // en jours
}

export interface RecordingPermissions {
  canStartRecording: boolean;
  canStopRecording: boolean;
  canAccessReports: boolean;
  canDownloadReports: boolean;
  canDeleteReports: boolean;
  canModifySettings: boolean;
  canViewConsents: boolean;
  role: 'organizer' | 'moderator' | 'participant';
}

// Énumérations pour plus de type safety
export enum RecordingEventType {
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped',
  CONSENT_REQUIRED = 'consent_required',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_DENIED = 'consent_denied',
  REPORT_GENERATED = 'report_generated',
  ERROR_OCCURRED = 'error_occurred'
}

export enum ReportType {
  TRANSCRIPT = 'transcript',
  SUMMARY = 'summary',
  ACTION_ITEMS = 'action_items',
  FULL_REPORT = 'full_report'
}

export enum StorageProvider {
  GOOGLE_DRIVE = 'drive',
  AMAZON_S3 = 's3',
  LOCAL = 'local'
}

export enum RecordingStatusEnum {
  IDLE = 'idle',
  STARTING = 'starting',
  RECORDING = 'recording',
  STOPPING = 'stopping',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}