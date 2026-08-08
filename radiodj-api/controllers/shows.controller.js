import { getShows, getShowById } from '../services/shows.service.js';

export async function shows(req, res) {
  const parentID = parseInt(req.query.parentID);
  if (!parentID) return res.status(400).json({ error: 'parentID is required' });

  const data = await getShows(parentID);
  res.json({ shows: data });
}

export async function showDetails(req, res) {
  const data = await getShowById(parseInt(req.params.id));
  if (!data) return res.status(404).json({ error: 'Show not found' });
  res.json(data);
}
