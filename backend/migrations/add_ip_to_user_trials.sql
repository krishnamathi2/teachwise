-- Migration: Add IP address tracking to user_trials table
-- Purpose: Enforce one trial per email AND one trial per IP address

-- Add IP address column
ALTER TABLE user_trials 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);

-- Add trial_used flag to track if trial has been consumed
ALTER TABLE user_trials 
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;

-- Create index on IP address for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_trials_ip ON user_trials(ip_address);

-- Create composite index for email and IP lookups
CREATE INDEX IF NOT EXISTS idx_user_trials_email_ip ON user_trials(email, ip_address);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_trials' 
ORDER BY ordinal_position;
