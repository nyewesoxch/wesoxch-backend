const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { deleteAccount } = require('../utils/deleteAccount');

// Permanently delete the signed-in person's account and everything they added
router.post('/delete', authMiddleware, async (req, res) => {
  if (req.body?.confirm !== 'DELETE') {
    return res.status(400).json({ success: false, message: 'Type DELETE to confirm' });
  }
  try {
    const result = await deleteAccount(req.user.id);
    if (!result.found) return res.status(404).json({ success: false, message: 'This account no longer exists' });
    console.log(`Account ${req.user.id} deleted, ${result.photos} photo file(s) removed`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
