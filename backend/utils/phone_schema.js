const pool = require('../config/db');

const addPhoneColumns = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to database...');
    
    // Create uuid extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('UUID extension ready');

    // Add phone columns to users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
    `);
    console.log('Phone columns added to users');

    // Add unique index separately (safer)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone 
      ON users(phone_number) 
      WHERE phone_number IS NOT NULL;
    `);
    console.log('Phone index created');

    // Create phone_otps table
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_otps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('phone_otps table ready');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_otps_phone 
      ON phone_otps(phone);
    `);

    // Create community_requests table
    await client.query(`
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
    console.log('community_requests table ready');

    // Create premium_subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS premium_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('premium_subscriptions table ready');

    console.log('');
    console.log('ALL SCHEMA UPDATES COMPLETE');
    
  } catch (err) {
    console.error('Schema error details:');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('Detail:', err.detail);
    console.error('Full error:', JSON.stringify(err, null, 2));
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

addPhoneColumns();
