import { query } from '../db/pool.js';

export async function getShows(parentID) {
  return query(`
    SELECT id, name, description, image, tags
    FROM subcategory_info
    WHERE parentID = ?
    ORDER BY name ASC
  `, [parentID]);
}

export async function getShowById(id) {
  const [show] = await query(`
    SELECT id, name, description, image, tags
    FROM subcategory_info
    WHERE id = ?
    LIMIT 1
  `, [id]);

  if (!show) return null;

  const episodes = await query(`
    SELECT ID, artist, title, image, date_played
    FROM history
    WHERE id_subcat = ?
    ORDER BY date_played DESC
    LIMIT 20
  `, [id]);

  return { show, episodes };
}
