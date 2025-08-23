// components/ZoomTest.jsx - Composant pour tester Zoom S2S
import React, { useState } from 'react';
import { zoomS2SService } from '../services/zoomApi';

const ZoomTest = () => {
  const [recordings, setRecordings] = useState([]);
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testGetRecordings = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🧪 Test récupération enregistrements...');
      const data = await zoomS2SService.getRecordings();
      console.log('✅ Enregistrements récupérés:', data);
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('❌ Erreur enregistrements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testGetUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🧪 Test récupération utilisateurs...');
      const data = await zoomS2SService.getUsers();
      console.log('✅ Utilisateurs récupérés:', data);
      setUsers(data.users || []);
    } catch (err) {
      console.error('❌ Erreur utilisateurs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testCreateMeeting = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🧪 Test création réunion...');
      const meetingData = {
        topic: "Test Réunion S2S",
        duration: 30,
        settings: {
          auto_recording: "cloud"
        }
      };
      const data = await zoomS2SService.createMeeting(meetingData);
      console.log('✅ Réunion créée:', data);
      setMeetings(prev => [...prev, data]);
    } catch (err) {
      console.error('❌ Erreur création réunion:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Test Zoom Server-to-Server</h2>
      
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ Erreur: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testGetUsers}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? '⏳' : '👥'} Tester Utilisateurs
        </button>

        <button 
          onClick={testGetRecordings}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#388e3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? '⏳' : '📹'} Tester Enregistrements
        </button>

        <button 
          onClick={testCreateMeeting}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#f57c00',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? '⏳' : '➕'} Créer Réunion Test
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div>
          <h3>👥 Utilisateurs ({users.length})</h3>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {users.map(user => (
              <div key={user.id} style={{ padding: '5px', border: '1px solid #eee', margin: '5px 0' }}>
                <strong>{user.first_name} {user.last_name}</strong><br/>
                <small>{user.email}</small>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>📹 Enregistrements ({recordings.length})</h3>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {recordings.map((recording, index) => (
              <div key={index} style={{ padding: '5px', border: '1px solid #eee', margin: '5px 0' }}>
                <strong>{recording.topic}</strong><br/>
                <small>Durée: {recording.duration}min</small>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>🎯 Réunions Créées ({meetings.length})</h3>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {meetings.map((meeting, index) => (
              <div key={index} style={{ padding: '5px', border: '1px solid #eee', margin: '5px 0' }}>
                <strong>{meeting.topic}</strong><br/>
                <small>ID: {meeting.id}</small><br/>
                <a href={meeting.join_url} target="_blank" rel="noopener noreferrer">
                  🔗 Rejoindre
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomTest;