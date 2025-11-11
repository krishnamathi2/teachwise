# 🔧 SIMPLIFIED DATABASE SETUP - Execute Step by Step

## ❌ **The Issue:** 
SQL syntax error was caused by mixed up statements in the script.

## ✅ **SOLUTION: Execute These Steps One by One**

### **STEP 1: Create Basic Tables**
```sql
-- Create users table
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### **STEP 2: Create Credits Tables**
```sql
-- Credit transactions table
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

-- Credit packages table
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

-- Subscription plans table
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

-- User subscriptions table
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
```

### **STEP 3: Create Indexes**
```sql
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
```

### **STEP 4: Insert Sample Data**
```sql
-- Insert credit packages (₹100 = 200 credits)
INSERT INTO credit_packages (name, credits, price_usd, price_inr) VALUES
('Starter Pack', 50, 1.99, 50),
('Power Pack', 200, 4.99, 100),
('Mega Pack', 500, 9.99, 250),
('Ultra Pack', 1000, 19.99, 500),
('Enterprise Pack', 2500, 49.99, 1250)
ON CONFLICT DO NOTHING;

-- Insert subscription plans
INSERT INTO subscription_plans (name, tier, monthly_credits, price_usd, price_inr, features) VALUES
('Basic Plan', 'basic', 100, 2.99, 149, '["100 credits/month", "All AI tools", "Email support"]'),
('Pro Plan', 'pro', 500, 7.99, 399, '["500 credits/month", "All AI tools", "Priority support", "Custom templates"]'),
('Enterprise Plan', 'enterprise', 999999, 19.99, 999, '["Unlimited credits", "All AI tools", "Priority support", "Custom templates", "API access", "Team management"]')
ON CONFLICT DO NOTHING;
```

### **STEP 5: Create Functions**
```sql
-- Function to get user credits
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

-- Function to deduct credits
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

-- Function to add credits
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

### **STEP 6: Create Test User**
```sql
-- Create test user
INSERT INTO users (email, full_name, credits) VALUES 
('test@teachwise.com', 'Test User', 100)
ON CONFLICT (email) DO NOTHING;
```

### **STEP 7: Verify Setup**
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'credit_transactions', 'credit_packages', 'subscription_plans', 'user_subscriptions')
ORDER BY table_name;

-- Check credit packages
SELECT name, credits, price_inr FROM credit_packages ORDER BY credits;

-- Check test user
SELECT email, credits, subscription_tier FROM users WHERE email = 'test@teachwise.com';

-- Test credit function
SELECT get_user_credits((SELECT id FROM users WHERE email = 'test@teachwise.com' LIMIT 1));
```

---

## 🚀 **Instructions:**

1. **Open Supabase SQL Editor**
2. **Execute each step one by one** (copy each SQL block separately)
3. **Check for errors** after each step
4. **Run the verification queries** at the end

**This step-by-step approach will help identify any issues and ensure everything works correctly!** ✅