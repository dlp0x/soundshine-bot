import { getEvents, getSchedule } from '../services/events.service.js';

export async function events(req, res) {
  const catID = parseInt(req.query.catID);
  if (!catID) return res.status(400).json({ error: 'catID is required' });

  const data = await getEvents(catID);
  res.json({ events: data });
}

export async function schedule(req, res) {
  const { day, catID } = req.query;
  if (!day || !catID) return res.status(400).json({ error: 'day and catID are required' });

  const data = await getSchedule(day, parseInt(catID));
  res.json({ schedule: data });
}
