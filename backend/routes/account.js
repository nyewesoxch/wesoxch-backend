const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const UPLOAD_FOLDERS = ['avatars', 'covers', 'listings', 'communities', 'rentals'];
const UPLOADS = path.join(__dirname, '..', 'uploads');

// Photos are saved as "<user id>-<time>.jpg", so every file a person uploaded can be found by that start.
// A photo that a surviving community still uses as its picture is kept.
async function removePhotos(userId) {
  const inUse = await pool.query('SELECT avatar_url FROM communities WHERE avatar_url LIKE $1', [`%/${userId}-%`]);
  const keep = new Set(inUse.rows.map(r => path.basename(r.avatar_url)));
  let removed = 0;
  for (const folder of UPLOAD_FOLDERS) {
    const dir = path.join(UPLOADS, folder);
    let files;
    try { files = await fs.promises.readdir(dir); } catch { continue; }
    for (const file of files) {
      if (!file.startsWith(`${userId}-`) || keep.has(file)) continue;
      try { await fs.promises.unlink(path.join(dir, file)); removed++; } catch {}
    }
  }
  return removed;
}

// Permanently delete the signed-in person's account and everything they added
router.post('/delete', authMiddleware, async (req, res) => {
  if (req.body?.confirm !== 'DELETE') {
    return res.status(400).json({ success: false, message: 'Type DELETE to confirm' });
  }
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query('SELECT phone_number FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'This account no longer exists' });
    }
    const phone = found.rows[0].phone_number;

    // Communities they started: hand over to the longest-standing member, or close it if they are alone
    const owned = await client.query(
      `SELECT c.id,
              (SELECT m.user_id FROM community_members m
               WHERE m.community_id = c.id AND m.user_id <> $1
               ORDER BY m.joined_at ASC LIMIT 1) AS successor
       FROM communities c WHERE c.created_by = $1`,
      [userId]
    );
    for (const c of owned.rows) {
      if (!c.successor) {
        await client.query('DELETE FROM communities WHERE id = $1', [c.id]);
      } else {
        await client.query("UPDATE community_members SET role = 'admin' WHERE community_id = $1 AND user_id = $2", [c.id, c.successor]);
        await client.query('UPDATE communities SET created_by = $1 WHERE id = $2', [c.successor, c.id]);
      }
    }

    // Keep the member and attendee counts honest
    await client.query(
      `UPDATE communities SET member_count = GREATEST(member_count - 1, 0)
       WHERE id IN (SELECT community_id FROM community_members WHERE user_id = $1)`, [userId]);
    await client.query(
      `UPDATE events SET attendee_count = GREATEST(attendee_count - 1, 0)
       WHERE id IN (SELECT event_id FROM event_attendees WHERE user_id = $1 AND status = 'going')
         AND created_by IS DISTINCT FROM $1`, [userId]);
    await client.query(
      `UPDATE therapy_rooms SET participant_count = GREATEST(participant_count - 1, 0)
       WHERE id IN (SELECT room_id FROM therapy_room_members WHERE user_id = $1)`, [userId]);

    // Things that would otherwise be left behind with no owner
    await client.query('DELETE FROM therapy_messages WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM events WHERE created_by = $1', [userId]);
    if (phone) await client.query('DELETE FROM phone_otps WHERE phone = $1', [phone]);

    // Everything else (listings, rentals, messages, memberships, blocks, tokens...) goes with the person
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Account deletion error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }

  // The data is gone. Now remove their photo files; a problem here does not undo the deletion.
  try {
    const n = await removePhotos(userId);
    console.log(`Account ${userId} deleted, ${n} photo file(s) removed`);
  } catch (e) {
    console.error('Photo cleanup error:', e.message);
  }
  return res.status(200).json({ success: true });
});

module.exports = router;
