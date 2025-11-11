# 🚀 Supabase Database Setup Guide

## Quick Setup (2 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: **https://supabase.com/dashboard/project/jaelyccdavvorfxpucdb**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy & Run the SQL

Copy ALL the SQL below and paste it into the SQL Editor, then click **RUN**:

```sql
-- Complete database setup for TeachWise Backend
-- This creates all 3 required tables

-- ==========================================
-- 1. User Trials Table (User Signups & Subscriptions)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_trials (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  credits INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_trials_email ON user_trials(email);

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
```

### Step 3: Verify Tables Created

After running the SQL, you should see:
- ✅ "Success. No rows returned"

Then click on **Table Editor** in the left sidebar and verify you see:
- ✅ `user_trials`
- ✅ `user_logins`
- ✅ `processed_transactions`

### Step 4: Restart Backend

```powershell
cd backend
npm start
```

You should see in the console:
```
✓ Database table verified
📁 Loaded 0 users from database
🔁 Loaded 0 processed transactions from database
TeachWise backend running on http://localhost:3003
```

## ✅ Test It Works

### Test 1: Create a user login
```powershell


```

Backend console should show:
```
📝 Login tracked: test@example.com from ::1
Creating new user: test@example.com with 100 free credits (20-minute trial)
✅ User saved to Supabase: test@example.com
```

### Test 2: Check Supabase Dashboard
- Go to **Table Editor** → **user_trials**
- You should see the new user: `test@example.com`

- Go to **Table Editor** → **user_logins**
- You should see the login record

## 🎉 Done!

All user data will now be stored in Supabase:
- ✅ User signups → `user_trials` table
- ✅ User logins → `user_logins` table
- ✅ Payment transactions → `processed_transactions` table

---

## Troubleshooting

**Problem: "Table does not exist" error**
- Solution: Make sure you ran the SQL in Step 2

**Problem: Backend shows "Supabase not configured"**
- Solution: Check your `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

**Problem: "Permission denied" error**
- Solution: Make sure you're using `SUPABASE_SERVICE_KEY` (not the anon key) in `.env`
