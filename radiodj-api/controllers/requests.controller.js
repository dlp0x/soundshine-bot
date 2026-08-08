import { getPendingRequests, listRequests, addRequest } from '../services/requests.service.js';
import { searchSongs } from '../services/songs.service.js';

// GET /api/requests — site web
export async function getRequests(req, res) {
  const data = await getPendingRequests();
  res.json({ requests: data });
}

// GET /api/requests/search?query= — bot Discord
export async function search(req, res) {
  const q = (req.query.query || '').trim();

  if (q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  console.log(`[SEARCH] "${q}"`);
  const results = await searchSongs(q);
  console.log(`[SEARCH] "${q}" → ${results.length} result(s)`);

  res.json({ results });
}

// GET /api/requests/list — bot Discord
export async function list(req, res) {
  const data = await listRequests();
  console.log(`[LIST] ${data.length} pending request(s)`);
  res.json({ requests: data });
}

// POST /api/requests/add — bot Discord
export async function add(req, res) {
  const { songID, username } = req.body;

  if (!songID || !username) {
    return res.status(400).json({ error: 'songID and username are required' });
  }

  console.log(`[ADD] songID=${songID} by "${username}"`);
  const result = await addRequest(parseInt(songID), String(username));

  if (result.reason === 'not_found') {
    console.log(`[ADD] Not found: songID=${songID}`);
    return res.status(404).json({ error: 'Song not found' });
  }

  if (result.reason === 'already_requested') {
    console.log(`[ADD] Duplicate: songID=${songID} by "${username}"`);
    return res.status(409).json({ error: 'Already requested in the last cooldown period' });
  }

  console.log(`[ADD] Success: ${result.song.artist} - ${result.song.title} by "${username}"`);
  res.status(201).json({ success: true, song: result.song });
}
