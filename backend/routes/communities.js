const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = ['c.is_public = TRUE'];
    let params = [];
    let i = 1;
    if (search) { conditions.push(`(c.name ILIKE $${i} OR c.description ILIKE $${i})`); params.push(`%${search}%`); i++; }
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(`SELECT c.*, u.username AS created_by_username FROM communities c LEFT JOIN users u ON c.created_by = u.id WHERE ${conditions.join(' AND ')} ORDER BY c.member_count DESC, c.created_at DESC LIMIT $${i} OFFSET $${i+1}`, params);
    return res.status(200).json({ success: true, communities: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, latitude, longitude, location_name, avatar_url } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const result = await pool.query('INSERT INTO communities (name, description, type, latitude, longitude, location_name, avatar_url, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [name, description||null, type||'geographic', latitude||null, longitude||null, location_name||null, avatar_url||null, req.user.id]);
    const community = result.rows[0];
    await pool.query('INSERT INTO community_members (community_id, user_id, role) VALUES ($1,$2,$3)', [community.id, req.user.id, 'admin']);
    await pool.query('UPDATE communities SET member_count = 1 WHERE id = $1', [community.id]);
    return res.status(201).json({ success: true, community });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/my/joined', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT c.*, cm.role, cm.joined_at FROM community_members cm JOIN communities c ON cm.community_id = c.id WHERE cm.user_id = $1 ORDER BY cm.joined_at DESC', [req.user.id]);
    return res.status(200).json({ success: true, communities: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT c.*, u.username AS created_by_username FROM communities c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, community: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length > 0) return res.status(409).json({ success: false, message: 'Already a member' });
    await pool.query('INSERT INTO community_members (community_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    await pool.query('UPDATE communities SET member_count = member_count + 1 WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Joined' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const membership = await pool.query('SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (membership.rows.length === 0) return res.status(404).json({ success: false, message: 'Not a member' });
    if (membership.rows[0].role === 'admin') return res.status(403).json({ success: false, message: 'Admin cannot leave' });
    await pool.query('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await pool.query('UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Left' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/:id/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT u.id, u.username, u.full_name, u.avatar_url, cm.role, cm.joined_at FROM community_members cm JOIN users u ON cm.user_id = u.id WHERE cm.community_id = $1 ORDER BY cm.role ASC, cm.joined_at ASC', [req.params.id]);
    return res.status(200).json({ success: true, members: result.rows });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
