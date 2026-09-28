const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

const sendOTP = async (email, otp, fullName, type = 'verify') => {
  const isReset = type === 'reset';
  await transporter.sendMail({
    from: `"Wesoxch 🌍" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: isReset ? 'Reset your Wesoxch password' : 'Verify your Wesoxch account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0F172A;color:#fff;padding:32px;border-radius:16px;">
        <h1 style="color:#22C55E;">🌍 Wesoxch</h1>
        <h2>Hey ${fullName || 'there'}! 👋</h2>
        <p style="color:#94A3B8;">${isReset ? 'Use this code to reset your password.' : 'Use this code to verify your email.'}</p>
        <div style="background:#1E293B;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <h1 style="color:#22C55E;font-size:48px;letter-spacing:12px;">${otp}</h1>
          <p style="color:#64748B;">Expires in ${isReset ? '15' : '10'} minutes</p>
        </div>
        <p style="color:#64748B;font-size:12px;">If you didn't request this, ignore this email.</p>
        <p style="color:#475569;font-size:11px;text-align:center;">© 2026 Wesoxch · Kisumu, Kenya 🌍</p>
      </div>
    `,
  });
};

const sendWelcome = async (email, fullName) => {
  await transporter.sendMail({
    from: `"Wesoxch 🌍" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Wesoxch! 🌍',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0F172A;color:#fff;padding:32px;border-radius:16px;">
        <h1 style="color:#22C55E;">🌍 Wesoxch</h1>
        <h2>Welcome, ${fullName || 'friend'}! 🎉</h2>
        <p style="color:#94A3B8;">Your account is verified. You are now part of Wesoxch.</p>
        <p style="color:#475569;font-size:11px;text-align:center;">© 2026 Wesoxch · Kisumu, Kenya 🌍</p>
      </div>
    `,
  });
};

module.exports = { sendOTP, sendWelcome };
