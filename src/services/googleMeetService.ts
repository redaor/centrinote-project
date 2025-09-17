import { gapi } from 'gapi-script';

export interface GoogleMeetRoom {
  id: string;
  meetingCode: string;
  meetingUrl: string;
  title: string;
  organizerEmail: string;
  startTime?: string;
  endTime?: string;
  attendees?: string[];
}

class GoogleMeetService {
  private isInitialized = false;
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_N8N_GOOGLE_MEET_WEBHOOK ||
      'https://n8n.srv886297.hstgr.cloud/webhook/google-meet-events';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar.events'
          });
          this.isInitialized = true;
          console.log('✅ Google API initialized');
          resolve();
        } catch (error) {
          console.error('❌ Google API init failed:', error);
          reject(error);
        }
      });
    });
  }

  async createMeeting(
    title: string,
    startTime: Date,
    duration: number = 60,
    attendees: string[] = []
  ): Promise<GoogleMeetRoom> {
    await this.initialize();

    const endTime = new Date(startTime.getTime() + duration * 60000);

    const event = {
      summary: title,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Paris'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Paris'
      },
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `centrinote-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    try {
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        resource: event
      });

      const meetingData: GoogleMeetRoom = {
        id: response.result.id,
        meetingCode: response.result.conferenceData?.conferenceId || '',
        meetingUrl: response.result.hangoutLink || '',
        title: title,
        organizerEmail: response.result.organizer?.email || '',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendees: attendees
      };

      await this.triggerWebhook('meeting_created', meetingData);

      console.log('✅ Google Meet created:', meetingData);
      return meetingData;
    } catch (error) {
      console.error('❌ Failed to create Google Meet:', error);
      throw error;
    }
  }

  async createInstantMeeting(title: string = 'Réunion instantanée'): Promise<GoogleMeetRoom> {
    const now = new Date();
    return this.createMeeting(title, now, 60);
  }

  private async triggerWebhook(event: string, data: any): Promise<void> {
    console.log(`📤 [Google Meet Webhook] Sending ${event}:`, data);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          ...data,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log(`✅ [Google Meet Webhook] ${event} sent successfully`);
    } catch (error) {
      console.error(`❌ [Google Meet Webhook] Failed to send ${event}:`, error);
    }
  }

  async signIn(): Promise<void> {
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      await authInstance.signIn();
    }
  }

  async signOut(): Promise<void> {
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signOut();
  }

  isSignedIn(): boolean {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance && authInstance.isSignedIn.get();
  }
}

export const googleMeetService = new GoogleMeetService();