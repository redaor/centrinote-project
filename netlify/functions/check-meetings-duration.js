// 🕐 Fonction Netlify Scheduled pour terminer automatiquement les réunions qui ont dépassé leur durée
// Exécutée toutes les 5 minutes via Netlify Scheduled Functions

const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🕐 [CHECK-DURATION] Vérification des réunions actives...');

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ [CHECK-DURATION] Configuration Supabase manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration Supabase manquante' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Récupérer toutes les réunions actives
    const { data: activeMeetings, error: fetchError } = await supabase
      .from('meetings')
      .select('id, title, started_at, duration_minutes, room_name')
      .eq('status', 'active');

    if (fetchError) {
      console.error('❌ [CHECK-DURATION] Erreur récupération meetings:', fetchError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: fetchError.message })
      };
    }

    if (!activeMeetings || activeMeetings.length === 0) {
      console.log('✅ [CHECK-DURATION] Aucune réunion active à vérifier');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Aucune réunion active',
          checked: 0
        })
      };
    }

    console.log(`🔍 [CHECK-DURATION] ${activeMeetings.length} réunions actives trouvées`);

    // 2. Vérifier chaque réunion
    const now = new Date();
    const meetingsToEnd = [];

    for (const meeting of activeMeetings) {
      if (!meeting.started_at || !meeting.duration_minutes) {
        console.warn(`⚠️ [CHECK-DURATION] Meeting ${meeting.id} manque started_at ou duration_minutes`);
        continue;
      }

      const startedAt = new Date(meeting.started_at);
      const durationMs = meeting.duration_minutes * 60 * 1000;
      const endTime = new Date(startedAt.getTime() + durationMs);
      const minutesElapsed = Math.floor((now - startedAt) / 1000 / 60);

      console.log(`📊 [CHECK-DURATION] Meeting "${meeting.title}":`);
      console.log(`   - Démarré: ${startedAt.toISOString()}`);
      console.log(`   - Durée prévue: ${meeting.duration_minutes} minutes`);
      console.log(`   - Temps écoulé: ${minutesElapsed} minutes`);
      console.log(`   - Fin prévue: ${endTime.toISOString()}`);
      console.log(`   - Maintenant: ${now.toISOString()}`);

      // Si la réunion a dépassé sa durée + 2 minutes de tolérance
      if (now > endTime) {
        const overdueMinutes = Math.floor((now - endTime) / 1000 / 60);
        console.log(`⏰ [CHECK-DURATION] Meeting ${meeting.id} en retard de ${overdueMinutes} minutes`);
        meetingsToEnd.push(meeting);
      }
    }

    // 3. Terminer les réunions qui ont dépassé leur durée
    if (meetingsToEnd.length === 0) {
      console.log('✅ [CHECK-DURATION] Toutes les réunions sont dans les temps');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Toutes les réunions sont dans les temps',
          checked: activeMeetings.length,
          ended: 0
        })
      };
    }

    console.log(`🏁 [CHECK-DURATION] ${meetingsToEnd.length} réunions à terminer`);

    const endedMeetings = [];
    const errors = [];

    for (const meeting of meetingsToEnd) {
      try {
        // Marquer comme terminée
        const { data: updated, error: updateError } = await supabase
          .from('meetings')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString()
          })
          .eq('id', meeting.id)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ [CHECK-DURATION] Erreur terminaison ${meeting.id}:`, updateError);
          errors.push({
            meetingId: meeting.id,
            error: updateError.message
          });
        } else {
          console.log(`✅ [CHECK-DURATION] Meeting ${meeting.id} terminé automatiquement`);
          endedMeetings.push({
            id: meeting.id,
            title: meeting.title,
            duration_minutes: meeting.duration_minutes
          });

          // Optionnel : Supprimer la room Daily.co
          if (meeting.room_name) {
            try {
              const DAILY_API_KEY = process.env.DAILY_API_KEY;
              if (DAILY_API_KEY) {
                const deleteResponse = await fetch(`https://api.daily.co/v1/rooms/${meeting.room_name}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${DAILY_API_KEY}`
                  }
                });

                if (deleteResponse.ok) {
                  console.log(`🗑️ [CHECK-DURATION] Room Daily.co ${meeting.room_name} supprimée`);
                } else {
                  console.warn(`⚠️ [CHECK-DURATION] Impossible de supprimer room ${meeting.room_name}`);
                }
              }
            } catch (dailyError) {
              console.warn(`⚠️ [CHECK-DURATION] Erreur suppression Daily.co:`, dailyError);
            }
          }
        }
      } catch (error) {
        console.error(`❌ [CHECK-DURATION] Erreur traitement ${meeting.id}:`, error);
        errors.push({
          meetingId: meeting.id,
          error: error.message
        });
      }
    }

    console.log(`✅ [CHECK-DURATION] Terminé: ${endedMeetings.length}/${meetingsToEnd.length} réunions`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        checked: activeMeetings.length,
        ended: endedMeetings.length,
        meetings: endedMeetings,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    console.error('❌ [CHECK-DURATION] Erreur globale:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur interne',
        message: error.message
      })
    };
  }
};
