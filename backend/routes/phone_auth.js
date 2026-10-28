const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const generateToken = require('../utils/generateToken');
const authMiddleware = require('../middleware/auth');
const { sendOTP } = require('../utils/sms');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const formatPhone = (phone) => {
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('0')) return '+254' + phone.slice(1);
  if (phone.startsWith('254')) return '+' + phone;
  if (!phone.startsWith('+')) return '+254' + phone;
  return phone;
};

// Step 1 — Send OTP to phone
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
    
    const formatted = formatPhone(phone);
    
    // Validate Kenyan number
    if (!formatted.match(/^\+254[17]\d{8}$/)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Kenyan phone number' });
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate old OTPs
    await pool.query('UPDATE phone_otps SET used = TRUE WHERE phone = $1', [formatted]);

    // Save new OTP
    await pool.query(
      'INSERT INTO phone_otps (phone, otp, expires_at) VALUES ($1, $2, $3)',
      [formatted, otp, expires]
    );

    // Send SMS
    const result = await sendOTP(formatted, otp);

    // In development return OTP hint
    const response = {
      success: true,
      message: 'Verification code sent',
      phone: formatted,
    };

    if (process.env.NODE_ENV !== 'production' || !result.success) {
      response.otp_hint = otp;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ success: false, message: 'Could not send code' });
  }
});

// Step 2 — Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and code required' });

    const formatted = formatPhone(phone);

    const result = await pool.query(
      'SELECT * FROM phone_otps WHERE phone = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [formatted, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);

    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [formatted]
    );

    if (userResult.rows.length > 0) {
      // Existing user — log them in
      const user = userResult.rows[0];
      const token = generateToken(user);
      return res.status(200).json({
        success: true,
        is_new_user: false,
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          phone_number: user.phone_number,
          avatar_url: user.avatar_url,
          is_seller: user.is_seller,
          is_verified: user.is_verified,
          bio: user.bio,
          location_name: user.location_name,
          seller_whatsapp: user.seller_whatsapp,
          seller_bio: user.seller_bio,
          created_at: user.created_at,
        }
      });
    }

    // New user — needs profile setup
    return res.status(200).json({
      success: true,
      is_new_user: true,
      phone: formatted,
      message: 'Phone verified. Complete your profile.',
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Step 3 — Complete profile (new users only)
router.post('/complete-profile', async (req, res) => {
  try {
    const { phone, full_name, username, age } = req.body;
    if (!phone || !full_name || !username) {
      return res.status(400).json({ success: false, message: 'Name and username required' });
    }
    if (age && parseInt(age) < 13) {
      return res.status(400).json({ success: false, message: 'Must be at least 13 years old' });
    }

    const formatted = formatPhone(phone);

    // Check username taken
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users 
        (phone_number, phone_verified, full_name, username, age, email, password_hash, is_email_verified, is_verified)
       VALUES ($1, TRUE, $2, $3, $4, $5, $6, TRUE, TRUE)
       RETURNING id, username, full_name, phone_number, avatar_url, is_seller, is_verified, created_at`,
      [
        formatted,
        full_name.trim(),
        username.toLowerCase().trim(),
        age ? parseInt(age) : null,
        `phone_${formatted.replace('+', '')}@wesoxch.app`,
        await bcrypt.hash(Math.random().toString(36), 10),
      ]
    );

    const user = newUser.rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error('Complete profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const formatted = formatPhone(phone);

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('UPDATE phone_otps SET used = TRUE WHERE phone = $1', [formatted]);
    await pool.query(
      'INSERT INTO phone_otps (phone, otp, expires_at) VALUES ($1, $2, $3)',
      [formatted, otp, expires]
    );

    const result = await sendOTP(formatted, otp);

    const response = { success: true, message: 'New code sent' };
    if (!result.success) response.otp_hint = otp;

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not resend' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, full_name, phone_number, bio, avatar_url, 
              age, location_name, is_verified, is_seller, seller_bio, 
              seller_whatsapp, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  return res.status(200).json({ success: true });
});

module.exports = router;
