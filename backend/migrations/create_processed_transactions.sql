-- SQL to create processed_transactions table for persisting processed UPI transactions

CREATE TABLE IF NOT EXISTS processed_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  plan_type VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_transactions_txid ON processed_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_processed_transactions_email ON processed_transactions(email);
