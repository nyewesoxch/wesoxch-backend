const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const parseImages = (images) => { if (!images) return []; if (Array.isArray(images)) return images.filter(Boolean); return images.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean); };
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, bio, phone, latitude, longitude, location_name } = req.body;
    const result = await pool.query('UPDATE users SET full_name=CASE WHEN $1::text IS NOT NULL THEN $1 ELSE full_name END, bio=CASE WHEN $2::text IS NOT NULL THEN $2 ELSE bio END, phone=CASE WHEN $3::text IS NOT NULL THEN $3 ELSE phone END, latitude=CASE WHEN $4::numeric IS NOT NULL THEN $4 ELSE latitude END, longitude=CASE WHEN $5::numeric IS NOT NULL THEN $5 ELSE longitude END, location_name=CASE WHEN $6::text IS NOT NULL THEN $6 ELSE location_name END, updated_at=NOW() WHERE id=$7 RETURNING id, username, email, full_name, bio, phone, avatar_url, latitude, longitude, location_name, is_verified, is_seller, seller_bio, seller_whatsapp, age, created_at', [full_name||null, bio||null, phone||null, latitude||null, longitude||null, location_name||null, req.user.id]);
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/become-seller', authMiddleware, async (req, res) => {
  try {
    const { seller_bio, seller_whatsapp } = req.body;
    if (!seller_whatsapp) return res.status(400).json({ success: false, message: 'WhatsApp number required' });
    const result = await pool.query('UPDATE users SET is_seller=TRUE, seller_bio=$1, seller_whatsapp=$2, updated_at=NOW() WHERE id=$3 RETURNING id, username, email, full_name, bio, phone, avatar_url, is_verified, is_seller, seller_bio, seller_whatsapp, age, created_at', [seller_bio||null, seller_whatsapp, req.user.id]);
    return res.status(200).json({ success: true, message: 'You are now a seller!', user: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name, bio, avatar_url, location_name, is_seller, is_verified, seller_bio, seller_whatsapp, created_at FROM users WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.id !== req.params.id) await pool.query('INSERT INTO profile_views (viewed_user_id, viewer_user_id, viewed_at) VALUES ($1,$2,NOW()) ON CONFLICT (viewed_user_id, viewer_user_id) DO UPDATE SET viewed_at = NOW()', [req.params.id, req.user.id]);
    const listings = await pool.query('SELECT id, title, price, price_type, images, location_name FROM listings WHERE created_by = $1 AND is_available = TRUE ORDER BY created_at DESC LIMIT 6', [req.params.id]);
    const events = await pool.query("SELECT id, title, starts_at, location_name, is_free, price, cover_url FROM events WHERE created_by = $1 AND status = 'published' ORDER BY starts_at ASC LIMIT 6", [req.params.id]);
    return res.status(200).json({ success: true, user: result.rows[0], listings: listings.rows.map(l => ({...l, images: parseImages(l.images)})), events: events.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
