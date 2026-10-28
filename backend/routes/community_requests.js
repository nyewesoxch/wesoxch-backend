const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// User requests to create a community
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, location_name, latitude, longitude } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });

    // Check no pending request from same user
    const existing = await pool.query(
      `SELECT id FROM community_requests 
       WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending community request. Please wait for approval.'
      });
    }

    const result = await pool.query(
      `INSERT INTO community_requests 
        (user_id, name, description, type, location_name, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, name, description || null, type || 'geographic', location_name || null, latitude || null, longitude || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Request submitted. We will review and create your community shortly.',
      request: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's own requests
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM community_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin — get all pending requests
router.get('/admin/pending', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, u.username, u.full_name, u.phone_number
       FROM community_requests cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.status = 'pending'
       ORDER BY cr.created_at ASC`
    );
    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin — approve and create community
router.post('/admin/approve/:id', authMiddleware, async (req, res) => {
  try {
    const requestResult = await pool.query(
      'SELECT * FROM community_requests WHERE id = $1',
      [req.params.id]
    );
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const req_data = requestResult.rows[0];

    // Create the community
    const communityResult = await pool.query(
      `INSERT INTO communities 
        (name, description, type, location_name, latitude, longitude, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req_data.name, req_data.description, req_data.type, req_data.location_name, req_data.latitude, req_data.longitude, req_data.user_id]
    );

    const community = communityResult.rows[0];

    // Add creator as admin
    await pool.query(
      'INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, $3)',
      [community.id, req_data.user_id, 'admin']
    );

    await pool.query(
      'UPDATE communities SET member_count = 1 WHERE id = $1',
      [community.id]
    );

    // Update request status
    await pool.query(
      "UPDATE community_requests SET status = 'approved' WHERE id = $1",
      [req.params.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Community created',
      community,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin — reject request
router.post('/admin/reject/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE community_requests SET status = 'rejected' WHERE id = $1",
      [req.params.id]
    );
    return res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
