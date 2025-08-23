// =====================================================
// AUTOMATION SYSTEM TYPES - TYPESCRIPT DEFINITIONS
// =====================================================

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  trigger_schema: TriggerSchema;
  action_schema: ActionSchema;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  user_id: string;
  template_id?: string;
  name: string;
  description?: string;
  category: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  action_type: ActionType;
  action_config: ActionConfig;
  conditions: AutomationCondition[];
  schedule_config: ScheduleConfig;
  retry_config: RetryConfig;
  is_active: boolean;
  priority: number;
  execution_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  next_execution_at?: string;
}

export interface AutomationExecution {
  id: string;
  automation_id: string;
  status: ExecutionStatus;
  trigger_data: Record<string, any>;
  action_result?: Record<string, any>;
  error_message?: string;
  execution_time_ms?: number;
  memory_usage_mb?: number;
  started_at: string;
  completed_at?: string;
  retry_count: number;
  is_retry: boolean;
  parent_execution_id?: string;
}

export interface AutomationAnalytics {
  id: string;
  user_id: string;
  automation_id: string;
  date: string;
  executions_count: number;
  success_count: number;
  failure_count: number;
  avg_execution_time_ms: number;
  created_at: string;
}

// =====================================================
// ENUMS AND UNION TYPES
// =====================================================

export type TriggerType = 
  | 'note_created'
  | 'note_updated' 
  | 'vocabulary_added'
  | 'session_completed'
  | 'time_based'
  | 'webhook'
  | 'email_received'
  | 'keyword_detected';

export type ActionType =
  | 'send_email'
  | 'create_note'
  | 'add_vocabulary'
  | 'schedule_session'
  | 'send_notification'
  | 'webhook_call'
  | 'create_reminder'
  | 'update_tag'
  | 'backup_data';

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type AutomationCategory = 
  | 'productivity'
  | 'learning'
  | 'motivation'
  | 'alerts'
  | 'analytics'
  | 'backup'
  | 'general';

// =====================================================
// CONFIGURATION INTERFACES
// =====================================================

export interface TriggerSchema {
  type: TriggerType;
  [key: string]: any;
}

export interface ActionSchema {
  type: ActionType;
  [key: string]: any;
}

export interface TriggerConfig {
  [key: string]: any;
}

export interface ActionConfig {
  [key: string]: any;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface ScheduleConfig {
  type?: 'once' | 'recurring';
  cron_expression?: string;
  interval_minutes?: number;
  start_date?: string;
  end_date?: string;
  timezone?: string;
}

export interface RetryConfig {
  max_retries: number;
  retry_delay: number; // seconds
  backoff_multiplier?: number;
}

// =====================================================
// UI AND DASHBOARD TYPES
// =====================================================

export interface AutomationStats {
  total_automations: number;
  active_automations: number;
  total_executions: number;
  success_rate: number;
  avg_execution_time: number;
  executions_today: number;
  executions_this_week: number;
  most_used_trigger: TriggerType;
  most_used_action: ActionType;
}

export interface DashboardCard {
  title: string;
  value: string | number;
  change?: number;
  change_type?: 'increase' | 'decrease';
  icon: string;
  color: string;
}

export interface ExecutionLogEntry {
  id: string;
  automation_name: string;
  status: ExecutionStatus;
  started_at: string;
  execution_time?: number;
  error_message?: string;
}

export interface AutomationBuilderNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  data: {
    label: string;
    config: any;
    icon?: string;
    color?: string;
  };
  position: { x: number; y: number };
}

export interface AutomationBuilderEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface TemplateFilter {
  category?: string;
  is_premium?: boolean;
  search?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface AutomationResponse {
  data: Automation[];
  count: number;
  error?: string;
}

export interface ExecutionResponse {
  data: AutomationExecution[];
  count: number;
  error?: string;
}

export interface AnalyticsResponse {
  data: AutomationAnalytics[];
  error?: string;
}

export interface StatsResponse {
  data: AutomationStats;
  error?: string;
}

// =====================================================
// FORM AND VALIDATION TYPES
// =====================================================

export interface CreateAutomationRequest {
  name: string;
  description?: string;
  category: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  action_type: ActionType;
  action_config: ActionConfig;
  conditions?: AutomationCondition[];
  schedule_config?: ScheduleConfig;
  is_active?: boolean;
  priority?: number;
}

export interface UpdateAutomationRequest extends Partial<CreateAutomationRequest> {
  id: string;
}

export interface AutomationFormData {
  name: string;
  description: string;
  category: AutomationCategory;
  trigger: {
    type: TriggerType;
    config: Record<string, any>;
  };
  action: {
    type: ActionType;
    config: Record<string, any>;
  };
  conditions: AutomationCondition[];
  schedule: ScheduleConfig;
  settings: {
    is_active: boolean;
    priority: number;
    retry_config: RetryConfig;
  };
}

// =====================================================
// DRAG AND DROP TYPES
// =====================================================

export interface DraggableItem {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  config_schema: Record<string, any>;
}

export interface DropZoneData {
  type: 'trigger' | 'action' | 'condition';
  accepts: string[];
  maxItems?: number;
}

// =====================================================
// WEBHOOK AND EXTERNAL INTEGRATION TYPES
// =====================================================

export interface WebhookPayload {
  automation_id: string;
  trigger_data: Record<string, any>;
  timestamp: string;
  user_id: string;
}

export interface WebhookResponse {
  success: boolean;
  execution_id?: string;
  error?: string;
}

export interface N8NIntegration {
  webhook_url: string;
  authentication?: {
    type: 'bearer' | 'api_key';
    token: string;
  };
  timeout_ms: number;
}

// =====================================================
// TESTING AND MOCK TYPES
// =====================================================

export interface MockTriggerData {
  type: TriggerType;
  sample_data: Record<string, any>;
}

export interface TestExecutionResult {
  success: boolean;
  execution_time_ms: number;
  result_data?: any;
  error?: string;
  logs: string[];
}