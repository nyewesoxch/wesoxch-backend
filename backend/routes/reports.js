const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content_type, content_id, reason, details } = req.body;
    if (!content_type || !content_id || !reason) return res.status(400).json({ success: false, message: 'Required fields missing' });
    const existing = await pool.query('SELECT id FROM reports WHERE reporter_id = $1 AND content_type = $2 AND content_id = $3', [req.user.id, content_type, content_id]);
    if (existing.rows.length > 0) return res.status(409).json({ success: false, message: 'Already reported' });
    await pool.query('INSERT INTO reports (reporter_id, content_type, content_id, reason, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id, content_type, content_id, reason, details||null]);
    return res.status(201).json({ success: true, message: 'Report submitted.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
