const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const ANON_NAMES = ['Healing Soul','Brave Heart','Quiet Storm','Rising Star','Open Mind','Gentle Wave','Strong Root','Free Spirit','Calm Sky','Warm Light'];
const getAnonName = () => ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)] + ' ' + Math.floor(Math.random() * 999);
router.get('/rooms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM therapy_rooms WHERE is_active = TRUE ORDER BY participant_count DESC, created_at DESC LIMIT 20');
    return res.status(200).json({ success: true, rooms: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/rooms', authMiddleware, async (req, res) => {
  try {
    const { title, topic, is_anonymous = true } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const result = await pool.query('INSERT INTO therapy_rooms (title, topic, is_anonymous, created_by) VALUES ($1,$2,$3,$4) RETURNING *', [title, topic||null, is_anonymous, req.user.id]);
    const room = result.rows[0];
    await pool.query('INSERT INTO therapy_room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [room.id, req.user.id]);
    await pool.query('UPDATE therapy_rooms SET participant_count = 1 WHERE id = $1', [room.id]);
    return res.status(201).json({ success: true, room });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/rooms/:id/join', authMiddleware, async (req, res) => {
  try {
    await pool.query('INSERT INTO therapy_room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    await pool.query('UPDATE therapy_rooms SET participant_count = (SELECT COUNT(*) FROM therapy_room_members WHERE room_id = $1) WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Joined' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/rooms/:id/messages', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, message, is_anonymous, anonymous_name, created_at, CASE WHEN is_anonymous = FALSE THEN user_id ELSE NULL END AS user_id FROM therapy_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 100', [req.params.id]);
    return res.status(200).json({ success: true, messages: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/rooms/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { message, is_anonymous = true } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Empty message' });
    const member = await pool.query('SELECT room_id FROM therapy_room_members WHERE room_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (member.rows.length === 0) return res.status(403).json({ success: false, message: 'Join the room first' });
    const anonName = is_anonymous ? getAnonName() : null;
    const result = await pool.query('INSERT INTO therapy_messages (room_id, user_id, message, is_anonymous, anonymous_name) VALUES ($1,$2,$3,$4,$5) RETURNING id, message, is_anonymous, anonymous_name, created_at', [req.params.id, req.user.id, message.trim(), is_anonymous, anonName]);
    return res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
