const pool = require('../config/db');

const addPhoneColumns = async () => {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phone_otps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_phone_otps ON phone_otps(phone);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'geographic',
        location_name VARCHAR(255),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS premium_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Phone schema updated successfully');
  } catch (err) {
    console.error('Schema error:', err.message);
  }
};

addPhoneColumns().then(() => process.exit(0));
