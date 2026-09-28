const jwt = require('jsonwebtoken');
require('dotenv').config();
const generateToken = (user) => jwt.sign(
  { id: user.id, email: user.email, username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);
module.exports = generateToken;
