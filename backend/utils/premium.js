const pool = require('../config/db');

const [, , action, username, daysArg] = process.argv;

(async () => {
  try {
    if (!['grant', 'revoke', 'status'].includes(action) || !username) {
      console.log('Usage: node utils/premium.js grant|revoke|status <username> [days]');
      console.log('  grant with no days = premium with no end date');
      return;
    }
    const u = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (u.rows.length === 0) { console.log('No one has the username', username); return; }
    const id = u.rows[0].id;

    if (action === 'grant') {
      const d = parseInt(daysArg);
      const days = Number.isInteger(d) && d > 0 ? d : null;
      await pool.query(
        `INSERT INTO premium_subscriptions (user_id, started_at, expires_at, is_active)
         VALUES ($1, NOW(), CASE WHEN $2::int IS NULL THEN NULL ELSE NOW() + make_interval(days => $2::int) END, TRUE)
         ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, started_at = NOW(),
           expires_at = CASE WHEN $2::int IS NULL THEN NULL ELSE NOW() + make_interval(days => $2::int) END`,
        [id, days]
      );
      console.log(`Premium is ON for ${username}` + (days ? ` for ${days} days` : ' with no end date'));
    } else if (action === 'revoke') {
      await pool.query('UPDATE premium_subscriptions SET is_active = FALSE WHERE user_id = $1', [id]);
      console.log(`Premium is OFF for ${username}`);
    } else {
      const r = await pool.query('SELECT is_active, expires_at FROM premium_subscriptions WHERE user_id = $1', [id]);
      console.log(r.rows[0] || 'No premium record for this person');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
