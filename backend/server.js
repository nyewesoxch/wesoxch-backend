require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short (use at least 32 characters). Stopping.');
  process.exit(1);
}

const IS_PROD = process.env.NODE_ENV === 'production';
const app = express();
if (IS_PROD) app.set('trust proxy', 1); // behind a hosting proxy, so limits see the real address

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan(IS_PROD ? 'combined' : 'dev'));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Positions are blurred to about 1 km before they are saved, so nobody's exact doorstep is stored
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
    for (const key of ['latitude', 'longitude']) {
      const raw = req.body[key];
      if (raw === undefined || raw === null || raw === '') continue;
      const n = Number(raw);
      req.body[key] = Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    }
  }
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', immutable: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: IS_PROD ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

app.get('/', (req, res) => res.json({ success: true, message: 'Wesoxch API v3.0', version: '3.0.0' }));

app.use('/api/auth', authLimiter, require('./routes/phone_auth'));
app.use('/api/communities', require('./routes/communities'));
app.use('/api/community-requests', require('./routes/community_requests'));
app.use('/api/events', require('./routes/events'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/therapy', require('./routes/therapy'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/account', require('./routes/account'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wesoxch API v3.0 running on port ${PORT}${IS_PROD ? ' (production)' : ''}`);
});

module.exports = app;
