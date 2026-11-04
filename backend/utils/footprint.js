// Shows everything the database and uploads folder hold for one person.
// Usage: node utils/footprint.js <username or user id>
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const arg = process.argv[2];
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');

(async () => {
  try {
    let id = arg;
    if (!isUuid(arg)) {
      const u = await pool.query('SELECT id FROM users WHERE username = $1', [String(arg || '').toLowerCase()]);
      if (!u.rows.length) { console.log('No one has that username (if you already deleted it, use the user id).'); return; }
      id = u.rows[0].id;
    }
    console.log('user id:', id);
    const checks = [
      ['account', 'SELECT COUNT(*) FROM users WHERE id = $1'],
      ['community memberships', 'SELECT COUNT(*) FROM community_members WHERE user_id = $1'],
      ['community messages', 'SELECT COUNT(*) FROM community_messages WHERE user_id = $1'],
      ['therapy messages', 'SELECT COUNT(*) FROM therapy_messages WHERE user_id = $1'],
      ['listings', 'SELECT COUNT(*) FROM listings WHERE created_by = $1'],
      ['rentals', 'SELECT COUNT(*) FROM rentals WHERE created_by = $1'],
      ['events created', 'SELECT COUNT(*) FROM events WHERE created_by = $1'],
      ['event RSVPs', 'SELECT COUNT(*) FROM event_attendees WHERE user_id = $1'],
      ['communities owned', 'SELECT COUNT(*) FROM communities WHERE created_by = $1'],
    ];
    for (const [label, sql] of checks) {
      const r = await pool.query(sql, [id]);
      console.log(label.padEnd(24), r.rows[0].count);
    }
    let files = 0;
    for (const d of ['avatars', 'covers', 'listings', 'communities', 'rentals']) {
      try { files += fs.readdirSync(path.join(__dirname, '..', 'uploads', d)).filter(f => f.startsWith(id + '-')).length; } catch {}
    }
    console.log('photo files'.padEnd(24), files);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
