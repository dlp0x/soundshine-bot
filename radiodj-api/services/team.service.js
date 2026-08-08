import { query } from '../db/pool.js';

// Colonnes publiques uniquement (pas password, last_login, etc.)
const PUBLIC_FIELDS = `
  id,
  username,
  nice_nickname,
  first_name,
  last_name,
  job_title,
  bio,
  avatar,
  background_image,
  fav_quote,
  email,
  facebook,
  instagram,
  twitter,
  twitch,
  tiktok,
  snapchat,
  discord,
  linkedin
`;

export async function getTeam() {
  return query(`
    SELECT ${PUBLIC_FIELDS}
    FROM z_users
    WHERE is_fake = 0
    ORDER BY id ASC
  `);
}

export async function getMemberById(id) {
  const rows = await query(`
    SELECT ${PUBLIC_FIELDS}
    FROM z_users
    WHERE id      = ?
      AND is_fake = 0
    LIMIT 1
  `, [id]);

  const member = rows[0];
  if (!member) return null;

  const posts = await query(`
    SELECT id, title, slug, featured_image, date_posted
    FROM z_posts
    WHERE posted_by = ?
      AND is_fake   = 0
    ORDER BY date_posted DESC
  `, [id]);

  return { member, posts };
}
