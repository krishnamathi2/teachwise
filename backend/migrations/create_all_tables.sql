-- Complete database setup for TeachWise Backend
-- Run this SQL in Supabase SQL Editor to create all required tables

-- ==========================================
-- 1. User Trials Table (User Signups & Subscriptions)
-- ==========================================
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

CREATE INDEX IF NOT EXISTS idx_user_trials_email ON user_trials(email);
CREATE INDEX IF NOT EXISTS idx_user_trials_ip ON user_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_trials_email_ip ON user_trials(email, ip_address);

-- ==========================================
-- 2. User Logins Table (Login Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_logins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_logins_email ON user_logins(email);
CREATE INDEX IF NOT EXISTS idx_user_logins_time ON user_logins(login_time DESC);

-- ==========================================
-- 3. Processed Transactions Table (Payment Idempotency)
-- ==========================================
CREATE TABLE IF NOT EXISTS processed_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2),
  plan_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_transactions_tx ON processed_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_processed_transactions_email ON processed_transactions(email);

-- ==========================================
-- Verification: List all created tables
-- ==========================================
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('user_trials', 'user_logins', 'processed_transactions')
ORDER BY tablename;
