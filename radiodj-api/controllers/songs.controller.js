import { getNowPlaying, getHistory, getTopTracks } from '../services/songs.service.js';

export async function nowPlaying(req, res) {
  const data = await getNowPlaying();
  if (!data) return res.status(404).json({ error: 'No data available' });
  res.json({ nowPlaying: data });
}

export async function history(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const data = await getHistory(limit);
  res.json({ history: data });
}

export async function topTracks(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const data = await getTopTracks(limit);
  res.json({ topTracks: data });
}
