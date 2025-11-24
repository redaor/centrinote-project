// =====================================================
// AUTOMATION NOTIFICATION - Supabase Edge Function
// Push notifications and in-app notifications
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface NotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Debug: Vérifier le header Authorization reçu (comme automation-scheduler)
  const authHeader = req.headers.get('Authorization');
  console.log('🔔 [AUTOMATION-NOTIFICATION] Authorization header reçu :', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUCUN HEADER');
  console.log('🔔 [AUTOMATION-NOTIFICATION] Tous les headers reçus :', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔔 [AUTOMATION-NOTIFICATION] Starting execution');
    console.log('🔔 [AUTOMATION-NOTIFICATION] Request method:', req.method);
    console.log('🔔 [AUTOMATION-NOTIFICATION] Request URL:', req.url);

    // Initialize Supabase client (comme automation-scheduler)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    let supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Si la clé n'est pas dans l'environnement, essayer de la récupérer depuis le header
    if (!supabaseServiceKey) {
      if (authHeader && authHeader.startsWith('Bearer ')) {
        supabaseServiceKey = authHeader.substring(7); // Enlever "Bearer "
        console.log('🔔 [AUTOMATION-NOTIFICATION] Service key récupérée depuis le header Authorization');
      } else {
        console.error('❌ [AUTOMATION-NOTIFICATION] SUPABASE_SERVICE_ROLE_KEY not found in environment and no Authorization header provided');
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment and no Authorization header provided');
      }
    }
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Configure it in Edge Functions secrets or pass it in Authorization header');
    }

    console.log('🔔 [AUTOMATION-NOTIFICATION] Supabase URL:', supabaseUrl);
    console.log('🔔 [AUTOMATION-NOTIFICATION] Service key présent:', supabaseServiceKey ? 'OUI' : 'NON');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const requestBody = await req.json();
    console.log('🔔 [AUTOMATION-NOTIFICATION] Request body reçu:', JSON.stringify(requestBody));

    const {
      user_id,
      title,
      message,
      type = 'info',
      priority = 'normal',
      action_url,
      metadata = {}
    }: NotificationRequest = requestBody;

    if (!user_id || !title || !message) {
      console.error('❌ [AUTOMATION-NOTIFICATION] Missing required fields:', { user_id: !!user_id, title: !!title, message: !!message });
      throw new Error('Missing required fields: user_id, title, message');
    }

    console.log(`📢 [AUTOMATION-NOTIFICATION] Creating notification for user: ${user_id}`);
    console.log(`📋 [AUTOMATION-NOTIFICATION] Title: ${title}`);
    console.log(`📋 [AUTOMATION-NOTIFICATION] Message: ${message}`);
    console.log(`🏷️ [AUTOMATION-NOTIFICATION] Type: ${type}, Priority: ${priority}`);

    // Create notification record
    const notificationData = {
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    console.log('🔔 [AUTOMATION-NOTIFICATION] Inserting notification data:', JSON.stringify(notificationData));

    // Retry logic pour gérer les erreurs TLS temporaires
    let notification: any = null;
    let insertError: any = null;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries && !notification) {
      try {
        const result = await supabase
          .from('notifications')
          .insert([notificationData])
          .select()
          .single();

        if (result.error) {
          insertError = result.error;
          // Si c'est une erreur TLS, on réessaie
          if (insertError.message && insertError.message.includes('tls handshake')) {
            retryCount++;
            console.warn(`⚠️ [AUTOMATION-NOTIFICATION] TLS error, retry ${retryCount}/${maxRetries}`);
            if (retryCount < maxRetries) {
              // Attendre un peu avant de réessayer
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
          }
          // Sinon, on arrête
          break;
        } else {
          notification = result.data;
          break;
        }
      } catch (error: any) {
        insertError = error;
        // Si c'est une erreur TLS, on réessaie
        if (error.message && error.message.includes('tls handshake')) {
          retryCount++;
          console.warn(`⚠️ [AUTOMATION-NOTIFICATION] TLS error (catch), retry ${retryCount}/${maxRetries}`);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
        // Sinon, on arrête
        break;
      }
    }

    if (insertError || !notification) {
      console.error('❌ [AUTOMATION-NOTIFICATION] Error creating notification after retries:', insertError);
      console.error('❌ [AUTOMATION-NOTIFICATION] Error details:', JSON.stringify(insertError));
      
      // Essayer une approche alternative : utiliser directement l'API REST avec fetch
      console.log('🔄 [AUTOMATION-NOTIFICATION] Trying alternative method with direct REST API...');
      try {
        const restUrl = `${supabaseUrl}/rest/v1/notifications`;
        const restResponse = await fetch(restUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(notificationData)
        });

        if (!restResponse.ok) {
          const errorText = await restResponse.text();
          throw new Error(`REST API error: ${restResponse.status} - ${errorText}`);
        }

        const restData = await restResponse.json();
        notification = Array.isArray(restData) ? restData[0] : restData;
        console.log(`✅ [AUTOMATION-NOTIFICATION] Notification created via REST API: ${notification.id}`);
      } catch (restError: any) {
        console.error('❌ [AUTOMATION-NOTIFICATION] REST API fallback also failed:', restError);
        throw new Error(`Failed to create notification after all retries: ${insertError?.message || restError?.message}`);
      }
    } else {
      console.log(`✅ [AUTOMATION-NOTIFICATION] Notification created: ${notification.id}`);
    }

    // Update user's unread notification count in user_profiles
    console.log('🔔 [AUTOMATION-NOTIFICATION] Updating user_profiles for user:', user_id);
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('unread_notifications')
      .eq('id', user_id)
      .single();

    if (!profileError && profileData) {
      console.log('🔔 [AUTOMATION-NOTIFICATION] Profile found, updating unread count');
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ unread_notifications: (profileData.unread_notifications || 0) + 1 })
        .eq('id', user_id);
      if (updateError) {
        console.warn('⚠️ [AUTOMATION-NOTIFICATION] Failed to update unread count:', updateError);
      } else {
        console.log('✅ [AUTOMATION-NOTIFICATION] Unread count updated');
      }
    } else {
      // Create profile if it doesn't exist
      console.log('🔔 [AUTOMATION-NOTIFICATION] Profile not found, creating new profile');
      const { error: insertProfileError } = await supabase
        .from('user_profiles')
        .insert([{ id: user_id, unread_notifications: 1 }])
        .select();
      if (insertProfileError) {
        console.warn('⚠️ [AUTOMATION-NOTIFICATION] Failed to create profile:', insertProfileError);
      } else {
        console.log('✅ [AUTOMATION-NOTIFICATION] Profile created');
      }
    }

    // Send push notification if user has push tokens
    const { data: pushTokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (pushTokens && pushTokens.length > 0) {
      console.log(`📱 Found ${pushTokens.length} push tokens`);

      for (const tokenData of pushTokens) {
        try {
          await sendPushNotification(tokenData.token, tokenData.platform, title, message, action_url);
          console.log(`✅ Push notification sent to ${tokenData.platform}`);
        } catch (pushError) {
          console.error(`❌ Failed to send push to ${tokenData.platform}:`, pushError);
        }
      }
    } else {
      console.log('ℹ️ No push tokens found for user');
    }

    // Send real-time notification via Supabase Realtime
    try {
      await supabase
        .from('notifications')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', notification.id);
    } catch (realtimeError) {
      console.warn('⚠️ Realtime update failed:', realtimeError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        push_sent: pushTokens ? pushTokens.length : 0,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [AUTOMATION-NOTIFICATION] Notification service error:', error);
    console.error('❌ [AUTOMATION-NOTIFICATION] Error stack:', error.stack);
    console.error('❌ [AUTOMATION-NOTIFICATION] Error name:', error.name);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_name: error.name,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

/**
 * Send push notification to device
 * This is a placeholder - integrate with your push service (FCM, APNs, etc.)
 */
async function sendPushNotification(
  token: string,
  platform: string,
  title: string,
  body: string,
  actionUrl?: string
): Promise<void> {
  // Example integration with Firebase Cloud Messaging (FCM)
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

  if (!fcmServerKey) {
    console.warn('⚠️ FCM_SERVER_KEY not configured, skipping push notification');
    return;
  }

  const fcmUrl = 'https://fcm.googleapis.com/fcm/send';

  const payload = {
    to: token,
    notification: {
      title,
      body,
      click_action: actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
      sound: 'default',
    },
    priority: 'high',
    data: {
      action_url: actionUrl,
    },
  };

  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.failure > 0) {
    console.warn('⚠️ Some push notifications failed:', result);
  }
}

/**
 * Alternative: Send via Expo Push Notifications (for React Native Expo apps)
 */
async function sendExpoPushNotification(
  token: string,
  title: string,
  body: string,
  actionUrl?: string
): Promise<void> {
  const expoUrl = 'https://exp.host/--/api/v2/push/send';

  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data: { url: actionUrl },
  };

  const response = await fetch(expoUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Expo push error: ${response.status}`);
  }

  const result = await response.json();

  if (result.data && result.data[0].status === 'error') {
    throw new Error(`Expo push error: ${result.data[0].message}`);
  }
}
