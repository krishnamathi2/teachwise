-- Create table for password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
