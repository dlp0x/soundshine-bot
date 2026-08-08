import { query } from '../db/pool.js';

export async function getPosts(limit = 10) {
  return query(`
    SELECT
      p.id,
      p.title,
      p.slug,
      p.content,
      p.featured_image,
      p.date_posted,
      p.post_type,
      p.is_featured,
      u.nice_nickname,
      u.avatar
    FROM z_posts p
    LEFT JOIN z_users u ON p.posted_by = u.id
    WHERE p.is_fake = 0
    ORDER BY p.date_posted DESC
    LIMIT ?
  `, [limit]);
}

export async function getPostBySlug(slug) {
  const rows = await query(`
    SELECT
      p.id,
      p.title,
      p.slug,
      p.content,
      p.featured_image,
      p.date_posted,
      p.post_type,
      p.category_id,
      p.tag_id,
      u.nice_nickname,
      u.avatar,
      u.bio,
      u.job_title
    FROM z_posts p
    LEFT JOIN z_users u ON p.posted_by = u.id
    WHERE p.slug   = ?
      AND p.is_fake = 0
    LIMIT 1
  `, [slug]);

  return rows[0] || null;
}
