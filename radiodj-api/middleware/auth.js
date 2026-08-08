import { env } from '../config/env.js';

// Valide la clé API et attache le "caller" à la requête (site | bot)
export function authenticate(req, res, next) {
  const key = req.headers['x-api-key'];

  if (!key) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  if (key === env.apiKeys.site) {
    req.caller = 'site';
    return next();
  }

  if (key === env.apiKeys.bot) {
    req.caller = 'bot';
    return next();
  }

  return res.status(401).json({ error: 'Invalid API key' });
}

// Réserve une route au bot uniquement
export function botOnly(req, res, next) {
  if (req.caller !== 'bot') {
    return res.status(403).json({ error: 'This endpoint is reserved for the Discord bot' });
  }
  next();
}
