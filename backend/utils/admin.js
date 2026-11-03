const pool = require('../config/db');
const { approveRequest, rejectRequest } = require('./communityApproval');

const [, , cmd, arg] = process.argv;

(async () => {
  try {
    if (cmd === 'make-admin' || cmd === 'remove-admin') {
      const on = cmd === 'make-admin';
      const r = await pool.query('UPDATE users SET is_admin = $1 WHERE username = $2 RETURNING username', [on, String(arg || '').toLowerCase()]);
      console.log(r.rows.length ? `${r.rows[0].username} is ${on ? 'now' : 'no longer'} an admin` : 'No one has that username');
    } else if (cmd === 'pending') {
      const r = await pool.query(
        `SELECT cr.id, cr.name, cr.type, cr.location_name, cr.description, u.username, u.phone_number
         FROM community_requests cr JOIN users u ON u.id = cr.user_id
         WHERE cr.status = 'pending' ORDER BY cr.created_at`
      );
      if (r.rows.length === 0) console.log('No communities waiting for approval.');
      r.rows.forEach(x => console.log(`\n${x.name} (${x.type})\n  id: ${x.id}\n  asked by: @${x.username}  ${x.phone_number}\n  where: ${x.location_name || '-'}\n  about: ${x.description || '-'}`));
    } else if (cmd === 'approve') {
      const c = await approveRequest(arg);
      console.log(c ? `Approved. "${c.name}" is now live.` : 'No pending request with that id.');
    } else if (cmd === 'reject') {
      const x = await rejectRequest(arg);
      console.log(x ? `Rejected "${x.name}".` : 'No pending request with that id.');
    } else {
      console.log('Usage:');
      console.log('  node utils/admin.js make-admin <username>');
      console.log('  node utils/admin.js remove-admin <username>');
      console.log('  node utils/admin.js pending');
      console.log('  node utils/admin.js approve <request-id>');
      console.log('  node utils/admin.js reject <request-id>');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
