// 🔍 Composant pour déboguer les données de réunion
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../AuthProvider';
import { Database, RefreshCw, Send } from 'lucide-react';

export function MeetingDataDebugger() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  
  const fetchMeetings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) {
        console.error('Error fetching meetings:', error);
      } else {
        console.log('📊 [DEBUG] Meetings from Supabase:', data);
        setMeetings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const sendTestWebhook = async (meeting: any) => {
    if (!meeting) return;
    
    console.log('📤 Sending test webhook with meeting data:', meeting);
    
    const testPayload = {
      type: 'debug.meeting_test',
      source: 'MeetingDataDebugger',
      payload: {
        room: meeting.room_name,
        meeting_id: meeting.id,
        url: meeting.room_url,
      },
      organizer: user ? {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email
      } : null,
      invited: meeting.participants || [],
      meeting_title: meeting.title,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 Test payload:', testPayload);
    
    try {
      const webhookBase = import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv886297.hstgr.cloud';
      const meetingEventsPath = import.meta.env.VITE_N8N_MEETING_EVENTS || '/webhook/daily-meeting-events';
      const webhookUrl = new URL(meetingEventsPath, webhookBase).toString();
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });
      
      console.log('✅ Webhook response:', response.status);
      alert(`Webhook envoyé! Status: ${response.status}`);
    } catch (error) {
      console.error('❌ Webhook error:', error);
      alert('Erreur envoi webhook');
    }
  };
  
  useEffect(() => {
    fetchMeetings();
  }, [user]);
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
        <Database className="w-5 h-5 mr-2" />
        🔍 Debug Données Réunion
      </h2>
      
      <div className="space-y-4">
        <button
          onClick={fetchMeetings}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Recharger les réunions</span>
        </button>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Vos dernières réunions :</h3>
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="p-3 border rounded dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setSelectedMeeting(meeting)}
            >
              <div className="font-medium">{meeting.title || 'Sans titre'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ID: {meeting.id}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Participants: {meeting.participants?.length || 0}
              </div>
            </div>
          ))}
        </div>
        
        {selectedMeeting && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <h3 className="font-semibold mb-2">Réunion sélectionnée :</h3>
            
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {selectedMeeting.id}</div>
              <div><strong>Title:</strong> {selectedMeeting.title || 'null'}</div>
              <div><strong>Room:</strong> {selectedMeeting.room_name}</div>
              <div><strong>URL:</strong> {selectedMeeting.room_url}</div>
              <div><strong>Participants ({selectedMeeting.participants?.length || 0}):</strong></div>
              
              {selectedMeeting.participants && (
                <pre className="bg-gray-200 dark:bg-gray-800 p-2 rounded overflow-auto text-xs">
                  {JSON.stringify(selectedMeeting.participants, null, 2)}
                </pre>
              )}
              
              <button
                onClick={() => sendTestWebhook(selectedMeeting)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mt-3"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer Test Webhook avec ces données</span>
              </button>
            </div>
            
            <details className="mt-3">
              <summary className="cursor-pointer font-medium">Données complètes JSON</summary>
              <pre className="bg-gray-200 dark:bg-gray-800 p-2 rounded overflow-auto text-xs mt-2">
                {JSON.stringify(selectedMeeting, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            💡 Ce debugger montre exactement ce qui est stocké dans Supabase et ce qui sera envoyé à n8n
          </p>
        </div>
      </div>
    </div>
  );
}