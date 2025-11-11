-- Credits System Database Schema for TeachWise

-- Update users table to include credits
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_credit_reset DATE;

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'purchase', 'deduction', 'bonus', 'refund'
    amount INTEGER NOT NULL, -- positive for additions, negative for deductions
    operation_type TEXT, -- 'lesson_plan', 'quiz', 'presentation', 'quick_question'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- for storing additional info like payment_id, operation details
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
    tier TEXT NOT NULL, -- 'basic', 'pro', 'enterprise'
    monthly_credits INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    price_inr DECIMAL(10,2) NOT NULL,
    stripe_price_id TEXT,
    razorpay_plan_id TEXT,
    features JSONB, -- array of features
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
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'incomplete'
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credit packages (Updated pricing for India market)
INSERT INTO credit_packages (name, credits, price_usd, price_inr) VALUES
('Starter Pack', 50, 1.99, 50),
('Power Pack', 200, 4.99, 100),
('Mega Pack', 500, 9.99, 250),
('Ultra Pack', 1000, 19.99, 500),
('Enterprise Pack', 2500, 49.99, 1250);

-- Insert subscription plans (Updated for India market)
INSERT INTO subscription_plans (name, tier, monthly_credits, price_usd, price_inr, features) VALUES
('Basic Plan', 'basic', 100, 2.99, 149, '["100 credits/month", "All AI tools", "Email support"]'),
('Pro Plan', 'pro', 500, 7.99, 399, '["500 credits/month", "All AI tools", "Priority support", "Custom templates"]'),
('Enterprise Plan', 'enterprise', 999999, 19.99, 999, '["Unlimited credits", "All AI tools", "Priority support", "Custom templates", "API access", "Team management"]');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Function to get user's current credits
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
    -- Get current credits
    SELECT credits INTO current_credits 
    FROM users 
    WHERE id = user_uuid;
    
    -- Check if user has enough credits
    IF current_credits < credit_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct credits
    new_credits := current_credits - credit_amount;
    
    -- Update user credits
    UPDATE users 
    SET credits = new_credits 
    WHERE id = user_uuid;
    
    -- Record transaction
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
    -- Get current credits
    SELECT credits INTO current_credits 
    FROM users 
    WHERE id = user_uuid;
    
    -- Add credits
    new_credits := current_credits + credit_amount;
    
    -- Update user credits
    UPDATE users 
    SET credits = new_credits 
    WHERE id = user_uuid;
    
    -- Record transaction
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