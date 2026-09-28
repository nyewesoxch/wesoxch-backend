const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
router.get('/', async (req, res) => {
  try {
    const { search, is_free, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = ["e.status = 'published'"];
    let params = [];
    let i = 1;
    if (search) { conditions.push(`(e.title ILIKE $${i} OR e.description ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (is_free === 'true') conditions.push('e.is_free = TRUE');
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(`SELECT e.*, u.username AS created_by_username FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE ${conditions.join(' AND ')} ORDER BY e.starts_at ASC LIMIT $${i} OFFSET $${i+1}`, params);
    return res.status(200).json({ success: true, events: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, event_type, latitude, longitude, location_name, location_details, starts_at, ends_at, is_free, price, max_attendees, cover_url, community_id } = req.body;
    if (!title || !starts_at) return res.status(400).json({ success: false, message: 'Title and start time required' });
    const result = await pool.query('INSERT INTO events (title, description, event_type, latitude, longitude, location_name, location_details, starts_at, ends_at, is_free, price, max_attendees, cover_url, created_by, community_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *', [title, description||null, event_type||null, latitude||null, longitude||null, location_name||null, location_details||null, starts_at, ends_at||null, is_free!==false, price||0, max_attendees||null, cover_url||null, req.user.id, community_id||null]);
    const event = result.rows[0];
    await pool.query('INSERT INTO event_attendees (event_id, user_id, status) VALUES ($1,$2,$3)', [event.id, req.user.id, 'going']);
    await pool.query('UPDATE events SET attendee_count = 1 WHERE id = $1', [event.id]);
    return res.status(201).json({ success: true, event });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT e.*, u.username AS created_by_username FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, event: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/:id/attend', authMiddleware, async (req, res) => {
  try {
    const { status = 'going' } = req.body;
    const existing = await pool.query('SELECT id FROM event_attendees WHERE event_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length > 0) { await pool.query('UPDATE event_attendees SET status = $1 WHERE event_id = $2 AND user_id = $3', [status, req.params.id, req.user.id]); }
    else { await pool.query('INSERT INTO event_attendees (event_id, user_id, status) VALUES ($1,$2,$3)', [req.params.id, req.user.id, status]); if (status === 'going') await pool.query('UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1', [req.params.id]); }
    return res.status(200).json({ success: true, message: `Marked as ${status}` });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT created_by FROM events WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, message: 'Not your event' });
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
