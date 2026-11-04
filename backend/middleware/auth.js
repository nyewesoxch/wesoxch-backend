const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const ENDED = { success: false, message: 'Your session has ended. Please sign in again.' };

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Please sign in' });
  }
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json(ENDED);
  }
  try {
    // A valid token is not enough: the person must still exist and be active
    const r = await pool.query('SELECT is_active FROM users WHERE id = $1', [decoded.id]);
    if (r.rows.length === 0 || r.rows[0].is_active === false) return res.status(401).json(ENDED);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth check error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
