const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const parseImgs = (imgs) => { if (!imgs) return []; if (Array.isArray(imgs)) return imgs.filter(Boolean); return imgs.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean); };
router.get('/', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || q.trim().length < 2) return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    const search = `%${q.trim()}%`;
    const [events, listings, communities, users, rentals] = await Promise.all([
      pool.query("SELECT id, title, location_name, starts_at, is_free, price, cover_url FROM events WHERE status = 'published' AND (title ILIKE $1 OR description ILIKE $1) ORDER BY starts_at ASC LIMIT $2", [search, limit]),
      pool.query('SELECT l.id, l.title, l.price, l.price_type, l.images, l.location_name, l.category, u.username AS seller_username FROM listings l JOIN users u ON l.created_by = u.id WHERE l.is_available = TRUE AND (l.title ILIKE $1 OR l.description ILIKE $1) ORDER BY l.created_at DESC LIMIT $2', [search, limit]),
      pool.query('SELECT id, name, description, avatar_url, member_count, type, location_name FROM communities WHERE is_public = TRUE AND (name ILIKE $1 OR description ILIKE $1) ORDER BY member_count DESC LIMIT $2', [search, limit]),
      pool.query('SELECT id, username, full_name, avatar_url, is_seller, location_name FROM users WHERE is_active = TRUE AND is_email_verified = TRUE AND (username ILIKE $1 OR full_name ILIKE $1) ORDER BY created_at DESC LIMIT $2', [search, limit]),
      pool.query('SELECT id, title, rent_amount, property_type, area_name, location_name, images FROM rentals WHERE is_available = TRUE AND (title ILIKE $1 OR area_name ILIKE $1) ORDER BY created_at DESC LIMIT $2', [search, limit]),
    ]);
    return res.status(200).json({ success: true, query: q, results: { events: events.rows, listings: listings.rows.map(l => ({...l, images: parseImgs(l.images)})), communities: communities.rows, users: users.rows, rentals: rentals.rows.map(r => ({...r, images: parseImgs(r.images)})) } });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
