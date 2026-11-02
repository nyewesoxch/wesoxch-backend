const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// A membership counts only while it is switched on and has not run out.
const ACTIVE = 'ps.is_active = TRUE AND (ps.expires_at IS NULL OR ps.expires_at > NOW())';

const parseImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  return String(images).replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

// Is the signed-in person premium?
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ps.expires_at FROM premium_subscriptions ps WHERE ps.user_id = $1 AND ${ACTIVE}`,
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      is_premium: r.rows.length > 0,
      expires_at: r.rows[0]?.expires_at || null,
    });
  } catch (err) {
    console.error('Premium status error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// A seller's store: their profile and everything they have for sale
router.get('/store/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').toLowerCase().trim();

    const sellerRes = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url, u.seller_bio, u.seller_whatsapp, u.location_name
       FROM users u
       WHERE u.username = $1 AND u.is_active = TRUE
         AND EXISTS (SELECT 1 FROM premium_subscriptions ps WHERE ps.user_id = u.id AND ${ACTIVE})`,
      [username]
    );
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'This seller does not have a store.' });
    }
    const seller = sellerRes.rows[0];

    const listingsRes = await pool.query(
      `SELECT id, title, description, category, price, price_type, images, location_name, view_count, created_at
       FROM listings
       WHERE created_by = $1 AND is_available = TRUE
       ORDER BY created_at DESC LIMIT 50`,
      [seller.id]
    );
    const listings = listingsRes.rows.map(l => ({ ...l, images: parseImages(l.images) }));

    return res.status(200).json({ success: true, seller, listings, total: listings.length });
  } catch (err) {
    console.error('Store error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
