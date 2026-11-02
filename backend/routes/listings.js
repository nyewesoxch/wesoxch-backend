const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Free sellers can keep this many photos across all their listings.
// Premium sellers have no limit. Change the number here to change the rule.
const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS_PER_LISTING = 4;

// True when the seller has a store (an active premium membership)
const PREMIUM_SQL = "EXISTS (SELECT 1 FROM premium_subscriptions ps WHERE ps.user_id = l.created_by AND ps.is_active = TRUE AND (ps.expires_at IS NULL OR ps.expires_at > NOW()))";

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
const parseImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  return String(images).replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

const isPremium = async (userId) => {
  const r = await pool.query(
    'SELECT 1 FROM premium_subscriptions WHERE user_id = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())',
    [userId]
  );
  return r.rows.length > 0;
};

const photosUsed = async (userId) => {
  const r = await pool.query(
    'SELECT COALESCE(SUM(COALESCE(array_length(images, 1), 0)), 0)::int AS n FROM listings WHERE created_by = $1',
    [userId]
  );
  return r.rows[0].n;
};

const getAllowance = async (userId) => {
  const premium = await isPremium(userId);
  const used = await photosUsed(userId);
  return {
    premium,
    limit: FREE_PHOTO_LIMIT,
    used,
    remaining: premium ? null : Math.max(FREE_PHOTO_LIMIT - used, 0),
  };
};

// How many free photos this person has left
router.get('/allowance', authMiddleware, async (req, res) => {
  try {
    const allowance = await getAllowance(req.user.id);
    return res.status(200).json({ success: true, ...allowance });
  } catch (err) {
    console.error('Allowance error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Browse listings
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    const lim = Math.min(parseInt(req.query.limit) || 30, 50);
    const off = ((parseInt(req.query.page) || 1) - 1) * lim;
    const conditions = ['l.is_available = TRUE'];
    const params = [];
    let i = 1;
    if (search) { conditions.push(`(l.title ILIKE $${i} OR l.description ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (category) { conditions.push(`l.category = $${i++}`); params.push(category); }
    params.push(lim, off);
    const result = await pool.query(
      `SELECT l.*, u.username AS seller_username, u.full_name AS seller_name, u.phone AS seller_phone, u.seller_whatsapp, ${PREMIUM_SQL} AS seller_premium
       FROM listings l LEFT JOIN users u ON l.created_by = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      params
    );
    return res.status(200).json({ success: true, listings: result.rows.map(l => ({ ...l, images: parseImages(l.images) })) });
  } catch (err) {
    console.error('Listings error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a listing
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, price, price_type, latitude, longitude, location_name } = req.body;
    const images = Array.isArray(req.body.images) ? req.body.images.filter(u => typeof u === 'string' && u) : [];

    if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Give your listing a title' });
    if (images.length > MAX_PHOTOS_PER_LISTING) {
      return res.status(400).json({ success: false, message: `A listing can have up to ${MAX_PHOTOS_PER_LISTING} photos` });
    }

    const allowance = await getAllowance(req.user.id);
    if (!allowance.premium && images.length > allowance.remaining) {
      const message = allowance.remaining === 0
        ? `You have used your ${FREE_PHOTO_LIMIT} free photos. Premium memberships are coming soon. You can also delete an older listing to free some up.`
        : `You have ${allowance.remaining} free photo${allowance.remaining === 1 ? '' : 's'} left. Remove a photo, or delete an older listing to make room.`;
      return res.status(403).json({ success: false, code: 'IMAGE_LIMIT', message, ...allowance });
    }

    const result = await pool.query(
      `INSERT INTO listings (title, description, category, price, price_type, latitude, longitude, location_name, created_by, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title.trim(), description || null, category || null, parseFloat(price) || 0, price_type || 'fixed',
       latitude || null, longitude || null, location_name || null, req.user.id, images.length > 0 ? images : null]
    );
    const listing = result.rows[0];
    listing.images = parseImages(listing.images);
    return res.status(201).json({ success: true, listing });
  } catch (err) {
    console.error('Create listing error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// My own listings
router.get('/user/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE created_by = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.status(200).json({ success: true, listings: result.rows.map(l => ({ ...l, images: parseImages(l.images) })) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// One listing
router.get('/:id', async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid listing' });
    const result = await pool.query(
      `SELECT l.*, u.username AS seller_username, u.full_name AS seller_name, u.phone AS seller_phone, u.seller_whatsapp, ${PREMIUM_SQL} AS seller_premium
       FROM listings l LEFT JOIN users u ON l.created_by = u.id WHERE l.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Listing not found' });
    await pool.query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);
    const listing = result.rows[0];
    listing.images = parseImages(listing.images);
    return res.status(200).json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Edit (hide, show, change details)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid listing' });
    const { title, description, category, price, price_type, is_available, location_name } = req.body;
    const existing = await pool.query('SELECT created_by FROM listings WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (existing.rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, message: 'This is not your listing' });
    const result = await pool.query(
      `UPDATE listings SET title=COALESCE($1,title), description=COALESCE($2,description), category=COALESCE($3,category),
       price=COALESCE($4,price), price_type=COALESCE($5,price_type), is_available=COALESCE($6,is_available),
       location_name=COALESCE($7,location_name), updated_at=NOW() WHERE id=$8 RETURNING *`,
      [title, description, category, price, price_type, is_available, location_name, req.params.id]
    );
    const listing = result.rows[0];
    listing.images = parseImages(listing.images);
    return res.status(200).json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete (this also frees up its photos)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid listing' });
    const existing = await pool.query('SELECT created_by FROM listings WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (existing.rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, message: 'This is not your listing' });
    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
