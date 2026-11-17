require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const generateToken = require('../utils/generateToken');
const authMiddleware = require('../middleware/auth');
const { sendOTP } = require('../utils/sms');

const IS_PROD = process.env.NODE_ENV === 'production';
const TERMS_VERSION = '2026-11-15'; // change this when the Terms or Privacy Policy change in a way people must agree to again
const MAX_SENDS_PER_HOUR = IS_PROD ? 5 : 50;   // codes one number can ask for
const MAX_WRONG_TRIES = 5;                       // wrong guesses before a code stops working
// The "phone verified" pass uses its own secret, so it cannot be used as a sign-in token
const SIGNUP_SECRET = `${process.env.JWT_SECRET}:signup`;

const generateOTP = () => String(crypto.randomInt(100000, 1000000));

const formatPhone = (raw) => {
  const p = String(raw || '').replace(/[\s-]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+254' + p.slice(1);
  if (p.startsWith('254')) return '+' + p;
  return '+254' + p;
};
const isKenyan = (p) => /^\+254[17]\d{8}$/.test(p);

// Makes a fresh code, texts it, and returns it (or an error name)
const issueOtp = async (phone) => {
  await pool.query("DELETE FROM phone_otps WHERE created_at < NOW() - INTERVAL '1 day'");
  const recent = await pool.query(
    "SELECT COUNT(*)::int AS n FROM phone_otps WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    [phone]
  );
  if (recent.rows[0].n >= MAX_SENDS_PER_HOUR) return { error: 'tooMany' };

  const otp = generateOTP();
  await pool.query('UPDATE phone_otps SET used = TRUE WHERE phone = $1 AND used = FALSE', [phone]);
  const row = await pool.query(
    'INSERT INTO phone_otps (phone, otp, expires_at) VALUES ($1, $2, $3) RETURNING id',
    [phone, otp, new Date(Date.now() + 10 * 60 * 1000)]
  );

  const sms = await sendOTP(phone, otp);
  if (!sms.success && IS_PROD) {
    await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = $1', [row.rows[0].id]);
    return { error: 'smsFailed' };
  }
  return { otp };
};

const sendHandler = async (req, res) => {
  try {
    const phone = formatPhone(req.body.phone);
    if (!isKenyan(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Kenyan phone number' });
    }
    const r = await issueOtp(phone);
    if (r.error === 'tooMany') {
      return res.status(429).json({ success: false, message: 'Too many codes asked for this number. Please wait an hour and try again.' });
    }
    if (r.error === 'smsFailed') {
      return res.status(502).json({ success: false, message: 'We could not send the code. Please try again in a moment.' });
    }
    const out = { success: true, message: 'Verification code sent', phone };
    if (!IS_PROD) out.otp_hint = r.otp; // development only, never in production
    return res.status(200).json(out);
  } catch (err) {
    console.error('Send OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not send the code' });
  }
};
router.post('/send-otp', sendHandler);
router.post('/resend-otp', sendHandler);

// Check the code. Existing people are signed in; new people get a short-lived pass to finish their profile.
router.post('/verify-otp', async (req, res) => {
  try {
    const phone = formatPhone(req.body.phone);
    const code = String(req.body.otp || '').trim();
    if (!isKenyan(phone) || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and code are needed' });
    }

    const found = await pool.query(
      'SELECT id, otp, attempts FROM phone_otps WHERE phone = $1 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone]
    );
    if (found.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'That code has expired. Request a new one.' });
    }
    const rec = found.rows[0];

    if (rec.otp !== code) {
      const upd = await pool.query('UPDATE phone_otps SET attempts = COALESCE(attempts, 0) + 1 WHERE id = $1 RETURNING attempts', [rec.id]);
      const left = MAX_WRONG_TRIES - upd.rows[0].attempts;
      if (left <= 0) {
        await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = $1', [rec.id]);
        return res.status(429).json({ success: false, message: 'Too many wrong codes. Request a new one.' });
      }
      return res.status(400).json({ success: false, message: `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` });
    }

    await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = $1', [rec.id]);

    const existing = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.is_active === false) {
        return res.status(403).json({ success: false, message: 'This account is not active.' });
      }
      return res.status(200).json({
        success: true,
        is_new_user: false,
        token: generateToken(user),
        user: {
          id: user.id, username: user.username, full_name: user.full_name, phone_number: user.phone_number,
          avatar_url: user.avatar_url, is_seller: user.is_seller, is_verified: user.is_verified, bio: user.bio,
          location_name: user.location_name, seller_whatsapp: user.seller_whatsapp, seller_bio: user.seller_bio,
          created_at: user.created_at,
        },
      });
    }

    const signup_token = jwt.sign({ phone, purpose: 'signup' }, SIGNUP_SECRET, { expiresIn: '15m' });
    return res.status(200).json({ success: true, is_new_user: true, phone, signup_token });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// New people finish their profile. Needs the pass from verify-otp.
router.post('/complete-profile', async (req, res) => {
  try {
    let phone;
    try {
      const decoded = jwt.verify(String(req.body.signup_token || ''), SIGNUP_SECRET);
      if (decoded.purpose !== 'signup' || !decoded.phone) throw new Error('wrong pass');
      phone = decoded.phone;
    } catch {
      return res.status(401).json({ success: false, message: 'Your phone check has expired. Go back and request a new code.' });
    }

    const name = String(req.body.full_name || '').trim();
    const uname = String(req.body.username || '').trim().toLowerCase();
    const adult = req.body.adult_confirmed === true;
    if (!name || name.length > 100) return res.status(400).json({ success: false, message: 'Enter your name' });
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      return res.status(400).json({ success: false, message: 'Username must be 3 to 30 letters, numbers or underscores' });
    }
    if (!adult) {
      return res.status(400).json({ success: false, message: 'Please confirm that you are 18 or older to continue' });
    }

    let created;
    try {
      created = await pool.query(
        `INSERT INTO users (phone_number, phone_verified, full_name, username, adult_confirmed_at, terms_version, email, password_hash, is_email_verified, is_verified)
         VALUES ($1, TRUE, $2, $3, NOW(), $4, $5, $6, TRUE, TRUE)
         RETURNING id, username, full_name, phone_number, avatar_url, is_seller, is_verified, created_at`,
        [phone, name, uname, TERMS_VERSION, `phone_${phone.replace('+', '')}@wesoxch.app`, await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10)]
      );
    } catch (e) {
      if (e.code === '23505') {
        const which = String(e.constraint || e.detail || '');
        if (which.includes('username')) return res.status(409).json({ success: false, message: 'That username is already taken' });
        return res.status(409).json({ success: false, message: 'This number already has an account. Go back and sign in.' });
      }
      throw e;
    }

    const user = created.rows[0];
    return res.status(201).json({ success: true, token: generateToken(user), user });
  } catch (err) {
    console.error('Complete profile error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, full_name, phone_number, bio, avatar_url, age, location_name,
              is_verified, is_seller, seller_bio, seller_whatsapp, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/logout', authMiddleware, (req, res) => res.status(200).json({ success: true }));

module.exports = router;
