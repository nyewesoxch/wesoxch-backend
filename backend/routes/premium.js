const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Check if user is premium
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM premium_subscriptions WHERE user_id = $1 AND is_active = TRUE',
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      is_premium: result.rows.length > 0,
      subscription: result.rows[0] || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get seller storefront
router.get('/store/:username', async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, username, full_name, bio, avatar_url, 
              seller_bio, seller_whatsapp, location_name, is_seller
       FROM users WHERE username = $1 AND is_seller = TRUE AND is_active = TRUE`,
      [req.params.username.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const seller = userResult.rows[0];

    // Check if premium
    const premiumResult = await pool.query(
      'SELECT is_active FROM premium_subscriptions WHERE user_id = $1 AND is_active = TRUE',
      [seller.id]
    );

    if (premiumResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'This seller does not have a storefront yet' });
    }

    // Get all their listings
    const listingsResult = await pool.query(
      `SELECT id, title, description, category, price, price_type, 
              images, location_name, view_count, created_at
       FROM listings 
       WHERE created_by = $1 AND is_available = TRUE 
       ORDER BY created_at DESC`,
      [seller.id]
    );

    return res.status(200).json({
      success: true,
      seller,
      listings: listingsResult.rows,
      total_listings: listingsResult.rows.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
