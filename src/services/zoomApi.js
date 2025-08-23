// services/zoomApi.js - Service pour Zoom Server-to-Server
const ZOOM_API_BASE = 'http://localhost:8080/api';

export const zoomS2SService = {
  // Récupérer tous les enregistrements
  async getRecordings() {
    try {
      const response = await fetch(`${ZOOM_API_BASE}/users/me/recordings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération enregistrements:', error);
      throw error;
    }
  },

  // Créer une réunion avec enregistrement automatique
  async createMeeting(meetingData) {
    try {
      const meetingConfig = {
        topic: meetingData.topic || "Réunion automatique",
        type: 2, // Réunion programmée
        duration: meetingData.duration || 60,
        settings: {
          auto_recording: "cloud", // Enregistrement automatique
          join_before_host: true,
          mute_participants_on_join: false,
          ...meetingData.settings
        },
        ...meetingData
      };

      const response = await fetch(`${ZOOM_API_BASE}/meetings/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingConfig)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur création réunion:', error);
      throw error;
    }
  },

  // Lister tous les utilisateurs
  async getUsers() {
    try {
      const response = await fetch(`${ZOOM_API_BASE}/users`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      throw error;
    }
  },

  // Obtenir les détails d'une réunion
  async getMeeting(meetingId) {
    try {
      const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération réunion:', error);
      throw error;
    }
  },

  // Supprimer une réunion
  async deleteMeeting(meetingId) {
    try {
      const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression réunion:', error);
      throw error;
    }
  }
};