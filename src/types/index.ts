export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'basic' | 'premium';
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'pdf' | 'word' | 'note' | 'image' | 'audio';
  size: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  folder?: string;
  isShared: boolean;
  collaborators: string[];
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content?: string | null;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  has_attachment?: boolean | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
  updated_at?: string;
}

export interface DocumentNote {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabularyEntry {
  id: string;
  word: string;
  userId?: string;
  definition: string;
  pronunciation?: string;
  category: string;
  examples: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  mastery: number; // 0-100
  lastReviewed?: Date;
  timesReviewed: number;
}

export interface StudySession {
  id: string;
  title: string;
  type: 'vocabulary' | 'document' | 'mixed';
  scheduledFor: Date;
  duration: number; // minutes
  completed: boolean;
  progress: number; // 0-100
  items: string[]; // IDs of vocabulary or documents
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
}

export interface Collaboration {
  id: string;
  documentId: string;
  participants: User[];
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
}

// Legacy automation interface - use types/automation.ts for new implementations
export interface LegacyAutomation {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  executed_at: string;
  status: 'success' | 'error' | 'skipped';
  trigger_data: Record<string, any>;
  action_result: Record<string, any>;
  error_message: string | null;
}

// Re-export automation types for backward compatibility
export type { 
  Automation,
  AutomationTemplate,
  AutomationExecution,
  AutomationStats,
  TriggerType,
  ActionType,
  ExecutionStatus,
  AutomationCategory,
  AutomationFormData,
  CreateAutomationRequest,
  UpdateAutomationRequest
} from './automation';