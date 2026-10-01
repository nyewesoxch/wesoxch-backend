const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const generateToken = require('../utils/generateToken');
const authMiddleware = require('../middleware/auth');
const { sendOTP, sendWelcome } = require('../config/mailer');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const trySendOTP = async (email, otp, fullName, type = 'verify') => {
  try { await sendOTP(email, otp, fullName, type); } catch (e) { console.log('Email send skipped:', e.message); }
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, age } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Username, email and password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    if (age && parseInt(age) < 13) return res.status(400).json({ success: false, message: 'You must be at least 13 years old' });

    const existing = await pool.query('SELECT id, is_email_verified FROM users WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length > 0) {
      if (!existing.rows[0].is_email_verified) {
        const otp = generateOTP();
        await pool.query('UPDATE email_otps SET used = TRUE WHERE email = $1', [email.toLowerCase()]);
        await pool.query('INSERT INTO email_otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email.toLowerCase(), otp, new Date(Date.now() + 10 * 60 * 1000)]);
        trySendOTP(email, otp, full_name);
        return res.status(200).json({ success: true, requires_verification: true, email: email.toLowerCase(), otp_hint: otp });
      }
      return res.status(409).json({ success: false, message: 'Email or username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO users (username, email, password_hash, full_name, age, is_email_verified) VALUES ($1,$2,$3,$4,$5,FALSE)', [username.toLowerCase(), email.toLowerCase(), password_hash, full_name || null, age || null]);

    const otp = generateOTP();
    await pool.query('INSERT INTO email_otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email.toLowerCase(), otp, new Date(Date.now() + 10 * 60 * 1000)]);
    trySendOTP(email, otp, full_name);

    return res.status(201).json({ success: true, message: 'Account created!', requires_verification: true, email: email.toLowerCase(), otp_hint: otp });
  } catch (err) { console.error('Register error:', err); return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await pool.query('SELECT * FROM email_otps WHERE email = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1', [email.toLowerCase(), otp]);
    if (result.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    await pool.query('UPDATE email_otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    const userResult = await pool.query('UPDATE users SET is_email_verified = TRUE, is_verified = TRUE, updated_at = NOW() WHERE email = $1 RETURNING id, username, email, full_name, avatar_url, is_seller, age, created_at', [email.toLowerCase()]);
    const user = userResult.rows[0];
    const token = generateToken(user);
    trySendOTP(email, '000000', user.full_name, 'welcome');
    return res.status(200).json({ success: true, message: 'Email verified! Welcome to Wesoxch 🌍', token, user });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await pool.query('SELECT id, full_name, is_email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    if (user.rows.length === 0) return res.status(404).json({ success: false, message: 'No account found' });
    if (user.rows[0].is_email_verified) return res.status(400).json({ success: false, message: 'Already verified' });
    await pool.query('UPDATE email_otps SET used = TRUE WHERE email = $1', [email.toLowerCase()]);
    const otp = generateOTP();
    await pool.query('INSERT INTO email_otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email.toLowerCase(), otp, new Date(Date.now() + 10 * 60 * 1000)]);
    trySendOTP(email, otp, user.rows[0].full_name);
    return res.status(200).json({ success: true, message: 'New code sent', otp_hint: otp });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.is_email_verified) {
      const otp = generateOTP();
      await pool.query('UPDATE email_otps SET used = TRUE WHERE email = $1', [email.toLowerCase()]);
      await pool.query('INSERT INTO email_otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email.toLowerCase(), otp, new Date(Date.now() + 10 * 60 * 1000)]);
      trySendOTP(email, otp, user.full_name);
      return res.status(403).json({ success: false, message: 'Please verify your email.', requires_verification: true, email: email.toLowerCase(), otp_hint: otp });
    }
    const token = generateToken(user);
    return res.status(200).json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url, is_seller: user.is_seller, is_verified: user.is_verified, age: user.age, location_name: user.location_name, seller_whatsapp: user.seller_whatsapp, seller_bio: user.seller_bio, bio: user.bio, phone: user.phone, created_at: user.created_at } });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, full_name, bio, avatar_url, phone, age, latitude, longitude, location_name, is_verified, is_email_verified, is_seller, seller_bio, seller_whatsapp, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length > 0) {
      const otp = generateOTP();
      await pool.query('UPDATE email_otps SET used = TRUE WHERE email = $1', [email.toLowerCase()]);
      await pool.query('INSERT INTO email_otps (email, otp, expires_at) VALUES ($1,$2,$3)', [email.toLowerCase(), otp, new Date(Date.now() + 15 * 60 * 1000)]);
      trySendOTP(email, otp, result.rows[0].full_name, 'reset');
      return res.status(200).json({ success: true, message: 'Reset code sent.', otp_hint: otp });
    }
    return res.status(200).json({ success: true, message: 'If that email exists, a reset code has been sent.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) return res.status(400).json({ success: false, message: 'All fields required' });
    if (new_password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const result = await pool.query('SELECT * FROM email_otps WHERE email = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1', [email.toLowerCase(), otp]);
    if (result.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    await pool.query('UPDATE email_otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [password_hash, email.toLowerCase()]);
    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/logout', authMiddleware, (req, res) => res.status(200).json({ success: true }));

module.exports = router;
