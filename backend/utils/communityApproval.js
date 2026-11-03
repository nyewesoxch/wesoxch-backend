const pool = require('../config/db');
const { sendPushNotification } = require('./pushNotification');

// Turns a pending request into a real community. Returns the community, or null if the request is not pending.
async function approveRequest(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query("SELECT * FROM community_requests WHERE id = $1 AND status = 'pending' FOR UPDATE", [id]);
    if (r.rows.length === 0) { await client.query('ROLLBACK'); return null; }
    const q = r.rows[0];
    const c = await client.query(
      `INSERT INTO communities (name, description, type, location_name, latitude, longitude, avatar_url, created_by, member_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1) RETURNING *`,
      [q.name, q.description, q.type, q.location_name, q.latitude, q.longitude, q.avatar_url, q.user_id]
    );
    await client.query("INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'admin')", [c.rows[0].id, q.user_id]);
    await client.query("UPDATE community_requests SET status = 'approved' WHERE id = $1", [id]);
    await client.query('COMMIT');
    try {
      await sendPushNotification([q.user_id], 'Your community is live', `${q.name} has been approved.`, { type: 'community_approved', communityId: c.rows[0].id });
    } catch {}
    return c.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Marks a pending request as rejected. Returns the request, or null if it is not pending.
async function rejectRequest(id) {
  const r = await pool.query(
    "UPDATE community_requests SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING user_id, name",
    [id]
  );
  if (r.rows.length === 0) return null;
  try {
    await sendPushNotification([r.rows[0].user_id], 'Community not approved', `${r.rows[0].name} was not approved this time.`, { type: 'community_rejected' });
  } catch {}
  return r.rows[0];
}

module.exports = { approveRequest, rejectRequest };
