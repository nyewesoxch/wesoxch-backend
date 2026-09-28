const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const parseArr = (arr) => { if (!arr) return []; if (Array.isArray(arr)) return arr.filter(Boolean); return arr.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean); };
router.get('/', async (req, res) => {
  try {
    const { search, property_type, min_price, max_price, area, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = ['r.is_available = TRUE'];
    let params = [];
    let i = 1;
    if (search) { conditions.push(`(r.title ILIKE $${i} OR r.description ILIKE $${i} OR r.area_name ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (property_type) { conditions.push(`r.property_type = $${i++}`); params.push(property_type); }
    if (min_price) { conditions.push(`r.rent_amount >= $${i++}`); params.push(parseFloat(min_price)); }
    if (max_price) { conditions.push(`r.rent_amount <= $${i++}`); params.push(parseFloat(max_price)); }
    if (area) { conditions.push(`r.area_name ILIKE $${i++}`); params.push(`%${area}%`); }
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(`SELECT r.*, u.username AS landlord_username, u.avatar_url AS landlord_avatar FROM rentals r LEFT JOIN users u ON r.created_by = u.id WHERE ${conditions.join(' AND ')} ORDER BY r.created_at DESC LIMIT $${i} OFFSET $${i+1}`, params);
    return res.status(200).json({ success: true, rentals: result.rows.map(r => ({ ...r, images: parseArr(r.images), amenities: parseArr(r.amenities) })) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, property_type, rent_amount, deposit_amount, payment_period, bedrooms, bathrooms, amenities, latitude, longitude, location_name, area_name, available_from, landlord_phone, landlord_whatsapp, images } = req.body;
    if (!title || !rent_amount) return res.status(400).json({ success: false, message: 'Title and rent amount required' });
    const result = await pool.query('INSERT INTO rentals (title, description, property_type, rent_amount, deposit_amount, payment_period, bedrooms, bathrooms, amenities, latitude, longitude, location_name, area_name, available_from, landlord_phone, landlord_whatsapp, images, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *', [title, description||null, property_type||'single_room', rent_amount, deposit_amount||0, payment_period||'monthly', bedrooms||1, bathrooms||1, amenities||null, latitude||null, longitude||null, location_name||null, area_name||null, available_from||null, landlord_phone||null, landlord_whatsapp||null, images&&images.length>0?images:null, req.user.id]);
    return res.status(201).json({ success: true, rental: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rentals WHERE created_by = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.status(200).json({ success: true, rentals: result.rows.map(r => ({ ...r, images: parseArr(r.images), amenities: parseArr(r.amenities) })) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT r.*, u.username AS landlord_username FROM rentals r LEFT JOIN users u ON r.created_by = u.id WHERE r.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query('UPDATE rentals SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);
    const rental = result.rows[0];
    return res.status(200).json({ success: true, rental: { ...rental, images: parseArr(rental.images), amenities: parseArr(rental.amenities) } });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT created_by FROM rentals WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, message: 'Not your listing' });
    await pool.query('DELETE FROM rentals WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});
module.exports = router;
