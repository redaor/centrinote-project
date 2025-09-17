// 🧪 Test de configuration webhook n8n dual
export function testWebhookConfig() {
  const centrinoteEventsUrl = import.meta.env.VITE_N8N_CENTRINOTE_EVENTS;
  const jitsiRecordingUrl = import.meta.env.VITE_N8N_JITSI_RECORDING;
  const legacyUrl = import.meta.env.VITE_N8N_JITSI_WEBHOOK;
  
  console.log('🔧 Dual Webhook Configuration Test:');
  console.log('Centrinote Events URL:', centrinoteEventsUrl);
  console.log('Jitsi Recording URL:', jitsiRecordingUrl);
  console.log('Legacy URL:', legacyUrl);
  
  const primaryConfigured = !!centrinoteEventsUrl;
  const recordingConfigured = !!jitsiRecordingUrl;
  const expectedPrimary = 'https://n8n.srv886297.hstgr.cloud/webhook/centrinote-events';
  const expectedRecording = 'https://n8n.srv886297.hstgr.cloud/webhook/jitsi-recording';
  
  return {
    primary: {
      configured: primaryConfigured,
      url: centrinoteEventsUrl,
      isCorrect: centrinoteEventsUrl === expectedPrimary,
      expected: expectedPrimary
    },
    recording: {
      configured: recordingConfigured,
      url: jitsiRecordingUrl,
      isCorrect: jitsiRecordingUrl === expectedRecording,
      expected: expectedRecording
    },
    legacy: {
      configured: !!legacyUrl,
      url: legacyUrl
    },
    overallConfigured: primaryConfigured && recordingConfigured
  };
}

// Test des deux webhooks simultanément
export async function testWebhookConnection() {
  const centrinoteEventsUrl = import.meta.env.VITE_N8N_CENTRINOTE_EVENTS;
  const jitsiRecordingUrl = import.meta.env.VITE_N8N_JITSI_RECORDING;
  
  const testPayload = {
    event: 'connectivity_test',
    timestamp: new Date().toISOString(),
    source: 'centrinote_dual_test',
    data: {
      message: 'Test de connectivité dual webhook depuis Centrinote',
      environment: import.meta.env.MODE,
      testType: 'dual_webhook_config'
    },
    shouldSendEmail: false
  };
  
  const results = {
    primary: { success: false, error: 'Non configuré' as string | undefined },
    recording: { success: false, error: 'Non configuré' as string | undefined }
  };
  
  // Test webhook principal (centrinote-events)
  if (centrinoteEventsUrl) {
    try {
      const response = await fetch(centrinoteEventsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Test/1.0'
        },
        body: JSON.stringify(testPayload)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Primary Webhook Test Success:', result);
        results.primary = { success: true, status: response.status, data: result };
      } else {
        console.error('❌ Primary Webhook Test Failed:', response.status, response.statusText);
        results.primary = { success: false, status: response.status, error: response.statusText };
      }
    } catch (error) {
      console.error('❌ Primary Webhook Connection Error:', error);
      results.primary = { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
  
  // Test webhook recording (jitsi-recording)
  if (jitsiRecordingUrl) {
    try {
      const recordingPayload = { ...testPayload, shouldSendEmail: true };
      const response = await fetch(jitsiRecordingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Test/1.0'
        },
        body: JSON.stringify(recordingPayload)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Recording Webhook Test Success:', result);
        results.recording = { success: true, status: response.status, data: result };
      } else {
        console.error('❌ Recording Webhook Test Failed:', response.status, response.statusText);
        results.recording = { success: false, status: response.status, error: response.statusText };
      }
    } catch (error) {
      console.error('❌ Recording Webhook Connection Error:', error);
      results.recording = { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
  
  const overallSuccess = results.primary.success || results.recording.success;
  
  return {
    success: overallSuccess,
    primary: results.primary,
    recording: results.recording,
    summary: `Primary: ${results.primary.success ? '✅' : '❌'} | Recording: ${results.recording.success ? '✅' : '❌'}`
  };
}