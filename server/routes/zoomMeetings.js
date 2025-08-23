import express from 'express';
import axios from 'axios';
import { TokenManager } from '../utils/tokenManager.js';

const router = express.Router();
const tokenManager = new TokenManager();

/**
 * GET /api/meetings - Lister toutes les réunions de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, page_size = 30, type = 'scheduled' } = req.query;
    const { zoomUserId } = req.user;
    
    console.log('📋 Récupération des réunions pour utilisateur:', req.user.email);
    
    const accessToken = await tokenManager.getValidAccessToken(zoomUserId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }
    
    const response = await axios.get(`${process.env.ZOOM_BASE_URL}/users/me/meetings`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        page_number: page,
        page_size,
        type
      }
    });
    
    const meetings = response.data.meetings || [];
    console.log(`✅ ${meetings.length} réunions récupérées`);
    
    res.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.id,
        uuid: meeting.uuid,
        topic: meeting.topic,
        type: meeting.type,
        status: meeting.status,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join_url: meeting.join_url,
        password: meeting.password,
        agenda: meeting.agenda,
        created_at: meeting.created_at,
        host_email: meeting.host_email,
        settings: meeting.settings
      })),
      page_count: response.data.page_count,
      page_number: response.data.page_number,
      page_size: response.data.page_size,
      total_records: response.data.total_records
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération réunions:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès expiré',
        needsRefresh: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des réunions',
      details: error.response?.data
    });
  }
});

/**
 * GET /api/meetings/:meetingId - Obtenir les détails d'une réunion
 */
