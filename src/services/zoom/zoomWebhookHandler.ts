import { supabase } from '../../lib/supabase';
import { webhookService } from '../webhookService';
import { n8nWebhookService } from '../n8nWebhookService';

interface ZoomWebhookPayload {
  event: string;
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      timezone: string;
      duration: number;
      participants?: ParticipantInfo[];
      recording_files?: RecordingFile[];
    };
  };
}

interface ParticipantInfo {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  join_time: string;
  leave_time: string;
  duration: number;
  failover: boolean;
  status: string;
}

interface RecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  file_path: string;
  download_url: string;
  status: string;
  recording_type: string;
}

export class ZoomWebhookHandler {
  private readonly N8N_ZOOM_WEBHOOK_URL: string;

  constructor() {
    this.N8N_ZOOM_WEBHOOK_URL = import.meta.env.VITE_N8N_ZOOM_WEBHOOK_URL || 
      'https://n8n.srv886297.hstgr.cloud/webhook/zoom-events';
  }

  /**
   * Process incoming Zoom webhook
   */
  async processWebhook(payload: ZoomWebhookPayload): Promise<boolean> {
    try {
      console.log(`📥 Traitement webhook Zoom: ${payload.event}`);
      console.log('📋 Payload:', JSON.stringify(payload, null, 2));

      // Validate payload
      if (!payload.event || !payload.payload?.object) {
        console.error('❌ Payload webhook invalide');
        return false;
      }

      const { event, payload: zoomPayload } = payload;
      const meetingObject = zoomPayload.object;

      // Find meeting in database
      const meeting = await this.findMeetingByZoomId(meetingObject.id);
      if (!meeting) {
        console.warn(`⚠️ Meeting ${meetingObject.id} non trouvé en base de données`);
        // Still forward to N8N for potential processing
      }

      // Process different event types
      switch (event) {
        case 'meeting.started':
          await this.handleMeetingStarted(meeting, meetingObject);
          break;
        
        case 'meeting.ended':
          await this.handleMeetingEnded(meeting, meetingObject);
          break;
        
        case 'meeting.participant_joined':
          await this.handleParticipantJoined(meeting, meetingObject.participants?.[0]);
          break;
        
        case 'meeting.participant_left':
          await this.handleParticipantLeft(meeting, meetingObject.participants?.[0]);
          break;
        
        case 'recording.completed':
          await this.handleRecordingCompleted(meeting, meetingObject.recording_files);
          break;
        
        default:
          console.log(`ℹ️ Événement non géré: ${event}`);
      }

      // Forward to N8N for further processing
      const forwarded = await this.forwardToN8N(payload, meeting);
      
      // Update webhook events log
      if (meeting) {
        await this.logWebhookEvent(meeting.id, event, payload);
      }

      return forwarded;
    } catch (error) {
      console.error('❌ Erreur traitement webhook Zoom:', error);
      return false;
    }
  }

  /**
   * Find meeting by Zoom ID
   */
  private async findMeetingByZoomId(zoomMeetingId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('zoom_meeting_id', zoomMeetingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur recherche meeting:', error);
      return null;
    }
  }

