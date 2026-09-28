const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ success: true, message: '🌍 Wesoxch API v2.0 is alive', version: '2.0.0' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/communities', require('./routes/communities'));
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

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Wesoxch API v2.0 running on port ${PORT}`);
});

module.exports = app;
