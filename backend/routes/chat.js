const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { sendPushNotification } = require('../utils/pushNotification');
router.get('/:communityId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT cm.id, cm.message, cm.created_at, u.id AS user_id, u.username, u.full_name, u.avatar_url FROM community_messages cm JOIN users u ON cm.user_id = u.id WHERE cm.community_id = $1 ORDER BY cm.created_at ASC LIMIT 100', [req.params.communityId]);
    await pool.query('INSERT INTO community_last_read (user_id, community_id, last_read_at) VALUES ($1,$2,NOW()) ON CONFLICT (user_id, community_id) DO UPDATE SET last_read_at = NOW()', [req.user.id, req.params.communityId]);
    return res.status(200).json({ success: true, messages: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/:communityId', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Empty message' });
    const member = await pool.query('SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2', [req.params.communityId, req.user.id]);
    if (member.rows.length === 0) return res.status(403).json({ success: false, message: 'Join community first' });
    const result = await pool.query('INSERT INTO community_messages (community_id, user_id, message) VALUES ($1,$2,$3) RETURNING id, message, created_at', [req.params.communityId, req.user.id, message.trim()]);
    const commRes = await pool.query('SELECT name FROM communities WHERE id = $1', [req.params.communityId]);
    const senderRes = await pool.query('SELECT username, full_name FROM users WHERE id = $1', [req.user.id]);
    const membersRes = await pool.query('SELECT user_id FROM community_members WHERE community_id = $1 AND user_id != $2', [req.params.communityId, req.user.id]);
    const memberIds = membersRes.rows.map(r => r.user_id);
    if (memberIds.length > 0) sendPushNotification(memberIds, `${commRes.rows[0]?.name} 💬`, `${senderRes.rows[0]?.full_name || senderRes.rows[0]?.username}: ${message.trim().substring(0, 80)}`, { type: 'chat', communityId: req.params.communityId });
    return res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/unread/:communityId', authMiddleware, async (req, res) => {
  try {
    const lastRead = await pool.query('SELECT last_read_at FROM community_last_read WHERE user_id = $1 AND community_id = $2', [req.user.id, req.params.communityId]);
    const since = lastRead.rows[0]?.last_read_at || new Date(0);
    const result = await pool.query('SELECT COUNT(*) FROM community_messages WHERE community_id = $1 AND created_at > $2 AND user_id != $3', [req.params.communityId, since, req.user.id]);
    return res.status(200).json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
