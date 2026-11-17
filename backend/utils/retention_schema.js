const pool = require('../config/db');
(async () => {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS adult_confirmed_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20)');
    await client.query('ALTER TABLE therapy_rooms ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW()');
    await client.query(`CREATE TABLE IF NOT EXISTS therapy_consents (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      consented_at TIMESTAMPTZ DEFAULT NOW(),
      version VARCHAR(20) NOT NULL
    )`);
    // People who already gave an age of 18 or more count as confirmed. The exact age is then erased.
    await client.query("UPDATE users SET adult_confirmed_at = created_at, terms_version = 'before-2026-11' WHERE adult_confirmed_at IS NULL AND age >= 18");
    const left = await client.query('SELECT username, age FROM users WHERE adult_confirmed_at IS NULL ORDER BY created_at');
    await client.query('UPDATE users SET age = NULL');
    console.log('RETENTION SCHEMA READY');
    if (left.rows.length) {
      console.log('These accounts could not be confirmed as adults (age missing or under 18):');
      left.rows.forEach(r => console.log('  @' + r.username, r.age === null ? '(no age)' : `(age ${r.age})`));
      console.log('Remove each with: node utils/admin.js delete-user NAME --yes');
    }
  } catch (e) {
    console.error('Schema error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
