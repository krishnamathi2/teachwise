-- Migration: Create user_logins table
-- Purpose: Track user login events for admin monitoring

CREATE TABLE IF NOT EXISTS user_logins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_logins_email ON user_logins(email);

-- Create index on login_time for faster sorting
CREATE INDEX IF NOT EXISTS idx_user_logins_time ON user_logins(login_time DESC);
