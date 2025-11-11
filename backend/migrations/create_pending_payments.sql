-- Create table for pending payment submissions
CREATE TABLE IF NOT EXISTS pending_payments (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_payments_email ON pending_payments(email);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_transaction_id ON pending_payments(transaction_id);
