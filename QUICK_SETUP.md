# 🚀 TeachWise Credits System - Quick Setup Guide

## Step 1: Get Your Supabase Service Key

1. **Go to your Supabase project**: https://supabase.com/dashboard/projects
2. **Open your project**: jaelyccdavvorfxpucdb
3. **Go to Settings** → **API**
4. **Copy the `service_role` key** (not the anon key)
5. **Update your backend/.env file**:

```env
SUPABASE_SERVICE_KEY=your_actual_service_key_here
```

## Step 2: Execute Database Schema

1. **Go to your Supabase project dashboard**
2. **Click on "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Copy and paste this SQL** (execute in this exact order):

```sql
-- ===== STEP 1: Create users table (if it doesn't exist) =====
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    credits INTEGER DEFAULT 10,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    last_credit_reset DATE,
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===== STEP 1b: If users table already exists, add credits columns =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_credit_reset DATE;

-- ===== STEP 2: Create credit transactions table =====
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    operation_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- ===== STEP 3: Create credit packages table =====
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    price_inr DECIMAL(10,2) NOT NULL,
    stripe_price_id TEXT,
    razorpay_plan_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== STEP 4: Create subscription plans table =====
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    monthly_credits INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    price_inr DECIMAL(10,2) NOT NULL,
    stripe_price_id TEXT,
    razorpay_plan_id TEXT,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== STEP 5: Create user subscriptions table =====
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT,
    razorpay_subscription_id TEXT,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== STEP 6: Add indexes for performance =====
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- ===== STEP 7: Insert credit packages (₹100 = 200 credits) =====
INSERT INTO credit_packages (name, credits, price_usd, price_inr) VALUES
('Starter Pack', 50, 1.99, 50),
('Power Pack', 200, 4.99, 100),
('Mega Pack', 500, 9.99, 250),
('Ultra Pack', 1000, 19.99, 500),
('Enterprise Pack', 2500, 49.99, 1250)
ON CONFLICT DO NOTHING;

-- ===== STEP 8: Insert subscription plans =====
INSERT INTO subscription_plans (name, tier, monthly_credits, price_usd, price_inr, features) VALUES
('Basic Plan', 'basic', 100, 2.99, 149, '["100 credits/month", "All AI tools", "Email support"]'),
('Pro Plan', 'pro', 500, 7.99, 399, '["500 credits/month", "All AI tools", "Priority support", "Custom templates"]'),
('Enterprise Plan', 'enterprise', 999999, 19.99, 999, '["Unlimited credits", "All AI tools", "Priority support", "Custom templates", "API access", "Team management"]')
ON CONFLICT DO NOTHING;

-- ===== STEP 9: Create credit management functions =====
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_credits INTEGER;
BEGIN
    SELECT credits INTO user_credits 
    FROM users 
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_credits, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deduct_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    operation_type TEXT,
    operation_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    new_credits INTEGER;
BEGIN
    SELECT credits INTO current_credits 
    FROM users 
    WHERE id = user_uuid;
    
    IF current_credits < credit_amount THEN
        RETURN FALSE;
    END IF;
    
    new_credits := current_credits - credit_amount;
    
    UPDATE users 
    SET credits = new_credits 
    WHERE id = user_uuid;
    
    INSERT INTO credit_transactions (
        user_id, 
        transaction_type, 
        amount, 
        operation_type, 
        description
    ) VALUES (
        user_uuid, 
        'deduction', 
        -credit_amount, 
        operation_type, 
        operation_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_type TEXT DEFAULT 'purchase',
    description TEXT DEFAULT NULL,
    metadata_json JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    new_credits INTEGER;
BEGIN
    SELECT credits INTO current_credits 
    FROM users 
    WHERE id = user_uuid;
    
    new_credits := current_credits + credit_amount;
    
    UPDATE users 
    SET credits = new_credits 
    WHERE id = user_uuid;
    
    INSERT INTO credit_transactions (
        user_id, 
        transaction_type, 
        amount, 
        description,
        metadata
    ) VALUES (
        user_uuid, 
        transaction_type, 
        credit_amount, 
        description,
        metadata_json
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## Step 3: Verify Setup

Run this verification query in Supabase SQL Editor:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('credit_transactions', 'credit_packages', 'subscription_plans', 'user_subscriptions');

-- Check credit packages
SELECT * FROM credit_packages ORDER BY credits;

-- Check subscription plans  
SELECT * FROM subscription_plans ORDER BY price_inr;
```

## Step 4: Test the System

1. **Visit**: http://localhost:3002/credits-test
2. **Sign up/Login** with any email
3. **Test the credit functions** using the buttons
4. **Check Supabase** to see if transactions are recorded

## 🎯 Expected Results:

- ✅ 4 tables created successfully
- ✅ 5 credit packages inserted (50, 200, 500, 1000, 2500 credits)
- ✅ 3 subscription plans inserted (Basic, Pro, Enterprise)
- ✅ Credit functions working (get, add, deduct)
- ✅ Frontend test page working

---

**Need Help?** Check the console in your browser for any errors, and verify your Supabase service key is correct in `backend/.env`.