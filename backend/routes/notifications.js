const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
router.post('/token', authMiddleware, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    await pool.query('INSERT INTO push_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (user_id, token) DO NOTHING', [req.user.id, token, platform||'android']);
    return res.status(200).json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [req.user.id]);
    return res.status(200).json({ success: true, notifications: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    return res.status(200).json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/mark-read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    return res.status(200).json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
