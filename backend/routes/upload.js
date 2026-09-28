const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
require('dotenv').config();
const BASE = process.env.BASE_URL || 'http://localhost:5000';
['avatars','covers','listings','communities','rentals'].forEach(dir => {
  const full = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});
const makeStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', folder)),
  filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname) || '.jpg'}`),
});
const imageFilter = (req, file, cb) => ['image/jpeg','image/png','image/jpg','image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Images only'));
const opts = (folder) => ({ storage: makeStorage(folder), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: imageFilter });
router.post('/avatar', authMiddleware, multer(opts('avatars')).single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const url = `${BASE}/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [url, req.user.id]);
    const result = await pool.query('SELECT id, username, email, full_name, bio, phone, avatar_url, latitude, longitude, location_name, is_verified, is_seller, seller_bio, seller_whatsapp, age, created_at FROM users WHERE id = $1', [req.user.id]);
    return res.status(200).json({ success: true, user: result.rows[0], avatar_url: url });
  } catch (err) { return res.status(500).json({ success: false, message: 'Upload failed' }); }
});
router.post('/cover', authMiddleware, multer(opts('covers')).single('cover'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    return res.status(200).json({ success: true, url: `${BASE}/uploads/covers/${req.file.filename}` });
  } catch (err) { return res.status(500).json({ success: false, message: 'Upload failed' }); }
});
router.post('/listing', authMiddleware, multer(opts('listings')).array('images', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files' });
    return res.status(200).json({ success: true, urls: req.files.map(f => `${BASE}/uploads/listings/${f.filename}`) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Upload failed' }); }
});
router.post('/community-avatar', authMiddleware, multer(opts('communities')).single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    return res.status(200).json({ success: true, url: `${BASE}/uploads/communities/${req.file.filename}` });
  } catch (err) { return res.status(500).json({ success: false, message: 'Upload failed' }); }
});
router.post('/rental', authMiddleware, multer(opts('rentals')).array('images', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files' });
    return res.status(200).json({ success: true, urls: req.files.map(f => `${BASE}/uploads/rentals/${f.filename}`) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Upload failed' }); }
});
module.exports = router;
