const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { sendPushNotification } = require('../utils/pushNotification');

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');

const COLUMNS = 'cm.id, cm.message, cm.created_at, u.id AS user_id, u.username, u.full_name, u.avatar_url';
// Hides reported messages and anyone the reader has blocked ($2 = reader's id)
const VISIBLE = 'cm.is_hidden = FALSE AND cm.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $2)';

// Read messages. Members get the latest 100; non-members get a 5-message read-only preview.
router.get('/:communityId', authMiddleware, async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!isUuid(communityId)) return res.status(400).json({ success: false, message: 'Invalid community' });

    const community = await pool.query('SELECT is_public FROM communities WHERE id = $1', [communityId]);
    if (community.rows.length === 0) return res.status(404).json({ success: false, message: 'Community not found' });

    const member = await pool.query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, req.user.id]
    );
    const isMember = member.rows.length > 0;

    if (!isMember && !community.rows[0].is_public) {
      return res.status(403).json({ success: false, message: 'This community is private' });
    }

    const limit = isMember ? 100 : 5;
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM community_messages cm JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 AND ${VISIBLE}
       ORDER BY cm.created_at DESC LIMIT ${limit}`,
      [communityId, req.user.id]
    );

    if (isMember) {
      await pool.query(
        `INSERT INTO community_last_read (user_id, community_id, last_read_at) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, community_id) DO UPDATE SET last_read_at = NOW()`,
        [req.user.id, communityId]
      );
    }

    return res.status(200).json({ success: true, is_member: isMember, messages: result.rows.reverse() });
  } catch (err) {
    console.error('Chat read error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send a message (members only)
router.post('/:communityId', authMiddleware, async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!isUuid(communityId)) return res.status(400).json({ success: false, message: 'Invalid community' });

    const body = (req.body.message || '').trim();
    if (!body) return res.status(400).json({ success: false, message: 'Write something first' });
    if (body.length > 500) return res.status(400).json({ success: false, message: 'Messages can be up to 500 characters' });

    const member = await pool.query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, req.user.id]
    );
    if (member.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Join this community to write messages' });
    }

    const result = await pool.query(
      'INSERT INTO community_messages (community_id, user_id, message) VALUES ($1, $2, $3) RETURNING id, message, created_at',
      [communityId, req.user.id, body]
    );

    const comm = await pool.query('SELECT name FROM communities WHERE id = $1', [communityId]);
    const sender = await pool.query('SELECT username, full_name FROM users WHERE id = $1', [req.user.id]);
    const others = await pool.query(
      'SELECT user_id FROM community_members WHERE community_id = $1 AND user_id != $2',
      [communityId, req.user.id]
    );
    const ids = others.rows.map(r => r.user_id);
    if (ids.length > 0) {
      const who = sender.rows[0]?.full_name || sender.rows[0]?.username;
      sendPushNotification(ids, comm.rows[0]?.name || 'New message', `${who} sent a message`, { type: 'chat', communityId });
    }

    return res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error('Chat send error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unread count for one community
router.get('/unread/:communityId', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.communityId)) return res.status(400).json({ success: false, message: 'Invalid community' });
    const lastRead = await pool.query(
      'SELECT last_read_at FROM community_last_read WHERE user_id = $1 AND community_id = $2',
      [req.user.id, req.params.communityId]
    );
    const since = lastRead.rows[0]?.last_read_at || new Date(0);
    const result = await pool.query(
      'SELECT COUNT(*)::int AS n FROM community_messages WHERE community_id = $1 AND created_at > $2 AND user_id != $3 AND is_hidden = FALSE',
      [req.params.communityId, since, req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows[0].n });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
