const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// How many different people must report a message before it is hidden for everyone.
// 1 = hidden as soon as anyone reports it. Change to 3 if reports get abused.
const HIDE_AFTER_REPORTS = 1;
const REASONS = ['spam', 'harassment', 'other'];
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');

// Report a chat message
router.post('/messages/:id/report', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid message' });
    const reason = REASONS.includes(req.body.reason) ? req.body.reason : 'other';

    const msg = await pool.query('SELECT user_id, community_id FROM community_messages WHERE id = $1', [req.params.id]);
    if (msg.rows.length === 0) return res.status(404).json({ success: false, message: 'Message not found' });
    if (msg.rows[0].user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot report your own message' });
    }

    const member = await pool.query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
      [msg.rows[0].community_id, req.user.id]
    );
    if (member.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Join this community to report its messages' });
    }

    const already = await pool.query(
      "SELECT 1 FROM reports WHERE reporter_id = $1 AND content_type = 'message' AND content_id = $2",
      [req.user.id, req.params.id]
    );
    if (already.rows.length === 0) {
      await pool.query(
        "INSERT INTO reports (reporter_id, content_type, content_id, reason, details) VALUES ($1, 'message', $2, $3, $4)",
        [req.user.id, req.params.id, reason, req.body.details || null]
      );
    }

    const count = await pool.query(
      "SELECT COUNT(DISTINCT reporter_id)::int AS n FROM reports WHERE content_type = 'message' AND content_id = $1",
      [req.params.id]
    );
    const hidden = count.rows[0].n >= HIDE_AFTER_REPORTS;
    if (hidden) await pool.query('UPDATE community_messages SET is_hidden = TRUE WHERE id = $1', [req.params.id]);

    return res.status(200).json({ success: true, hidden });
  } catch (err) {
    console.error('Report error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Block a person
router.post('/blocks/:userId', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.userId)) return res.status(400).json({ success: false, message: 'Invalid person' });
    if (req.params.userId === req.user.id) return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    await pool.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.userId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Block error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unblock
router.delete('/blocks/:userId', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.userId)) return res.status(400).json({ success: false, message: 'Invalid person' });
    await pool.query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.user.id, req.params.userId]);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List the people you have blocked
router.get('/blocks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name FROM user_blocks b
       JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, blocked: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
