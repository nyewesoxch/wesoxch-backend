const pool = require('../config/db');
(async () => {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE phone_otps ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
    await client.query('ALTER TABLE community_requests ADD COLUMN IF NOT EXISTS avatar_url TEXT');
    console.log('HARDENING SCHEMA READY');
  } catch (e) {
    console.error('Schema error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
