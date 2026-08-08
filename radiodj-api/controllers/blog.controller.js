import { getPosts, getPostBySlug } from '../services/blog.service.js';

export async function posts(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const data = await getPosts(limit);
  res.json({ posts: data });
}

export async function postDetails(req, res) {
  const data = await getPostBySlug(req.params.slug);
  if (!data) return res.status(404).json({ error: 'Post not found' });
  res.json({ post: data });
}
