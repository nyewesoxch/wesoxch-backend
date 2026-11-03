const pool = require('../config/db');

// Use after the sign-in check. Reads the database, so a token alone is not enough.
module.exports = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT is_admin FROM users WHERE id = $1 AND is_active = TRUE', [req.user.id]);
    if (!r.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, message: 'Only Wesoxch admins can do that' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
