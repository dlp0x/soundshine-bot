import { query } from '../db/pool.js';

export async function getEvents(catID) {
  return query(`
    SELECT
      e.id,
      e.name,
      e.image,
      e.tags,
      e.scheduleDay  AS day,
      e.scheduleTime AS time
    FROM events_info e
    INNER JOIN subcategory_info s ON e.id_subcat = s.id
    WHERE s.parentID = ?
    ORDER BY e.scheduleDay ASC, e.scheduleTime ASC
  `, [catID]);
}

export async function getSchedule(day, catID) {
  return query(`
    SELECT
      e.id,
      e.name,
      e.image,
      e.tags,
      e.scheduleTime AS time
    FROM events_info e
    INNER JOIN subcategory_info s ON e.id_subcat = s.id
    WHERE e.scheduleDay = ?
      AND s.parentID   = ?
    ORDER BY e.scheduleTime ASC
  `, [day, catID]);
}