router.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { zoomUserId } = req.user;
    
    console.log('🔍 Détails réunion:', meetingId);
    
    const accessToken = await tokenManager.getValidAccessToken(zoomUserId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }
    
    const response = await axios.get(`${process.env.ZOOM_BASE_URL}/meetings/${meetingId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const meeting = response.data;
    console.log('✅ Détails réunion récupérés:', meeting.topic);
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        uuid: meeting.uuid,
        topic: meeting.topic,
        type: meeting.type,
        status: meeting.status,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join_url: meeting.join_url,
        password: meeting.password,
        agenda: meeting.agenda,
        created_at: meeting.created_at,
        host_email: meeting.host_email,
        settings: meeting.settings,
        occurrences: meeting.occurrences
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur détails réunion:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Réunion non trouvée'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès expiré',
        needsRefresh: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des détails',
      details: error.response?.data
    });
  }
});

/**
 * POST /api/meetings - Créer une nouvelle réunion
 */
router.post('/', async (req, res) => {
  try {
    const { zoomUserId } = req.user;
    const meetingData = req.body;
    
    console.log('➕ Création réunion:', meetingData.topic);
    
    // Validation des données requises
    if (!meetingData.topic) {
      return res.status(400).json({
        success: false,
        error: 'Le titre de la réunion est requis'
      });
    }
    
    const accessToken = await tokenManager.getValidAccessToken(zoomUserId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }
    
    // Préparer les données de la réunion
    const meetingPayload = {
      topic: meetingData.topic,
      type: meetingData.type || 2, // 2 = réunion programmée
      start_time: meetingData.start_time,
      duration: meetingData.duration || 30,
      timezone: meetingData.timezone || 'Europe/Paris',
      password: meetingData.password,
      agenda: meetingData.agenda,
      settings: {
        host_video: meetingData.settings?.host_video ?? true,
        participant_video: meetingData.settings?.participant_video ?? true,
        waiting_room: meetingData.settings?.waiting_room ?? true,
        join_before_host: meetingData.settings?.join_before_host ?? false,
        mute_upon_entry: meetingData.settings?.mute_upon_entry ?? true,
        auto_recording: meetingData.settings?.auto_recording || 'none',
        approval_type: meetingData.settings?.approval_type ?? 2,
        registration_type: meetingData.settings?.registration_type ?? 1
      }
    };
    
    const response = await axios.post(`${process.env.ZOOM_BASE_URL}/users/me/meetings`, meetingPayload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const meeting = response.data;
    console.log('✅ Réunion créée:', meeting.id, meeting.topic);
    
    res.status(201).json({
      success: true,
      meeting: {
        id: meeting.id,
        uuid: meeting.uuid,
        topic: meeting.topic,
        type: meeting.type,
        status: meeting.status,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join_url: meeting.join_url,
        password: meeting.password,
        agenda: meeting.agenda,
        created_at: meeting.created_at,
        host_email: meeting.host_email,
        settings: meeting.settings
      },
      message: 'Réunion créée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur création réunion:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès expiré',
        needsRefresh: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la réunion',
      details: error.response?.data
    });
  }
});

/**
 * PATCH /api/meetings/:meetingId - Mettre à jour une réunion
 */
router.patch('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { zoomUserId } = req.user;
    const updateData = req.body;
    
    console.log('📝 Modification réunion:', meetingId);
    
    const accessToken = await tokenManager.getValidAccessToken(zoomUserId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }
    
    // Préparer les données de mise à jour
    const updatePayload = {};
    
    if (updateData.topic) updatePayload.topic = updateData.topic;
    if (updateData.type) updatePayload.type = updateData.type;
    if (updateData.start_time) updatePayload.start_time = updateData.start_time;
    if (updateData.duration) updatePayload.duration = updateData.duration;
    if (updateData.timezone) updatePayload.timezone = updateData.timezone;
    if (updateData.password) updatePayload.password = updateData.password;
    if (updateData.agenda) updatePayload.agenda = updateData.agenda;
    if (updateData.settings) updatePayload.settings = updateData.settings;
    
    await axios.patch(`${process.env.ZOOM_BASE_URL}/meetings/${meetingId}`, updatePayload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Réunion modifiée:', meetingId);
    
    res.json({
      success: true,
      message: 'Réunion modifiée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur modification réunion:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Réunion non trouvée'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès expiré',
        needsRefresh: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de la réunion',
      details: error.response?.data
    });
  }
});

/**
 * DELETE /api/meetings/:meetingId - Supprimer une réunion
 */
router.delete('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { zoomUserId } = req.user;
    
    console.log('🗑️ Suppression réunion:', meetingId);
    
    const accessToken = await tokenManager.getValidAccessToken(zoomUserId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }
    
    await axios.delete(`${process.env.ZOOM_BASE_URL}/meetings/${meetingId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Réunion supprimée:', meetingId);
    
    res.json({
      success: true,
      message: 'Réunion supprimée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression réunion:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Réunion non trouvée'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès expiré',
        needsRefresh: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la réunion',
      details: error.response?.data
    });
  }
});

/**
 * GET /api/meetings/:meetingId/recordings - Obtenir les enregistrements d'une réunion
 */
router.get('/:meetingId/recordings', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { zoomUserId } = req.user;
    
    console.log('🎬 Récupération enregistrements:', meetingId);
    
    const accessToken = await tokenManager.getValidAccessToken(zoomUserId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }
    
    const response = await axios.get(`${process.env.ZOOM_BASE_URL}/meetings/${meetingId}/recordings`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const recordings = response.data;
    console.log('✅ Enregistrements récupérés:', recordings.recording_files?.length || 0);
    
    res.json({
      success: true,
      recordings: {
        uuid: recordings.uuid,
        id: recordings.id,
        topic: recordings.topic,
        host_email: recordings.host_email,
        start_time: recordings.start_time,
        duration: recordings.duration,
        total_size: recordings.total_size,
        recording_count: recordings.recording_count,
        recording_files: recordings.recording_files?.map(file => ({
          id: file.id,
          meeting_id: file.meeting_id,
          recording_start: file.recording_start,
          recording_end: file.recording_end,
          file_type: file.file_type,
          file_size: file.file_size,
          play_url: file.play_url,
          download_url: file.download_url,
          status: file.status
        })) || []
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur enregistrements:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Enregistrements non trouvés'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès expiré',
        needsRefresh: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des enregistrements',
      details: error.response?.data
    });
  }
});

export default router;