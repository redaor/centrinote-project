-- =====================================================
-- CENTRINOTE AUTOMATION SYSTEM V2 - COMPLETE SCHEMA
-- =====================================================

-- Drop existing automation tables if they exist
DROP TABLE IF EXISTS automation_logs CASCADE;
DROP TABLE IF EXISTS automations CASCADE;
DROP TABLE IF EXISTS n8n_chat_automation CASCADE;

-- =====================================================
-- 1. AUTOMATION TEMPLATES TABLE
-- =====================================================
CREATE TABLE automation_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    icon VARCHAR(50) DEFAULT 'zap',
    color VARCHAR(20) DEFAULT 'blue',
    trigger_schema JSONB NOT NULL,
    action_schema JSONB NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. AUTOMATIONS TABLE (ENHANCED)
-- =====================================================
CREATE TABLE automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES automation_templates(id) ON DELETE SET NULL,
    
    -- Basic Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    
    -- Configuration
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}',
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    
    -- Advanced Settings
    conditions JSONB DEFAULT '[]', -- Array of condition objects
    schedule_config JSONB DEFAULT '{}', -- Cron, intervals, etc.
    retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay": 300}',
    
    -- Status & Metrics
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5, -- 1-10 scale
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
    CONSTRAINT valid_trigger_type CHECK (trigger_type IN (
        'note_created', 'note_updated', 'vocabulary_added',
        'session_completed', 'time_based', 'webhook',
        'email_received', 'keyword_detected'
    )),
    CONSTRAINT valid_action_type CHECK (action_type IN (
        'send_email', 'create_note', 'add_vocabulary',
        'schedule_session', 'send_notification', 'webhook_call',
        'create_reminder', 'update_tag', 'backup_data'
    ))
);

-- =====================================================
-- 3. AUTOMATION EXECUTIONS TABLE
-- =====================================================
CREATE TABLE automation_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Execution Details
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    trigger_data JSONB NOT NULL DEFAULT '{}',
    action_result JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Performance Metrics
    execution_time_ms INTEGER,
    memory_usage_mb DECIMAL(10,2),
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Retry Information
    retry_count INTEGER DEFAULT 0,
    is_retry BOOLEAN DEFAULT false,
    parent_execution_id UUID REFERENCES automation_executions(id),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout'))
);

-- =====================================================
-- 4. AUTOMATION ANALYTICS TABLE
-- =====================================================
CREATE TABLE automation_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Metrics by Day
    date DATE NOT NULL,
    executions_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_execution_time_ms DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, automation_id, date)
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Automations indexes
CREATE INDEX idx_automations_user_id ON automations(user_id);
CREATE INDEX idx_automations_active ON automations(is_active) WHERE is_active = true;
CREATE INDEX idx_automations_next_execution ON automations(next_execution_at) WHERE next_execution_at IS NOT NULL;
CREATE INDEX idx_automations_category ON automations(category);
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type);

-- Executions indexes
CREATE INDEX idx_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX idx_executions_status ON automation_executions(status);
CREATE INDEX idx_executions_started_at ON automation_executions(started_at);
CREATE INDEX idx_executions_parent ON automation_executions(parent_execution_id) WHERE parent_execution_id IS NOT NULL;

-- Analytics indexes
CREATE INDEX idx_analytics_user_date ON automation_analytics(user_id, date);
CREATE INDEX idx_analytics_automation_date ON automation_analytics(automation_id, date);

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;  
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_analytics ENABLE ROW LEVEL SECURITY;

-- Templates (read-only for all authenticated users)
CREATE POLICY "Templates are viewable by authenticated users" ON automation_templates
    FOR SELECT TO authenticated USING (true);

-- Automations (user-specific)
CREATE POLICY "Users can view own automations" ON automations
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automations" ON automations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automations" ON automations
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own automations" ON automations
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Executions (user-specific through automation)
CREATE POLICY "Users can view executions of own automations" ON automation_executions
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM automations 
            WHERE automations.id = automation_executions.automation_id 
            AND automations.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert executions" ON automation_executions
    FOR INSERT TO authenticated WITH CHECK (true);

-- Analytics (user-specific)
CREATE POLICY "Users can view own analytics" ON automation_analytics
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can manage analytics" ON automation_analytics
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 7. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automations_updated_at 
    BEFORE UPDATE ON automations 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Update execution statistics
CREATE OR REPLACE FUNCTION update_automation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        UPDATE automations 
        SET 
            execution_count = execution_count + 1,
            success_count = success_count + 1,
            last_executed_at = NEW.completed_at
        WHERE id = NEW.automation_id;
    ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        UPDATE automations 
        SET 
            execution_count = execution_count + 1,
            failure_count = failure_count + 1,
            last_executed_at = NEW.completed_at
        WHERE id = NEW.automation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_automation_stats_trigger
    AFTER UPDATE ON automation_executions
    FOR EACH ROW EXECUTE PROCEDURE update_automation_stats();

-- =====================================================
-- 8. SAMPLE AUTOMATION TEMPLATES
-- =====================================================

INSERT INTO automation_templates (name, description, category, icon, color, trigger_schema, action_schema, is_premium) VALUES
('Note Backup Reminder', 'Automatically remind to backup notes weekly', 'productivity', 'archive', 'blue', 
 '{"type": "time_based", "schedule": "weekly", "day": "sunday", "time": "10:00"}',
 '{"type": "send_notification", "title": "Backup Reminder", "message": "Don''t forget to backup your notes!"}', false),

('Vocabulary Review', 'Schedule vocabulary review when 10+ new words added', 'learning', 'book-open', 'green',
 '{"type": "vocabulary_added", "threshold": 10}',
 '{"type": "schedule_session", "session_type": "vocabulary", "duration": 30}', false),

('Study Session Completion', 'Send congratulations email after completing study session', 'motivation', 'trophy', 'yellow',
 '{"type": "session_completed", "session_types": ["vocabulary", "document"]}',
 '{"type": "send_email", "template": "congratulations", "subject": "Great job on completing your session!"}', false),

('Important Note Alert', 'Notify when note contains urgent keywords', 'alerts', 'alert-triangle', 'red',
 '{"type": "note_created", "keywords": ["urgent", "important", "deadline", "asap"]}',
 '{"type": "send_notification", "priority": "high", "title": "Important Note Created"}', true),

('Weekly Progress Report', 'Generate and email weekly learning progress', 'analytics', 'bar-chart-3', 'purple',
 '{"type": "time_based", "schedule": "weekly", "day": "friday", "time": "17:00"}',
 '{"type": "send_email", "template": "weekly_report", "include_stats": true}', true);

-- =====================================================
-- 9. SAMPLE DATA FOR TESTING
-- =====================================================

-- Note: Sample automations will be created when users first access the system
-- This keeps the schema clean while providing examples

COMMENT ON TABLE automation_templates IS 'Pre-built automation templates for common use cases';
COMMENT ON TABLE automations IS 'User-created automation rules with enhanced configuration';
COMMENT ON TABLE automation_executions IS 'Detailed execution logs with performance metrics';
COMMENT ON TABLE automation_analytics IS 'Daily aggregated metrics for automation performance';