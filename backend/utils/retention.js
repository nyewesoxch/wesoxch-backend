const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// How long things are kept. If you change a number here, change the privacy policy to match.
const RETENTION = {
  CHAT_HOURS: 24,           // community chat and Our Therapy messages
  HIDDEN_MESSAGE_DAYS: 90,  // a reported community message is hidden and kept this long for review
  OTP_HOURS: 24,            // sign-in codes
  NOTIFICATION_DAYS: 30,
  PAST_EVENT_DAYS: 90,      // after an event ends
  LISTING_MONTHS: 12,       // listings and rentals not updated for this long
  ROOM_IDLE_DAYS: 7,        // therapy rooms with no messages for this long
  REPORT_DAYS: 365,
  PHOTO_ORPHAN_HOURS: 48,   // uploaded photos that nothing refers to
};

const UPLOAD_FOLDERS = ['avatars', 'covers', 'listings', 'communities', 'rentals'];
const UPLOADS = path.join(__dirname, '..', 'uploads');

// Photos that no profile, community, event, listing or rental uses any more
async function sweepPhotos(dryRun) {
  const used = new Set();
  const queries = [
    'SELECT avatar_url AS u FROM users WHERE avatar_url IS NOT NULL',
    'SELECT avatar_url AS u FROM communities WHERE avatar_url IS NOT NULL',
    'SELECT avatar_url AS u FROM community_requests WHERE avatar_url IS NOT NULL',
    'SELECT cover_url AS u FROM events WHERE cover_url IS NOT NULL',
    'SELECT unnest(images) AS u FROM listings WHERE images IS NOT NULL',
    'SELECT unnest(images) AS u FROM rentals WHERE images IS NOT NULL',
  ];
  for (const q of queries) {
    const r = await pool.query(q);
    r.rows.forEach(row => { if (row.u) used.add(path.basename(String(row.u))); });
  }
  const cutoff = Date.now() - RETENTION.PHOTO_ORPHAN_HOURS * 3600 * 1000;
  const names = [];
  for (const folder of UPLOAD_FOLDERS) {
    const dir = path.join(UPLOADS, folder);
    let files;
    try { files = await fs.promises.readdir(dir); } catch { continue; }
    for (const file of files) {
      if (used.has(file)) continue;
      const full = path.join(dir, file);
      try {
        const st = await fs.promises.stat(full);
        if (!st.isFile() || st.mtimeMs > cutoff) continue;
        if (!dryRun) await fs.promises.unlink(full);
        names.push(`${folder}/${file}`);
      } catch {}
    }
  }
  return names;
}

// Removes everything that has expired. With dryRun it only counts, and changes nothing.
async function runRetention({ dryRun = false } = {}) {
  const R = RETENTION;
  const rules = [
    ['community messages', 'DELETE FROM community_messages WHERE is_hidden = FALSE AND created_at < NOW() - make_interval(hours => $1)', [R.CHAT_HOURS]],
    ['reported messages (after review period)', 'DELETE FROM community_messages WHERE is_hidden = TRUE AND created_at < NOW() - make_interval(days => $1)', [R.HIDDEN_MESSAGE_DAYS]],
    ['therapy messages', 'DELETE FROM therapy_messages WHERE created_at < NOW() - make_interval(hours => $1)', [R.CHAT_HOURS]],
    ['idle therapy rooms', 'DELETE FROM therapy_rooms WHERE last_activity_at < NOW() - make_interval(days => $1)', [R.ROOM_IDLE_DAYS]],
    ['sign-in codes', 'DELETE FROM phone_otps WHERE created_at < NOW() - make_interval(hours => $1)', [R.OTP_HOURS]],
    ['notifications', 'DELETE FROM notifications WHERE created_at < NOW() - make_interval(days => $1)', [R.NOTIFICATION_DAYS]],
    ['past events', 'DELETE FROM events WHERE COALESCE(ends_at, starts_at) < NOW() - make_interval(days => $1)', [R.PAST_EVENT_DAYS]],
    ['old listings', 'DELETE FROM listings WHERE updated_at < NOW() - make_interval(months => $1)', [R.LISTING_MONTHS]],
    ['old rentals', 'DELETE FROM rentals WHERE updated_at < NOW() - make_interval(months => $1)', [R.LISTING_MONTHS]],
    ['old reports', 'DELETE FROM reports WHERE created_at < NOW() - make_interval(days => $1)', [R.REPORT_DAYS]],
  ];

  const rows = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [label, sql, params] of rules) {
      const r = await client.query(sql, params);
      rows.push([label, r.rowCount]);
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const photoNames = await sweepPhotos(dryRun);
  rows.push(['unused photos', photoNames.length]);
  return { rows, photoNames };
}

// Runs once at start-up and then every 15 minutes
function startRetention() {
  const run = () =>
    runRetention()
      .then(({ rows }) => {
        const did = rows.filter(([, n]) => n > 0).map(([label, n]) => `${label}: ${n}`);
        if (did.length) console.log('Retention removed', did.join(', '));
      })
      .catch((e) => console.error('Retention error:', e.message));
  run();
  setInterval(run, 15 * 60 * 1000).unref();
}

module.exports = { RETENTION, CHAT_HOURS: RETENTION.CHAT_HOURS, runRetention, startRetention };

// Run by hand:  node utils/retention.js --dry   (only shows what would go)
//               node utils/retention.js         (really deletes)
if (require.main === module) {
  const dry = process.argv.includes('--dry');
  runRetention({ dryRun: dry })
    .then(({ rows, photoNames }) => {
      console.log(dry ? 'DRY RUN. Nothing was deleted. This is what would be removed:' : 'Removed:');
      rows.forEach(([label, n]) => console.log(String(n).padStart(6), label));
      if (dry && photoNames.length) {
        console.log('\nUnused photos that would be deleted:');
        photoNames.slice(0, 20).forEach(n => console.log('  ', n));
        if (photoNames.length > 20) console.log(`   ...and ${photoNames.length - 20} more`);
      }
    })
    .catch(e => console.error('Error:', e.message))
    .finally(() => pool.end());
}
