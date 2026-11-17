const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { CHAT_HOURS } = require('../utils/retention');

const ANON_NAMES = ['Healing Soul', 'Brave Heart', 'Quiet Storm', 'Rising Star', 'Open Mind', 'Gentle Wave', 'Strong Root', 'Free Spirit', 'Calm Sky', 'Warm Light'];
const getAnonName = () => ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)] + ' ' + Math.floor(Math.random() * 999);
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');

// Never include created_by: it would show who opened a room
const ROOM_COLUMNS = 'id, title, topic, is_anonymous, participant_count, created_at';

const isMember = async (roomId, userId) => {
  const r = await pool.query('SELECT 1 FROM therapy_room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
  return r.rows.length > 0;
};

// Our Therapy asks for clear agreement before someone joins their first room
const CONSENT_VERSION = '2026-11-15';
const hasConsent = async (userId) => {
  const r = await pool.query('SELECT 1 FROM therapy_consents WHERE user_id = $1', [userId]);
  return r.rows.length > 0;
};
const needConsent = (res) => res.status(403).json({ success: false, code: 'CONSENT_REQUIRED', message: 'Please read and agree to how Our Therapy works first.' });

router.get('/consent', authMiddleware, async (req, res) => {
  try {
    return res.status(200).json({ success: true, consented: await hasConsent(req.user.id) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/consent', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO therapy_consents (user_id, version) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET consented_at = NOW(), version = EXCLUDED.version`,
      [req.user.id, CONSENT_VERSION]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
    if (!(await hasConsent(req.user.id))) return needConsent(res);

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
    if (!(await hasConsent(req.user.id))) return needConsent(res);
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
       FROM therapy_messages WHERE room_id = $1 AND created_at > NOW() - make_interval(hours => ${CHAT_HOURS}) ORDER BY created_at DESC LIMIT 100`,
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
    await pool.query('UPDATE therapy_rooms SET last_activity_at = NOW() WHERE id = $1', [req.params.id]);
    return res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
