const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { approveRequest, rejectRequest } = require('../utils/communityApproval');

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
const TYPES = ['geographic', 'interest', 'activity'];

// Ask for a new community (it goes live once an admin approves it)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, location_name, latitude, longitude, avatar_url } = req.body;
    const cleanName = String(name || '').trim();
    if (!cleanName) return res.status(400).json({ success: false, message: 'Give your community a name' });
    if (cleanName.length > 100) return res.status(400).json({ success: false, message: 'The name can be up to 100 characters' });

    const pending = await pool.query("SELECT 1 FROM community_requests WHERE user_id = $1 AND status = 'pending'", [req.user.id]);
    if (pending.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have a community waiting for approval. Please wait for that one first.' });
    }

    const photo = typeof avatar_url === 'string' && avatar_url.startsWith('/uploads/') ? avatar_url : null;
    const result = await pool.query(
      `INSERT INTO community_requests (user_id, name, description, type, location_name, latitude, longitude, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, cleanName, description || null, TYPES.includes(type) ? type : 'geographic',
       location_name || null, latitude || null, longitude || null, photo]
    );
    return res.status(201).json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('Community request error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// My own requests, newest first
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, status, created_at FROM community_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin only: requests waiting for a decision
router.get('/admin/pending', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, u.username, u.full_name, u.phone_number
       FROM community_requests cr JOIN users u ON cr.user_id = u.id
       WHERE cr.status = 'pending' ORDER BY cr.created_at ASC`
    );
    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/admin/approve/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request' });
    const community = await approveRequest(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'No pending request with that id' });
    return res.status(200).json({ success: true, community });
  } catch (err) {
    console.error('Approve error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/admin/reject/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request' });
    const done = await rejectRequest(req.params.id);
    if (!done) return res.status(404).json({ success: false, message: 'No pending request with that id' });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
