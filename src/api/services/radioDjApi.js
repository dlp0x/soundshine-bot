import axios from 'axios';
import config from '../../bot/config.js';

function getApiConfig () {
  const baseUrl = config.RADIODJ_API_URL || config.api?.radioDjUrl;
  const apiKey = config.RADIODJ_API_KEY || config.api?.radioDjKey;

  if (!baseUrl || !apiKey) {
    throw new Error('RadioDJ API is not configured (RADIODJ_API_URL / RADIODJ_API_KEY)');
  }

  return { baseUrl, apiKey };
}

/**
 * GET /requests/list - reserve au bot (25 dernieres requests en attente)
 */
export async function listRequests () {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.get(`${baseUrl}/requests/list`, {
    headers: { 'x-api-key': apiKey },
    timeout: 10000
  });

  return data?.requests || [];
}

/**
 * POST /requests/add - reserve au bot
 * @param {{ songID: number, username: string }} params
 */
export async function addRequest ({ songID, username }) {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.post(
    `${baseUrl}/requests/add`,
    { songID, username },
    {
      headers: { 'x-api-key': apiKey },
      timeout: 10000
    }
  );

  return data?.song;
}

/**
 * GET /requests/search - reserve au bot
 * Note: la limite de resultats est fixee cote serveur (10), le parametre
 * limit n'est pas transmis a l'API et est applique cote client.
 */
export async function searchSongs (query, limit = 10) {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.get(`${baseUrl}/requests/search`, {
    headers: { 'x-api-key': apiKey },
    params: { query },
    timeout: 10000
  });

  const results = data?.results || [];
  return typeof limit === 'number' ? results.slice(0, limit) : results;
}

/**
 * GET /events?catID=
 */
export async function getEvents (catID) {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.get(`${baseUrl}/events`, {
    headers: { 'x-api-key': apiKey },
    params: { catID },
    timeout: 10000
  });

  return data?.events || [];
}

/**
 * GET /events/schedule?day=&catID=
 */
export async function getEventsSchedule (day, catID) {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.get(`${baseUrl}/events/schedule`, {
    headers: { 'x-api-key': apiKey },
    params: { day, catID },
    timeout: 10000
  });

  return data?.schedule || [];
}
