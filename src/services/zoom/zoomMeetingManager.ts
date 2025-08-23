import { supabase } from '../../lib/supabase';
import { Meeting, MeetingFormData, UserZoomIntegration, MeetingParticipant } from '../../types/zoom';
import { webhookService } from '../webhookService';

export class ZoomMeetingManager {
  private jwtToken: string = '';

  constructor() {
    this.jwtToken = import.meta.env.VITE_ZOOM_JWT_TOKEN || '';
  }

  /**
   * Generate JWT token for Zoom API calls
   */
  private async generateJWTToken(): Promise<string> {
    try {
      // In production, this should be done on the backend
      const response = await fetch('/api/zoom/generate-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du token JWT');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('❌ Erreur génération JWT:', error);
      // Fallback to environment token
      return this.jwtToken;
    }
  }

  /**
   * Create a new Zoom meeting
   */
  async createMeeting(integration: UserZoomIntegration, meetingData: MeetingFormData): Promise<Meeting | null> {
    try {
      console.log('📅 Création d\'un meeting Zoom:', meetingData.title);

      // Prepare meeting configuration
      const meetingConfig = {
        topic: meetingData.title,
        type: 2, // Scheduled meeting
        start_time: new Date(meetingData.start_time).toISOString(),
        duration: meetingData.duration,
        timezone: meetingData.timezone,
        password: meetingData.password,
        agenda: meetingData.description,
        settings: {
          host_video: meetingData.host_video,
          participant_video: meetingData.participant_video,
          cn_meeting: false,
          in_meeting: false,
          join_before_host: meetingData.join_before_host || false,
          mute_upon_entry: meetingData.mute_upon_entry || true,
          watermark: true,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both' as const,
          auto_recording: meetingData.auto_recording || 'none' as const,
          allow_multiple_devices: true,
          registrants_email_notification: false,
          meeting_authentication: false,
          waiting_room: meetingData.waiting_room || false
        }
      };

      // Create meeting via Zoom API
      const zoomMeeting = await this.createZoomMeeting(integration.zoom_user_id, meetingConfig);

      if (!zoomMeeting) {
        throw new Error('Erreur lors de la création du meeting Zoom');
      }

      // Store meeting in database
      const meeting = await this.storeMeetingInDB(integration, zoomMeeting, meetingData);

      // Add participants
      if (meetingData.participants && meetingData.participants.length > 0) {
        await this.addParticipants(meeting.id, meetingData.participants);
      }

      // Trigger N8N workflow for meeting creation
      await this.triggerN8NWorkflow(meeting.id, 'meeting.created', {
        meeting: meeting,
        participants: meetingData.participants
      });

      console.log('✅ Meeting créé avec succès:', meeting.id);
      return meeting;
    } catch (error) {
      console.error('❌ Erreur lors de la création du meeting:', error);
      return null;
    }
  }

