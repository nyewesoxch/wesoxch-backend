const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const parseImages = (images) => { if (!images) return []; if (Array.isArray(images)) return images.filter(Boolean); return images.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean); };
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = ['l.is_available = TRUE'];
    let params = [];
    let i = 1;
    if (search) { conditions.push(`(l.title ILIKE $${i} OR l.description ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (category) { conditions.push(`l.category = $${i++}`); params.push(category); }
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(`SELECT l.*, u.username AS seller_username, u.phone AS seller_phone, u.seller_whatsapp FROM listings l LEFT JOIN users u ON l.created_by = u.id WHERE ${conditions.join(' AND ')} ORDER BY l.created_at DESC LIMIT $${i} OFFSET $${i+1}`, params);
    return res.status(200).json({ success: true, listings: result.rows.map(l => ({ ...l, images: parseImages(l.images) })) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, price, price_type, latitude, longitude, location_name, images } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const result = await pool.query('INSERT INTO listings (title, description, category, price, price_type, latitude, longitude, location_name, created_by, images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [title, description||null, category||null, price||0, price_type||'fixed', latitude||null, longitude||null, location_name||null, req.user.id, images&&images.length>0?images:null]);
    const listing = result.rows[0];
    listing.images = parseImages(listing.images);
    return res.status(201).json({ success: true, listing });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/user/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE created_by = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.status(200).json({ success: true, listings: result.rows.map(l => ({ ...l, images: parseImages(l.images) })) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT l.*, u.username AS seller_username, u.phone AS seller_phone, u.seller_whatsapp FROM listings l LEFT JOIN users u ON l.created_by = u.id WHERE l.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);
    const listing = result.rows[0];
    listing.images = parseImages(listing.images);
    return res.status(200).json({ success: true, listing });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, price, price_type, is_available, location_name } = req.body;
    const existing = await pool.query('SELECT created_by FROM listings WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, message: 'Not your listing' });
    const result = await pool.query('UPDATE listings SET title=COALESCE($1,title), description=COALESCE($2,description), category=COALESCE($3,category), price=COALESCE($4,price), price_type=COALESCE($5,price_type), is_available=COALESCE($6,is_available), location_name=COALESCE($7,location_name), updated_at=NOW() WHERE id=$8 RETURNING *', [title, description, category, price, price_type, is_available, location_name, req.params.id]);
    const listing = result.rows[0];
    listing.images = parseImages(listing.images);
    return res.status(200).json({ success: true, listing });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT created_by FROM listings WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, message: 'Not your listing' });
    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
