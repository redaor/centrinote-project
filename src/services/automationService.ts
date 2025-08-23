import { supabase } from '../lib/supabase';
import type { 
  Automation, 
  AutomationTemplate, 
  AutomationExecution, 
  AutomationStats,
  CreateAutomationRequest,
  UpdateAutomationRequest,
  AutomationFormData,
  WebhookPayload 
} from '../types/automation';

class AutomationService {
  /**
   * Get all automation templates
   */
  async getTemplates(): Promise<AutomationTemplate[]> {
    try {
      console.log('🔄 Loading automation templates');
      
      const { data, error } = await supabase
        .from('automation_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Error loading templates:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data.length} templates`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load templates:', error);
      throw error;
    }
  }

  /**
   * Get user's automations
   */
  async getAutomations(userId: string): Promise<Automation[]> {
    try {
      console.log('🔄 Loading automations for user:', userId);
      
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading automations:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data.length} automations`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load automations:', error);
      throw error;
    }
  }

  /**
   * Create new automation
   */
  async createAutomation(userId: string, automationData: AutomationFormData): Promise<Automation> {
    try {
      console.log('🔄 Creating automation:', automationData.name);
      
      const automationRequest: CreateAutomationRequest = {
        name: automationData.name,
        description: automationData.description,
        category: automationData.category,
        trigger_type: automationData.trigger.type,
        trigger_config: automationData.trigger.config,
        action_type: automationData.action.type,
        action_config: automationData.action.config,
        conditions: automationData.conditions,
        schedule_config: automationData.schedule,
        is_active: automationData.settings.is_active,
        priority: automationData.settings.priority
      };

      const { data, error } = await supabase
        .from('automations')
        .insert([{
          user_id: userId,
          ...automationRequest
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating automation:', error);
        throw error;
      }
      
      console.log('✅ Automation created:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create automation:', error);
      throw error;
    }
  }

  /**
   * Update automation
   */
  async updateAutomation(automationData: UpdateAutomationRequest): Promise<Automation> {
    try {
      console.log('🔄 Updating automation:', automationData.id);
      
      const { id, ...updateData } = automationData;
      
      const { data, error } = await supabase
        .from('automations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating automation:', error);
        throw error;
      }
      
      console.log('✅ Automation updated:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to update automation:', error);
      throw error;
    }
  }

  /**
   * Delete automation
   */
  async deleteAutomation(automationId: string): Promise<void> {
    try {
      console.log('🔄 Deleting automation:', automationId);
      
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId);
      
      if (error) {
        console.error('❌ Error deleting automation:', error);
        throw error;
      }
      
      console.log('✅ Automation deleted:', automationId);
    } catch (error) {
      console.error('❌ Failed to delete automation:', error);
      throw error;
    }
  }

  /**
   * Toggle automation active status
   */
  async toggleAutomation(automationId: string, isActive: boolean): Promise<void> {
    try {
      console.log(`🔄 ${isActive ? 'Activating' : 'Deactivating'} automation:`, automationId);
      
      const { error } = await supabase
        .from('automations')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', automationId);
      
      if (error) {
        console.error('❌ Error toggling automation:', error);
        throw error;
      }
      
      console.log(`✅ Automation ${isActive ? 'activated' : 'deactivated'}:`, automationId);
    } catch (error) {
      console.error('❌ Failed to toggle automation:', error);
      throw error;
    }
  }

  /**
   * Get automation execution history
   */
  async getExecutions(automationId?: string, limit: number = 50): Promise<AutomationExecution[]> {
    try {
      console.log('🔄 Loading execution history');
      
      let query = supabase
        .from('automation_executions')
        .select(`
          *,
          automations!inner(name, user_id)
        `)
        .order('started_at', { ascending: false })
        .limit(limit);
      
      if (automationId) {
        query = query.eq('automation_id', automationId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error loading executions:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data.length} executions`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load executions:', error);
      throw error;
    }
  }

  /**
   * Get automation statistics
   */
  async getStats(userId: string): Promise<AutomationStats> {
    try {
      console.log('🔄 Loading automation statistics for user:', userId);
      
      // Get basic automation counts
      const { data: automations, error: automationsError } = await supabase
        .from('automations')
        .select('id, is_active, execution_count, success_count, failure_count, trigger_type, action_type')
        .eq('user_id', userId);
      
      if (automationsError) {
        throw automationsError;
      }

      // Get recent execution counts
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: recentExecutions, error: executionsError } = await supabase
        .from('automation_executions')
        .select('started_at, status, execution_time_ms, automation_id')
        .gte('started_at', weekAgo.toISOString())
        .in('automation_id', automations.map(a => a.id));
      
      if (executionsError) {
        throw executionsError;
      }

      // Calculate statistics
      const totalAutomations = automations.length;
      const activeAutomations = automations.filter(a => a.is_active).length;
      const totalExecutions = automations.reduce((sum, a) => sum + a.execution_count, 0);
      const totalSuccesses = automations.reduce((sum, a) => sum + a.success_count, 0);
      const successRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;
      
      const todayExecutions = recentExecutions.filter(e => 
        new Date(e.started_at).toDateString() === today.toDateString()
      ).length;
      
      const weekExecutions = recentExecutions.length;
      
      const executionTimes = recentExecutions
        .filter(e => e.execution_time_ms)
        .map(e => e.execution_time_ms!);
      const avgExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
        : 0;

      // Find most used trigger and action types
      const triggerCounts = automations.reduce((acc, a) => {
        acc[a.trigger_type] = (acc[a.trigger_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const actionCounts = automations.reduce((acc, a) => {
        acc[a.action_type] = (acc[a.action_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedTrigger = Object.entries(triggerCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as any || 'note_created';
      
      const mostUsedAction = Object.entries(actionCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as any || 'send_notification';

      const stats: AutomationStats = {
        total_automations: totalAutomations,
        active_automations: activeAutomations,
        total_executions: totalExecutions,
        success_rate: Math.round(successRate * 10) / 10,
        avg_execution_time: Math.round(avgExecutionTime),
        executions_today: todayExecutions,
        executions_this_week: weekExecutions,
        most_used_trigger: mostUsedTrigger,
        most_used_action: mostUsedAction
      };
      
      console.log('✅ Statistics calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to load statistics:', error);
      throw error;
    }
  }

  /**
   * Execute automation manually (for testing)
   */
  async executeAutomation(automationId: string, testData?: Record<string, any>): Promise<AutomationExecution> {
    try {
      console.log('🔄 Manually executing automation:', automationId);
      
      // Get automation details
      const { data: automation, error: automationError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();
      
      if (automationError) {
        throw automationError;
      }

      // Create execution record
      const executionData = {
        automation_id: automationId,
        status: 'running' as const,
        trigger_data: testData || { manual_test: true },
        started_at: new Date().toISOString()
      };

      const { data: execution, error: executionError } = await supabase
        .from('automation_executions')
        .insert([executionData])
        .select()
        .single();
      
      if (executionError) {
        throw executionError;
      }

      // Simulate execution logic (replace with real execution engine)
      setTimeout(async () => {
        const success = Math.random() > 0.1; // 90% success rate for testing
        const executionTime = Math.floor(Math.random() * 2000) + 500; // 500-2500ms
        
        await supabase
          .from('automation_executions')
          .update({
            status: success ? 'success' : 'failed',
            completed_at: new Date().toISOString(),
            execution_time_ms: executionTime,
            action_result: success ? { message: 'Test execution completed' } : {},
            error_message: success ? null : 'Simulated test failure'
          })
          .eq('id', execution.id);
      }, 1000);
      
      console.log('✅ Automation execution started:', execution.id);
      return execution;
    } catch (error) {
      console.error('❌ Failed to execute automation:', error);
      throw error;
    }
  }

  /**
   * Process webhook trigger
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      console.log('🔄 Processing webhook for automation:', payload.automation_id);
      
      // Get automation details
      const { data: automation, error: automationError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', payload.automation_id)
        .eq('is_active', true)
        .single();
      
      if (automationError) {
        throw automationError;
      }

      // Create execution record
      const executionData = {
        automation_id: payload.automation_id,
        status: 'pending' as const,
        trigger_data: payload.trigger_data,
        started_at: new Date().toISOString()
      };

      const { data: execution, error: executionError } = await supabase
        .from('automation_executions')
        .insert([executionData])
        .select()
        .single();
      
      if (executionError) {
        throw executionError;
      }

      // TODO: Add to execution queue for processing
      console.log('✅ Webhook processed, execution queued:', execution.id);
    } catch (error) {
      console.error('❌ Failed to process webhook:', error);
      throw error;
    }
  }

  /**
   * Get automation by ID
   */
  async getAutomation(automationId: string): Promise<Automation> {
    try {
      console.log('🔄 Loading automation:', automationId);
      
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();
      
      if (error) {
        console.error('❌ Error loading automation:', error);
        throw error;
      }
      
      console.log('✅ Automation loaded:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to load automation:', error);
      throw error;
    }
  }

  /**
   * Create automation from template
   */
  async createFromTemplate(userId: string, templateId: string, customName?: string): Promise<Automation> {
    try {
      console.log('🔄 Creating automation from template:', templateId);
      
      const { data: template, error: templateError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) {
        throw templateError;
      }

      const automationData: CreateAutomationRequest = {
        name: customName || template.name,
        description: template.description,
        category: template.category,
        trigger_type: template.trigger_schema.type,
        trigger_config: template.trigger_schema,
        action_type: template.action_schema.type,
        action_config: template.action_schema,
        is_active: false, // Start inactive for user to configure
        priority: 5
      };

      const { data, error } = await supabase
        .from('automations')
        .insert([{
          user_id: userId,
          template_id: templateId,
          ...automationData
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating automation from template:', error);
        throw error;
      }
      
      console.log('✅ Automation created from template:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create automation from template:', error);
      throw error;
    }
  }

  /**
   * Duplicate automation
   */
  async duplicateAutomation(automationId: string): Promise<Automation> {
    try {
      console.log('🔄 Duplicating automation:', automationId);
      
      const { data: original, error: originalError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();
      
      if (originalError) {
        throw originalError;
      }

      const { id, created_at, updated_at, execution_count, success_count, failure_count, last_executed_at, next_execution_at, ...duplicateData } = original;
      
      const { data, error } = await supabase
        .from('automations')
        .insert([{
          ...duplicateData,
          name: `${original.name} (Copy)`,
          is_active: false, // Start inactive
          execution_count: 0,
          success_count: 0,
          failure_count: 0
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error duplicating automation:', error);
        throw error;
      }
      
      console.log('✅ Automation duplicated:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to duplicate automation:', error);
      throw error;
    }
  }
}

export const automationService = new AutomationService();