  /**
   * Create meeting via Zoom API
   */
  private async createZoomMeeting(zoomUserId: string, meetingConfig: any): Promise<any> {
    try {
      const jwt = await this.generateJWTToken();

      const response = await fetch(`https://api.zoom.us/v2/users/${zoomUserId}/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingConfig)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Zoom API Error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erreur API Zoom:', error);
      throw error;
    }
  }

  /**
   * Store meeting in database
   */
  private async storeMeetingInDB(integration: UserZoomIntegration, zoomMeeting: any, formData: MeetingFormData): Promise<Meeting> {
    try {
      const meetingData = {
        user_id: integration.user_id,
        zoom_meeting_id: zoomMeeting.id.toString(),
        zoom_user_id: integration.zoom_user_id,
        title: formData.title,
        description: formData.description,
        start_time: new Date(formData.start_time).toISOString(),
        duration: formData.duration,
        timezone: formData.timezone,
        meeting_url: `https://zoom.us/j/${zoomMeeting.id}`,
        join_url: zoomMeeting.join_url,
        password: formData.password,
        status: 'scheduled' as const,
        has_recording: formData.auto_recording !== 'none',
        recording_processed: false,
        summary_generated: false,
        emails_sent: false,
        webhook_events: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Erreur stockage meeting:', error);
      throw error;
    }
  }

  /**
   * Add participants to meeting
   */
  private async addParticipants(meetingId: string, participantEmails: string[]): Promise<void> {
    try {
      const participants = participantEmails.map(email => ({
        meeting_id: meetingId,
        email: email,
        display_name: email.split('@')[0], // Extract name from email
        is_host: false,
        is_co_host: false,
        summary_email_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('meeting_participants')
        .insert(participants);

      if (error) throw error;

      console.log(`✅ ${participants.length} participants ajoutés au meeting`);
    } catch (error) {
      console.error('❌ Erreur ajout participants:', error);
      throw error;
    }
  }

  /**
   * Update meeting
   */
  async updateMeeting(meetingId: string, updates: Partial<MeetingFormData>): Promise<boolean> {
    try {
      console.log('📝 Mise à jour du meeting:', meetingId);

      // Get meeting from database
      const { data: meeting, error: getMeetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (getMeetingError || !meeting) {
        throw new Error('Meeting non trouvé');
      }

      // Update via Zoom API if needed
      if (updates.title || updates.start_time || updates.duration) {
        await this.updateZoomMeeting(meeting.zoom_meeting_id, updates);
      }

      // Update in database
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (updateError) throw updateError;

      console.log('✅ Meeting mis à jour avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour meeting:', error);
      return false;
    }
  }

  /**
   * Update meeting via Zoom API
   */
  private async updateZoomMeeting(zoomMeetingId: string, updates: Partial<MeetingFormData>): Promise<void> {
    try {
      const jwt = await this.generateJWTToken();

      const updateData: any = {};
      if (updates.title) updateData.topic = updates.title;
      if (updates.start_time) updateData.start_time = new Date(updates.start_time).toISOString();
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.description) updateData.agenda = updates.description;

      const response = await fetch(`https://api.zoom.us/v2/meetings/${zoomMeetingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Zoom API Update Error: ${response.status} - ${error}`);
      }

      console.log('✅ Meeting Zoom mis à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour Zoom API:', error);
      throw error;
    }
  }

  /**
   * Cancel/Delete meeting
   */
  async cancelMeeting(zoomMeetingId: string): Promise<boolean> {
    try {
      console.log('❌ Annulation du meeting Zoom:', zoomMeetingId);

      const jwt = await this.generateJWTToken();

      const response = await fetch(`https://api.zoom.us/v2/meetings/${zoomMeetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn('⚠️ Erreur annulation Zoom:', error);
        // Continue anyway as the meeting might already be deleted
      }

      console.log('✅ Meeting Zoom annulé');
      return true;
    } catch (error) {
      console.error('❌ Erreur annulation meeting:', error);
      return false;
    }
  }

  /**
   * Get meeting participants
   */
  async getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération participants:', error);
      return [];
    }
  }

  /**
   * Start meeting (update status)
   */
  async startMeeting(meetingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          status: 'started',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;

      // Trigger N8N workflow
      await this.triggerN8NWorkflow(meetingId, 'meeting.started', { meetingId });

      console.log('✅ Meeting démarré:', meetingId);
      return true;
    } catch (error) {
      console.error('❌ Erreur démarrage meeting:', error);
      return false;
    }
  }

  /**
   * End meeting (update status)
   */
  async endMeeting(meetingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          status: 'ended',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;

      // Trigger N8N workflow for post-meeting processing
      await this.triggerN8NWorkflow(meetingId, 'meeting.ended', { 
        meetingId,
        should_process_recording: true,
        should_generate_summary: true
      });

      console.log('✅ Meeting terminé:', meetingId);
      return true;
    } catch (error) {
      console.error('❌ Erreur fin meeting:', error);
      return false;
    }
  }

  /**
   * Trigger N8N workflow
   */
  private async triggerN8NWorkflow(meetingId: string, event: string, data: any): Promise<boolean> {
    try {
      console.log(`🔄 Déclenchement workflow N8N: ${event} pour meeting ${meetingId}`);

      const payload = {
        event,
        meetingId,
        timestamp: new Date().toISOString(),
        data
      };

      // Use existing webhook service to trigger N8N
      const result = await webhookService.sendWebhookRequest('zoom_meeting_event', payload);

      if (result.success) {
        console.log('✅ Workflow N8N déclenché avec succès');
        return true;
      } else {
        console.warn('⚠️ Échec déclenchement workflow N8N:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur déclenchement workflow N8N:', error);
      return false;
    }
  }

  /**
   * Get meeting statistics
   */
  async getMeetingStats(userId: string): Promise<any> {
    try {
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants(count)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total_meetings: meetings?.length || 0,
        scheduled_meetings: meetings?.filter(m => m.status === 'scheduled').length || 0,
        active_meetings: meetings?.filter(m => m.status === 'started').length || 0,
        completed_meetings: meetings?.filter(m => m.status === 'ended').length || 0,
        total_participants: meetings?.reduce((sum, m) => sum + (m.meeting_participants?.length || 0), 0) || 0,
        recordings_available: meetings?.filter(m => m.has_recording).length || 0,
        summaries_generated: meetings?.filter(m => m.summary_generated).length || 0
      };

      return stats;
    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      return {
        total_meetings: 0,
        scheduled_meetings: 0,
        active_meetings: 0,
        completed_meetings: 0,
        total_participants: 0,
        recordings_available: 0,
        summaries_generated: 0
      };
    }
  }
}