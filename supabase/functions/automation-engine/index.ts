import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationTrigger {
  type: string;
  data: any;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { trigger }: { trigger: AutomationTrigger } = await req.json()

    // Récupérer les automatisations actives pour ce type de déclencheur et cet utilisateur
    const { data: automations, error: automationsError } = await supabaseClient
      .from('automations')
      .select('*')
      .eq('user_id', trigger.userId)
      .eq('trigger_type', trigger.type)
      .eq('is_active', true)

    if (automationsError) {
      throw automationsError
    }

    const results = []

    // Exécuter chaque automatisation
    for (const automation of automations || []) {
      try {
        const result = await executeAutomation(automation, trigger, supabaseClient)
        results.push(result)

        // Mettre à jour les statistiques d'exécution
        await supabaseClient
          .from('automations')
          .update({
            last_executed_at: new Date().toISOString(),
            execution_count: automation.execution_count + 1
          })
          .eq('id', automation.id)

        // Enregistrer le log d'exécution
        await supabaseClient
          .from('automation_logs')
          .insert({
            automation_id: automation.id,
            status: result.success ? 'success' : 'error',
            trigger_data: trigger.data,
            action_result: result.data,
            error_message: result.error || null
          })

      } catch (error) {
        console.error(`Erreur lors de l'exécution de l'automatisation ${automation.id}:`, error)
        
        // Enregistrer le log d'erreur
        await supabaseClient
          .from('automation_logs')
          .insert({
            automation_id: automation.id,
            status: 'error',
            trigger_data: trigger.data,
            action_result: {},
            error_message: error.message
          })

        results.push({
          automationId: automation.id,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur dans automation-engine:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function executeAutomation(automation: any, trigger: AutomationTrigger, supabaseClient: any) {
  const { action_type, action_config } = automation

  switch (action_type) {
    case 'create_reminder':
      return await createReminder(action_config, trigger, supabaseClient)
    
    case 'send_notification':
      return await sendNotification(action_config, trigger, supabaseClient)
    
    case 'create_study_session':
      return await createStudySession(action_config, trigger, supabaseClient)
    
    case 'update_document_tags':
      return await updateDocumentTags(action_config, trigger, supabaseClient)
    
    case 'share_document':
      return await shareDocument(action_config, trigger, supabaseClient)
    
    case 'create_vocabulary_review':
      return await createVocabularyReview(action_config, trigger, supabaseClient)
    
    case 'send_email':
      return await sendEmail(action_config, trigger, supabaseClient)
    
    case 'create_task':
      return await createTask(action_config, trigger, supabaseClient)
    
    default:
      throw new Error(`Type d'action non supporté: ${action_type}`)
  }
}

async function createReminder(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour créer un rappel
  const reminderData = {
    user_id: trigger.userId,
    title: config.title || 'Rappel automatique',
    description: config.description || '',
    scheduled_for: new Date(Date.now() + (config.delay_minutes || 60) * 60000).toISOString(),
    created_at: new Date().toISOString()
  }

  // Dans un vrai projet, vous auriez une table 'reminders'
  console.log('Création d\'un rappel:', reminderData)

  return {
    success: true,
    data: reminderData
  }
}

async function sendNotification(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour envoyer une notification
  const notificationData = {
    user_id: trigger.userId,
    title: config.title || 'Notification automatique',
    message: config.message || '',
    type: config.type || 'info',
    sent_at: new Date().toISOString()
  }

  console.log('Envoi d\'une notification:', notificationData)

  return {
    success: true,
    data: notificationData
  }
}

async function createStudySession(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour créer une session d'étude
  const sessionData = {
    user_id: trigger.userId,
    title: config.title || 'Session d\'étude automatique',
    type: config.session_type || 'vocabulary',
    scheduled_for: new Date(Date.now() + (config.delay_hours || 24) * 3600000).toISOString(),
    duration: config.duration || 30,
    created_at: new Date().toISOString()
  }

  // Dans un vrai projet, vous inséreriez dans la table 'study_sessions'
  console.log('Création d\'une session d\'étude:', sessionData)

  return {
    success: true,
    data: sessionData
  }
}

async function updateDocumentTags(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour mettre à jour les tags d'un document
  if (!trigger.data.documentId) {
    throw new Error('ID du document manquant')
  }

  const newTags = config.tags || []
  
  // Récupérer le document actuel
  const { data: document, error } = await supabaseClient
    .from('documents')
    .select('tags')
    .eq('id', trigger.data.documentId)
    .single()

  if (error) throw error

  const updatedTags = [...new Set([...(document.tags || []), ...newTags])]

  // Mettre à jour les tags
  const { error: updateError } = await supabaseClient
    .from('documents')
    .update({ tags: updatedTags })
    .eq('id', trigger.data.documentId)

  if (updateError) throw updateError

  return {
    success: true,
    data: { documentId: trigger.data.documentId, newTags: updatedTags }
  }
}

async function shareDocument(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour partager un document
  if (!trigger.data.documentId) {
    throw new Error('ID du document manquant')
  }

  const shareData = {
    document_id: trigger.data.documentId,
    shared_with: config.email || '',
    permissions: config.permissions || 'read',
    shared_at: new Date().toISOString()
  }

  console.log('Partage d\'un document:', shareData)

  return {
    success: true,
    data: shareData
  }
}

async function createVocabularyReview(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour créer une révision de vocabulaire
  const reviewData = {
    user_id: trigger.userId,
    title: config.title || 'Révision vocabulaire automatique',
    word_count: config.word_count || 10,
    difficulty_level: config.difficulty_level || 'mixed',
    scheduled_for: new Date(Date.now() + (config.delay_hours || 1) * 3600000).toISOString(),
    created_at: new Date().toISOString()
  }

  console.log('Création d\'une révision vocabulaire:', reviewData)

  return {
    success: true,
    data: reviewData
  }
}

async function sendEmail(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour envoyer un email
  const emailData = {
    to: config.to || '',
    subject: config.subject || 'Notification Centrinote',
    body: config.body || '',
    sent_at: new Date().toISOString()
  }

  console.log('Envoi d\'un email:', emailData)

  return {
    success: true,
    data: emailData
  }
}

async function createTask(config: any, trigger: AutomationTrigger, supabaseClient: any) {
  // Logique pour créer une tâche
  const taskData = {
    user_id: trigger.userId,
    title: config.title || 'Tâche automatique',
    description: config.description || '',
    priority: config.priority || 'medium',
    due_date: config.due_date ? new Date(config.due_date).toISOString() : null,
    created_at: new Date().toISOString()
  }

  console.log('Création d\'une tâche:', taskData)

  return {
    success: true,
    data: taskData
  }
}