  /**
   * Handle meeting started event
   */
  private async handleMeetingStarted(meeting: any, meetingObject: any): Promise<void> {
    if (!meeting) return;

    try {
      console.log('🟢 Meeting démarré:', meeting.id);

      await supabase
        .from('meetings')
        .update({
          status: 'started',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', meeting.id);

      console.log('✅ Statut meeting mis à jour: started');
    } catch (error) {
      console.error('❌ Erreur mise à jour meeting started:', error);
    }
  }

  /**
   * Handle meeting ended event
   */
  private async handleMeetingEnded(meeting: any, meetingObject: any): Promise<void> {
    if (!meeting) return;

    try {
      console.log('🔴 Meeting terminé:', meeting.id);

      await supabase
        .from('meetings')
        .update({
          status: 'ended',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', meeting.id);

      console.log('✅ Statut meeting mis à jour: ended');

      // Trigger post-meeting processing
      setTimeout(() => {
        this.triggerPostMeetingProcessing(meeting.id);
      }, 5000); // Wait 5 seconds for recordings to be available

    } catch (error) {
      console.error('❌ Erreur mise à jour meeting ended:', error);
    }
  }

  /**
   * Handle participant joined event
   */
  private async handleParticipantJoined(meeting: any, participant: ParticipantInfo | undefined): Promise<void> {
    if (!meeting || !participant) return;

    try {
      console.log('👤 Participant rejoint:', participant.user_name);

      // Update participant record
      const { error } = await supabase
        .from('meeting_participants')
        .upsert({
          meeting_id: meeting.id,
          zoom_participant_id: participant.id,
          email: participant.email,
          display_name: participant.user_name,
          joined_at: new Date(participant.join_time).toISOString(),
          is_host: false,
          is_co_host: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_id,email'
        });

      if (error) {
        console.error('❌ Erreur mise à jour participant:', error);
      } else {
        console.log('✅ Participant mis à jour');
      }
    } catch (error) {
      console.error('❌ Erreur participant joined:', error);
    }
  }

  /**
   * Handle participant left event
   */
  private async handleParticipantLeft(meeting: any, participant: ParticipantInfo | undefined): Promise<void> {
    if (!meeting || !participant) return;

    try {
      console.log('👋 Participant quitté:', participant.user_name);

      // Calculate duration
      const joinTime = new Date(participant.join_time);
      const leaveTime = new Date(participant.leave_time);
      const durationMinutes = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));

      await supabase
        .from('meeting_participants')
        .update({
          left_at: leaveTime.toISOString(),
          duration_minutes: durationMinutes,
          updated_at: new Date().toISOString()
        })
        .eq('meeting_id', meeting.id)
        .eq('email', participant.email);

      console.log(`✅ Durée participant mise à jour: ${durationMinutes}min`);
    } catch (error) {
      console.error('❌ Erreur participant left:', error);
    }
  }

  /**
   * Handle recording completed event
   */
  private async handleRecordingCompleted(meeting: any, recordingFiles: RecordingFile[] | undefined): Promise<void> {
    if (!meeting || !recordingFiles) return;

    try {
      console.log('🎬 Enregistrement disponible pour meeting:', meeting.id);
      console.log(`📁 ${recordingFiles.length} fichiers d'enregistrement`);

      // Store recording information
      for (const file of recordingFiles) {
        await supabase
          .from('meeting_recordings')
          .upsert({
            meeting_id: meeting.id,
            zoom_recording_id: file.id,
            recording_type: file.recording_type as any,
            file_type: file.file_type,
            file_size: file.file_size,
            download_url: file.download_url,
            downloaded: false,
            processed_for_transcription: false,
            transcription_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'zoom_recording_id'
          });
      }

      // Update meeting recording status
      await supabase
        .from('meetings')
        .update({
          has_recording: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', meeting.id);

      console.log('✅ Informations d\'enregistrement stockées');

      // Trigger recording download and processing
      setTimeout(() => {
        this.triggerRecordingProcessing(meeting.id);
      }, 2000);

    } catch (error) {
      console.error('❌ Erreur traitement enregistrement:', error);
    }
  }

  /**
   * Forward webhook to N8N for processing
   */
  private async forwardToN8N(payload: ZoomWebhookPayload, meeting: any): Promise<boolean> {
    try {
      console.log('🔄 Transmission du webhook vers N8N...');

      // Use enhanced N8N webhook service
      const zoomData = {
        event: payload.event,
        timestamp: new Date(payload.event_ts * 1000).toISOString(),
        zoom_payload: payload.payload,
        meeting_id: meeting?.id,
        meeting_data: meeting ? {
          id: meeting.id,
          user_id: meeting.user_id,
          title: meeting.title,
          status: meeting.status,
          start_time: meeting.start_time,
          duration: meeting.duration,
          participants_count: await this.getParticipantsCount(meeting.id)
        } : null,
        processing_context: {
          source: 'zoom_webhook_handler',
          environment: 'centrinote_app',
          version: '1.0'
        }
      };

      const result = await n8nWebhookService.sendZoomWebhook(
        payload.event,
        zoomData,
        meeting?.id
      );

      if (result.success) {
        console.log('✅ Webhook transmis avec succès à N8N');
        return true;
      } else {
        console.warn('⚠️ Échec transmission N8N:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur transmission N8N:', error);
      return false;
    }
  }

  /**
   * Get participants count for a meeting
   */
  private async getParticipantsCount(meetingId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('meeting_participants')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', meetingId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('❌ Erreur comptage participants:', error);
      return 0;
    }
  }

  /**
   * Log webhook event
   */
  private async logWebhookEvent(meetingId: string, event: string, payload: any): Promise<void> {
    try {
      // Get current webhook events
      const { data: meeting, error: getMeetingError } = await supabase
        .from('meetings')
        .select('webhook_events')
        .eq('id', meetingId)
        .single();

      if (getMeetingError) throw getMeetingError;

      const currentEvents = meeting?.webhook_events || [];
      const newEvent = {
        event_type: event,
        timestamp: new Date().toISOString(),
        data: payload
      };

      // Add new event to array
      const updatedEvents = [...currentEvents, newEvent];

      // Update meeting with new event log
      await supabase
        .from('meetings')
        .update({
          webhook_events: updatedEvents,
          last_webhook_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      console.log(`✅ Événement webhook ${event} enregistré`);
    } catch (error) {
      console.error('❌ Erreur enregistrement événement:', error);
    }
  }

  /**
   * Trigger post-meeting processing
   */
  private async triggerPostMeetingProcessing(meetingId: string): Promise<void> {
    try {
      console.log('🔄 Déclenchement traitement post-meeting:', meetingId);

      // Get meeting data
      const { data: meeting } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meeting) {
        const automationData = {
          action: 'process_meeting_completion',
          meetingId,
          tasks: [
            'download_recordings',
            'generate_transcript',
            'create_summary',
            'send_email_summaries',
            'update_automation_status'
          ],
          timestamp: new Date().toISOString(),
          priority: 'high'
        };

        await n8nWebhookService.sendMeetingAutomationWebhook(
          'process_meeting_completion',
          meeting
        );
      }
      
      console.log('✅ Traitement post-meeting déclenché');
    } catch (error) {
      console.error('❌ Erreur traitement post-meeting:', error);
    }
  }

  /**
   * Trigger recording processing
   */
  private async triggerRecordingProcessing(meetingId: string): Promise<void> {
    try {
      console.log('🎬 Déclenchement traitement enregistrement:', meetingId);

      // Get meeting and recording data
      const { data: meeting } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      const { data: recordings } = await supabase
        .from('meeting_recordings')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (meeting && recordings && recordings.length > 0) {
        for (const recording of recordings) {
          await n8nWebhookService.sendRecordingWebhook(
            'process_recording',
            recording,
            meeting
          );
        }
      }
      
      console.log('✅ Traitement enregistrement déclenché');
    } catch (error) {
      console.error('❌ Erreur traitement enregistrement:', error);
    }
  }

  /**
   * Trigger N8N workflow (public method)
   */
  async triggerN8NWorkflow(meetingId: string, event: string, data: any): Promise<boolean> {
    try {
      const payload = {
        source: 'centrinote_zoom_integration',
        event,
        meetingId,
        data,
        timestamp: new Date().toISOString()
      };

      const result = await webhookService.sendWebhookRequest('zoom_integration_event', payload);
      
      return result.success;
    } catch (error) {
      console.error('❌ Erreur déclenchement workflow N8N:', error);
      return false;
    }
  }
}