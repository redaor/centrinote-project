/**
 * 🎥 Module pour récupérer les URLs de téléchargement des enregistrements Daily.co
 *
 * Daily.co ne fournit pas directement les URLs de téléchargement dans la liste des recordings.
 * Il faut appeler l'endpoint `/access-link` pour chaque recording_id.
 *
 * IMPORTANT : Les URLs générées expirent après 24 heures.
 */

/**
 * Récupère l'URL de téléchargement pour un enregistrement Daily.co
 *
 * @param {string} recordingId - L'ID de l'enregistrement (ex: "00804909-b1e4-4668-a610-8d5594ef0709")
 * @returns {Promise<{download_url: string, expires_at: number}>} - URL de téléchargement et timestamp d'expiration
 * @throws {Error} - Si l'API Daily.co retourne une erreur
 *
 * @example
 * const { download_url, expires_at } = await getDownloadUrl("00804909-b1e4-4668-a610-8d5594ef0709");
 * console.log("URL valide jusqu'à:", new Date(expires_at * 1000));
 */
async function getDownloadUrl(recordingId) {
  const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.VITE_DAILY_API_KEY;

  // Validation des paramètres
  if (!recordingId) {
    throw new Error('recordingId est requis');
  }

  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY non configurée. Veuillez configurer la variable d\'environnement DAILY_API_KEY.');
  }

  const url = `https://api.daily.co/v1/recordings/${recordingId}/access-link`;

  console.log(`📡 [DAILY-RECORDINGS] Récupération access-link pour recording ${recordingId}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Gestion des erreurs HTTP
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');

      switch (response.status) {
        case 404:
          // L'enregistrement n'existe pas ou n'est pas encore prêt
          throw new Error(`Recording ${recordingId} non trouvé ou pas encore disponible (Daily.co peut prendre 2-5 minutes pour traiter l'enregistrement)`);

        case 403:
          // Clé API invalide ou permissions insuffisantes
          throw new Error('DAILY_API_KEY invalide ou permissions insuffisantes. Vérifiez votre clé API Daily.co.');

        case 401:
          // Non autorisé (clé manquante ou invalide)
          throw new Error('Authentification échouée. Vérifiez que DAILY_API_KEY est correcte.');

        case 429:
          // Rate limit dépassé
          throw new Error('Rate limit Daily.co dépassé. Attendez quelques secondes avant de réessayer.');

        case 500:
        case 502:
        case 503:
          // Erreur serveur Daily.co
          throw new Error(`Erreur serveur Daily.co (${response.status}). Réessayez dans quelques instants.`);

        default:
          throw new Error(`Erreur Daily.co API (${response.status}): ${errorText || 'Erreur inconnue'}`);
      }
    }

    // Parse la réponse JSON
    const data = await response.json();

    // Validation de la réponse
    if (!data.download_link) {
      throw new Error('La réponse de Daily.co ne contient pas de download_link');
    }

    // Daily.co retourne "download_link" mais on normalise en "download_url"
    const result = {
      download_url: data.download_link,
      expires_at: data.expires || data.expires_at || Math.floor(Date.now() / 1000) + 86400 // Par défaut 24h
    };

    const expiresDate = new Date(result.expires_at * 1000);
    console.log(`✅ [DAILY-RECORDINGS] URL récupérée avec succès pour ${recordingId}`);
    console.log(`⏰ [DAILY-RECORDINGS] URL valide jusqu'à: ${expiresDate.toLocaleString('fr-FR')}`);

    return result;

  } catch (error) {
    // Si c'est déjà une erreur que nous avons lancée, la re-lancer
    if (error.message.includes('Recording') ||
        error.message.includes('DAILY_API_KEY') ||
        error.message.includes('Rate limit') ||
        error.message.includes('Erreur serveur')) {
      console.error(`❌ [DAILY-RECORDINGS] ${error.message}`);
      throw error;
    }

    // Erreur réseau ou autre
    console.error('❌ [DAILY-RECORDINGS] Erreur réseau ou serveur:', error);
    throw new Error(`Impossible de contacter Daily.co API: ${error.message}`);
  }
}

/**
 * Récupère les URLs de téléchargement pour plusieurs enregistrements en parallèle
 *
 * @param {string[]} recordingIds - Tableau d'IDs d'enregistrements
 * @returns {Promise<Array<{recordingId: string, download_url?: string, expires_at?: number, error?: string}>>}
 *
 * @example
 * const results = await getBatchDownloadUrls(["id1", "id2", "id3"]);
 * results.forEach(r => {
 *   if (r.error) console.error(`Erreur ${r.recordingId}:`, r.error);
 *   else console.log(`URL ${r.recordingId}:`, r.download_url);
 * });
 */
async function getBatchDownloadUrls(recordingIds) {
  console.log(`📦 [DAILY-RECORDINGS] Récupération batch de ${recordingIds.length} URLs...`);

  const results = await Promise.allSettled(
    recordingIds.map(async (recordingId) => {
      try {
        const { download_url, expires_at } = await getDownloadUrl(recordingId);
        return { recordingId, download_url, expires_at };
      } catch (error) {
        return { recordingId, error: error.message };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        recordingId: recordingIds[index],
        error: result.reason?.message || 'Erreur inconnue'
      };
    }
  });
}

/**
 * Vérifie si une URL de téléchargement est encore valide
 *
 * @param {number} expiresAt - Timestamp d'expiration (en secondes depuis epoch)
 * @returns {boolean} - true si l'URL est encore valide
 */
function isUrlValid(expiresAt) {
  const now = Math.floor(Date.now() / 1000);
  return expiresAt > now;
}

/**
 * Calcule le temps restant avant expiration d'une URL
 *
 * @param {number} expiresAt - Timestamp d'expiration (en secondes depuis epoch)
 * @returns {string} - Temps restant formaté (ex: "23h 45min")
 */
function getTimeUntilExpiration(expiresAt) {
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = expiresAt - now;

  if (secondsLeft <= 0) {
    return 'Expiré';
  }

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

module.exports = {
  getDownloadUrl,
  getBatchDownloadUrls,
  isUrlValid,
  getTimeUntilExpiration
};
