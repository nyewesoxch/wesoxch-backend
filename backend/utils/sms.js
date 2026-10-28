const AfricasTalking = require('africastalking');
require('dotenv').config();

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = at.SMS;

const sendOTP = async (phone, otp) => {
  const message = `Your Wesoxch verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
  try {
    const result = await sms.send({
      to: [phone],
      message,
    });
    console.log('SMS sent:', result);
    return { success: true };
  } catch (err) {
    console.error('SMS error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendOTP };
