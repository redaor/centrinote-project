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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔔 Automation Notification Service - Processing request');

    // Parse request
    const {
      user_id,
      title,
      message,
      type = 'info',
      priority = 'normal',
      action_url,
      metadata = {}
    }: NotificationRequest = await req.json();

    if (!user_id || !title || !message) {
      throw new Error('Missing required fields: user_id, title, message');
    }

    console.log(`📢 Creating notification for user: ${user_id}`);
    console.log(`📋 Title: ${title}`);
    console.log(`🏷️ Type: ${type}, Priority: ${priority}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating notification:', insertError);
      throw insertError;
    }

    console.log(`✅ Notification created: ${notification.id}`);

    // Update user's unread notification count in user_profiles
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('unread_notifications')
      .eq('id', user_id)
      .single();

    if (!profileError && profileData) {
      await supabase
        .from('user_profiles')
        .update({ unread_notifications: (profileData.unread_notifications || 0) + 1 })
        .eq('id', user_id);
    } else {
      // Create profile if it doesn't exist
      await supabase
        .from('user_profiles')
        .insert([{ id: user_id, unread_notifications: 1 }])
        .select();
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
    console.error('❌ Notification service error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
