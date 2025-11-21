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
   * ✅ OPTIMISÉ : Sélectionne uniquement les champs nécessaires pour améliorer les performances
   */
  async getAutomations(userId: string): Promise<Automation[]> {
    try {
      const startTime = performance.now();
      
      // ✅ OPTIMISATION : Sélectionner uniquement les champs nécessaires (évite de charger des données inutiles)
      const { data, error } = await supabase
        .from('automations')
        .select(`
          id,
          name,
          user_id,
          is_active,
          trigger_config,
          schedule_config,
          user_local_time,
          user_timezone,
          next_execution_at,
          last_executed_at,
          execution_count,
          success_count,
          failure_count,
          updated_at,
          created_at
        `)
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading automations:', error);
        throw error;
      }
      
      const loadTime = performance.now() - startTime;
      if (import.meta.env.DEV) {
        console.log(`✅ Loaded ${data.length} automations in ${loadTime.toFixed(0)}ms`);
      }
      
      return data || [];
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
   * Now uses the automation-runner Edge Function
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

      // Call automation-runner Edge Function
      const { data, error } = await supabase.functions.invoke('automation-runner', {
        body: {
          automation_id: automationId,
          trigger_data: testData || { manual_test: true, timestamp: new Date().toISOString() },
          test_mode: true
        }
      });

      if (error) {
        console.error('❌ Runner invocation error:', error);
        throw error;
      }

      console.log('✅ Automation execution started:', data.execution_id);

      // Fetch the execution record
      const { data: execution, error: fetchError } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('id', data.execution_id)
        .single();

      if (fetchError) {
        console.warn('⚠️ Could not fetch execution record:', fetchError);
        // Return a minimal execution object
        return {
          id: data.execution_id,
          automation_id: automationId,
          status: data.status || 'running',
          trigger_data: testData || { manual_test: true },
          started_at: new Date().toISOString(),
          retry_count: 0,
          is_retry: false,
        } as AutomationExecution;
      }

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

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false): Promise<any[]> {
    try {
      console.log('🔄 Loading notifications for user:', userId);

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading notifications:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data.length} notifications`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      console.log('🔄 Marking notification as read:', notificationId);

      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
      }

      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    try {
      console.log('🔄 Marking all notifications as read');

      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
        throw error;
      }

      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Trigger scheduler manually (for testing)
   */
  async triggerScheduler(): Promise<any> {
    try {
      console.log('🔄 Manually triggering automation scheduler');

      const { data, error } = await supabase.functions.invoke('automation-scheduler', {
        body: {
          manual_trigger: true,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('❌ Scheduler invocation error:', error);
        throw error;
      }

      console.log('✅ Scheduler triggered:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to trigger scheduler:', error);
      throw error;
    }
  }

  /**
   * Calculate next execution time for an automation
   */
  calculateNextExecution(automation: Automation): string | null {
    const { schedule_config } = automation;

    if (!schedule_config || !schedule_config.type) {
      return null;
    }

    const now = new Date();

    // Interval-based scheduling
    if (schedule_config.interval_minutes) {
      const next = new Date(now.getTime() + schedule_config.interval_minutes * 60 * 1000);
      return next.toISOString();
    }

    // Cron-based scheduling (simplified)
    if (schedule_config.cron_expression) {
      // For complex cron parsing, use a library
      // This is a simplified version
      const next = new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour
      return next.toISOString();
    }

    return null;
  }

  /**
   * Send test email via automation-email function
   */
  async sendTestEmail(to: string, subject: string, body: string): Promise<any> {
    try {
      console.log('🔄 Sending test email to:', to);

      const { data, error } = await supabase.functions.invoke('automation-email', {
        body: {
          to,
          subject,
          body
        }
      });

      if (error) {
        console.error('❌ Email service error:', error);
        throw error;
      }

      console.log('✅ Test email sent');
      return data;
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      throw error;
    }
  }

  /**
   * Send test notification via automation-notification function
   */
  async sendTestNotification(userId: string, title: string, message: string): Promise<any> {
    try {
      console.log('🔄 Sending test notification to user:', userId);

      const { data, error } = await supabase.functions.invoke('automation-notification', {
        body: {
          user_id: userId,
          title,
          message,
          type: 'info',
          priority: 'normal'
        }
      });

      if (error) {
        console.error('❌ Notification service error:', error);
        throw error;
      }

      console.log('✅ Test notification sent');
      return data;
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Register push token for mobile notifications
   */
  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android' | 'web' | 'expo'): Promise<void> {
    try {
      console.log(`🔄 Registering push token for ${platform}`);

      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform,
          is_active: true,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('❌ Error registering push token:', error);
        throw error;
      }

      console.log('✅ Push token registered');
    } catch (error) {
      console.error('❌ Failed to register push token:', error);
      throw error;
    }
  }

  /**
   * Unregister push token
   */
  async unregisterPushToken(token: string): Promise<void> {
    try {
      console.log('🔄 Unregistering push token');

      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('token', token);

      if (error) {
        console.error('❌ Error unregistering push token:', error);
        throw error;
      }

      console.log('✅ Push token unregistered');
    } catch (error) {
      console.error('❌ Failed to unregister push token:', error);
      throw error;
    }
  }

  /**
   * Execute micro template
   * Micro-moteur pour templates simples sans passer par n8n
   * Templates supportés: focus_mode, break_time, daily_quote
   */
  async executeMicroTemplate(
    templateId: string,
    userId: string,
    config?: Record<string, any>
  ): Promise<any> {
    try {
      console.log('🎯 Executing micro template:', templateId);
      console.log('👤 User ID:', userId);

      // Validate template ID
      const validTemplates = ['focus_mode', 'break_time', 'daily_quote'];
      if (!validTemplates.includes(templateId)) {
        throw new Error(`Invalid micro template: ${templateId}. Valid templates: ${validTemplates.join(', ')}`);
      }

      // Call automation-micro-runner Edge Function
      const { data, error } = await supabase.functions.invoke('automation-micro-runner', {
        body: {
          templateId,
          userId,
          config: config || {}
        }
      });

      if (error) {
        console.error('❌ Micro runner invocation error:', error);
        throw error;
      }

      console.log('✅ Micro template executed:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to execute micro template:', error);
      throw error;
    }
  }

  /**
   * Get random quote from database
   */
  async getRandomQuote(category?: string): Promise<any> {
    try {
      console.log('🔄 Fetching random quote');

      const { data, error } = await supabase.rpc('get_random_quote', {
        p_category: category || null
      });

      if (error) {
        console.error('❌ Error fetching random quote:', error);
        throw error;
      }

      console.log('✅ Random quote fetched');
      return data[0];
    } catch (error) {
      console.error('❌ Failed to fetch random quote:', error);
      throw error;
    }
  }
}

export const automationService = new AutomationService();