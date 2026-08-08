import { query } from '../db/pool.js';
import { env } from '../config/env.js';

// GET /api/requests — site web (top 4 avec username)
export async function getPendingRequests() {
  return query(`
    SELECT
      songs.ID,
      songs.artist,
      songs.title,
      songs.image,
      requests.username,
      requests.requested,
      COUNT(*) AS requests
    FROM songs
    INNER JOIN requests ON songs.ID = requests.songID
    WHERE TIMESTAMPDIFF(DAY, requests.requested, NOW()) <= 365
      AND requests.PLAYED = 0
    GROUP BY
      songs.ID,
      songs.artist,
      songs.title,
      songs.image,
      requests.username,
      requests.requested
    ORDER BY requests DESC
    LIMIT 4
  `);
}

// GET /api/requests/list — bot Discord (25 dernières)
export async function listRequests() {
  return query(`
    SELECT
      songs.ID,
      songs.artist,
      songs.title,
      requests.username,
      requests.requested
    FROM songs
    INNER JOIN requests ON songs.ID = requests.songID
    WHERE TIMESTAMPDIFF(DAY, requests.requested, NOW()) <= 365
      AND requests.PLAYED = 0
    ORDER BY requests.requested DESC
    LIMIT 25
  `);
}

// POST /api/requests/add — bot Discord
export async function addRequest(songID, username) {
  // Vérifier que la chanson existe
  const [song] = await query(`
    SELECT ID, artist, title FROM songs
    WHERE ID = ? AND enabled = 1
    LIMIT 1
  `, [songID]);

  if (!song) {
    return { success: false, reason: 'not_found' };
  }

  // Vérifier le cooldown (configurable via REQUEST_COOLDOWN_HOURS)
  const [{ total }] = await query(`
    SELECT COUNT(*) AS total
    FROM requests
    WHERE songID   = ?
      AND username = ?
      AND PLAYED   = 0
      AND TIMESTAMPDIFF(HOUR, requested, NOW()) < ?
  `, [songID, username, env.requestCooldownHours]);

  if (total > 0) {
    return { success: false, reason: 'already_requested' };
  }

  await query(`
    INSERT INTO requests (songID, username, requested, PLAYED)
    VALUES (?, ?, NOW(), 0)
  `, [songID, username]);

  return { success: true, song };
}
