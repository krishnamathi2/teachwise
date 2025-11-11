-- Migration: Create user_trials table
-- Purpose: Store user signup and subscription data
-- Updated: Added IP tracking and trial usage flag

CREATE TABLE IF NOT EXISTS user_trials (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  credits INTEGER DEFAULT 0,
  ip_address VARCHAR(100),
  trial_used BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_trials_email ON user_trials(email);
CREATE INDEX IF NOT EXISTS idx_user_trials_ip ON user_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_trials_email_ip ON user_trials(email, ip_address);
