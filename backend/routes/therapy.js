const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const ANON_NAMES = ['Healing Soul', 'Brave Heart', 'Quiet Storm', 'Rising Star', 'Open Mind', 'Gentle Wave', 'Strong Root', 'Free Spirit', 'Calm Sky', 'Warm Light'];
const getAnonName = () => ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)] + ' ' + Math.floor(Math.random() * 999);
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');

// Never include created_by: it would show who opened a room
const ROOM_COLUMNS = 'id, title, topic, is_anonymous, participant_count, created_at';

const isMember = async (roomId, userId) => {
  const r = await pool.query('SELECT 1 FROM therapy_room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
  return r.rows.length > 0;
};

// Rooms people can join
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${ROOM_COLUMNS} FROM therapy_rooms WHERE is_active = TRUE ORDER BY participant_count DESC, created_at DESC LIMIT 20`
    );
    return res.status(200).json({ success: true, rooms: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Open a new room
router.post('/rooms', authMiddleware, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ success: false, message: 'Give the room a title' });
    if (title.length > 200) return res.status(400).json({ success: false, message: 'The title can be up to 200 characters' });
    const topic = req.body.topic ? String(req.body.topic).slice(0, 100) : null;

    const result = await pool.query(
      `INSERT INTO therapy_rooms (title, topic, is_anonymous, created_by) VALUES ($1, $2, $3, $4) RETURNING ${ROOM_COLUMNS}`,
      [title, topic, req.body.is_anonymous !== false, req.user.id]
    );
    const room = result.rows[0];
    await pool.query('INSERT INTO therapy_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [room.id, req.user.id]);
    await pool.query('UPDATE therapy_rooms SET participant_count = 1 WHERE id = $1', [room.id]);
    return res.status(201).json({ success: true, room: { ...room, participant_count: 1 } });
  } catch (err) {
    console.error('Create room error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Join a room
router.post('/rooms/:id/join', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room' });
    const room = await pool.query('SELECT 1 FROM therapy_rooms WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (room.rows.length === 0) return res.status(404).json({ success: false, message: 'Room not found' });
    await pool.query('INSERT INTO therapy_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    await pool.query(
      'UPDATE therapy_rooms SET participant_count = (SELECT COUNT(*) FROM therapy_room_members WHERE room_id = $1) WHERE id = $1',
      [req.params.id]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Read messages (members only). The latest 100, oldest first.
router.get('/rooms/:id/messages', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room' });
    if (!(await isMember(req.params.id, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Join this room to read it' });
    }
    const result = await pool.query(
      `SELECT id, message, is_anonymous, anonymous_name, created_at,
              CASE WHEN is_anonymous = FALSE THEN user_id ELSE NULL END AS user_id
       FROM therapy_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    return res.status(200).json({ success: true, messages: result.rows.reverse() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Write a message (members only)
router.post('/rooms/:id/messages', authMiddleware, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room' });
    const body = String(req.body.message || '').trim();
    if (!body) return res.status(400).json({ success: false, message: 'Write something first' });
    if (body.length > 500) return res.status(400).json({ success: false, message: 'Messages can be up to 500 characters' });
    if (!(await isMember(req.params.id, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Join this room first' });
    }
    const anonymous = req.body.is_anonymous !== false;
    const result = await pool.query(
      `INSERT INTO therapy_messages (room_id, user_id, message, is_anonymous, anonymous_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, message, is_anonymous, anonymous_name, created_at`,
      [req.params.id, req.user.id, body, anonymous, anonymous ? getAnonName() : null]
    );
    return res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
