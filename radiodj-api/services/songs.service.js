import { query } from '../db/pool.js';

export async function getNowPlaying() {
  const rows = await query(`
    SELECT artist, title, image, date_played
    FROM history
    ORDER BY date_played DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

export async function getHistory(limit = 10) {
  return query(`
    SELECT artist, title, image, date_played
    FROM history
    ORDER BY date_played DESC
    LIMIT ?
  `, [limit]);
}

export async function getTopTracks(limit = 10) {
  return query(`
    SELECT ID, artist, title, image, count_played
    FROM songs
    WHERE enabled = 1
    ORDER BY count_played DESC
    LIMIT ?
  `, [limit]);
}

export async function searchSongs(searchQuery) {
  const like = `%${searchQuery}%`;
  return query(`
    SELECT ID, artist, title, image
    FROM songs
    WHERE enabled   = 1
      AND id_subcat = 0
      AND (artist LIKE ? OR title LIKE ?)
    ORDER BY artist ASC, title ASC
    LIMIT 10
  `, [like, like]);
}
