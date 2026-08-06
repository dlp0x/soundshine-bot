import axios from 'axios';
import config from '../../bot/config.js';

function getApiConfig() {
  const baseUrl = config.RADIODJ_API_URL || config.api?.radioDjUrl;
  const apiKey  = config.RADIODJ_API_KEY  || config.api?.radioDjKey;

  if (!baseUrl || !apiKey) {
    throw new Error('RadioDJ API is not configured (RADIODJ_API_URL / RADIODJ_API_KEY)');
  }

  return { baseUrl, apiKey };
}

// GET /api/requests/list
export async function listRequests() {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.get(`${baseUrl}/requests/list`, {
    headers: { 'x-api-key': apiKey },
    timeout: 10000
  });

  return data?.requests || [];
}

// POST /api/requests/add
export async function addRequest({ artist, title, requestedBy }) {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.post(
    `${baseUrl}/requests/add`,
    { artist, title, username: requestedBy },
    {
      headers: { 'x-api-key': apiKey },
      timeout: 10000
    }
  );

  return data;
}

// GET /api/requests/search?query=
export async function searchSongs(query, limit = 10) {
  const { baseUrl, apiKey } = getApiConfig();
  const { data } = await axios.get(`${baseUrl}/requests/search`, {
    headers: { 'x-api-key': apiKey },
    params: { query, limit },   // ✅ query au lieu de q
    timeout: 10000
  });

  return data?.results || [];   // ✅ results au lieu de songs
}