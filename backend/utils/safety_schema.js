const pool = require('../config/db');
(async () => {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE');
    await client.query(`CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
      blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    )`);
    console.log('SAFETY SCHEMA READY');
  } catch (e) {
    console.error('Schema error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
