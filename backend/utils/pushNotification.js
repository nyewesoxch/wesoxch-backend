const pool = require('../config/db');
const sendPushNotification = async (userIds, title, body, data = {}) => {
  try {
    if (!userIds || userIds.length === 0) return;
    const result = await pool.query('SELECT token FROM push_tokens WHERE user_id = ANY($1)', [userIds]);
    if (result.rows.length === 0) return;
    const messages = result.rows.map(row => ({ to: row.token, sound: 'default', title, body, data, priority: 'high' }));
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    for (const userId of userIds) {
      await pool.query('INSERT INTO notifications (user_id, title, body, data) VALUES ($1,$2,$3,$4)', [userId, title, body, JSON.stringify(data)]);
    }
  } catch (err) { console.error('Push error:', err.message); }
};
module.exports = { sendPushNotification };
