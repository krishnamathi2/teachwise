# Trial Restrictions Migration Guide

## Overview
This migration adds IP address tracking and trial usage enforcement to ensure:
- **One trial per email address**
- **One trial per IP address**
- **20-minute time limit** for trial usage

## Changes Made

### 1. Database Schema Updates

#### New Columns in `user_trials` Table:
- `ip_address` (VARCHAR(100)) - Stores the IP address used during trial signup
- `trial_used` (BOOLEAN) - Tracks whether the trial has been consumed

#### New Indexes:
- `idx_user_trials_ip` - Fast lookup by IP address
- `idx_user_trials_email_ip` - Composite index for email + IP checks

### 2. Backend Logic Updates

#### Trial Eligibility Checks:
1. ✅ Check if email has already used a trial
2. ✅ Check if IP address has already used a trial
3. ✅ Enforce 20-minute time limit
4. ✅ Mark trial as used when:
   - Credits run out (< 10 credits remaining)
   - Trial period expires (20 minutes)
   - Credits are exhausted

#### Enhanced Tracking:
- IP address captured on first login
- Trial usage status persisted to database
- Prevents multiple trials from same device/network

## Migration Steps

### Option 1: Fresh Setup (Recommended)
If you haven't deployed yet or can reset the database:

1. **Drop and recreate the table:**
```sql
DROP TABLE IF EXISTS user_trials CASCADE;
```

2. **Run the complete migration:**
```sql
-- Copy from: backend/migrations/create_user_trials.sql
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
```

### Option 2: Update Existing Table (Production)
If you have existing users and want to preserve data:

1. **Add new columns to existing table:**
```sql
-- Copy from: backend/migrations/add_ip_to_user_trials.sql
ALTER TABLE user_trials 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);

ALTER TABLE user_trials 
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_trials_ip ON user_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_trials_email_ip ON user_trials(email, ip_address);
```

2. **Update existing records (optional):**
```sql
-- Mark all existing free trial users as having used their trial
UPDATE user_trials 
SET trial_used = true 
WHERE paid_amount = 0 AND credits < 10;
```

## Testing the Changes

### 1. Restart Backend Server
```bash
cd backend
node index.js
```

### 2. Test Scenarios

#### Scenario A: New User (Should Work)
```bash
# First trial from email/IP
curl "http://localhost:3003/trial-status?email=newuser@example.com"
```
Expected: `credits: 100`, `trialExpired: false`

#### Scenario B: Same Email, Second Trial (Should Fail)
```bash
# Wait for trial to expire or use up credits, then try again
curl "http://localhost:3003/trial-status?email=newuser@example.com"
```
Expected: `credits: 0`, `trialExpired: true`, message about trial already used

#### Scenario C: Different Email, Same IP (Should Fail)
```bash
# From same IP/device, try different email
curl "http://localhost:3003/trial-status?email=anotheremail@example.com"
```
Expected: `credits: 0`, `trialExpired: true`, message about IP already used trial

### 3. Verify in Supabase Dashboard

Navigate to: https://jaelyccdavvorfxpucdb.supabase.co

Check `user_trials` table:
```sql
SELECT email, ip_address, trial_used, credits, registered_at 
FROM user_trials 
ORDER BY registered_at DESC;
```

## Admin Panel Changes

The admin panel will now show:
- ✅ IP address for each user
- ✅ Trial usage status
- ✅ Time remaining in trial period

## Rollback Plan

If you need to rollback:

```sql
-- Remove new columns
ALTER TABLE user_trials DROP COLUMN IF EXISTS ip_address;
ALTER TABLE user_trials DROP COLUMN IF EXISTS trial_used;

-- Remove indexes
DROP INDEX IF EXISTS idx_user_trials_ip;
DROP INDEX IF EXISTS idx_user_trials_email_ip;
```

## Configuration

Current trial limits (in `backend/index.js`):
```javascript
const CREDITS_CONFIG = {
  FREE_TRIAL_CREDITS: 100,      // Credits given on signup
  CREDITS_PER_GENERATE: 10,     // Credits deducted per generation
  TRIAL_PERIOD_MINUTES: 20,     // Time limit for trial
  PRICE_PER_CREDIT: 1,          // ₹1 per credit
};
```

To change the time limit, update `TRIAL_PERIOD_MINUTES` and restart the server.

## Troubleshooting

### Issue: "IP already used trial" for valid users
**Cause:** Multiple users behind same corporate/home network
**Solution:** Users can subscribe to bypass trial restrictions

### Issue: Existing users can't access after migration
**Cause:** `trial_used` not set correctly
**Solution:**
```sql
-- Allow specific user to continue
UPDATE user_trials SET trial_used = false WHERE email = 'user@example.com';

-- Or add credits
UPDATE user_trials SET credits = 100 WHERE email = 'user@example.com';
```

### Issue: Trial time limit not working
**Cause:** Server timezone or system time incorrect
**Solution:** Check server time with `date` command, ensure NTP is configured

## Next Steps

1. ✅ Run the migration SQL in Supabase
2. ✅ Restart the backend server
3. ✅ Test with multiple emails and IPs
4. ✅ Monitor admin panel for trial usage patterns
5. ✅ Update frontend to show time remaining indicator

## Support

If you encounter issues:
1. Check backend console logs for detailed error messages
2. Verify Supabase connection in backend/.env
3. Test endpoints with curl to isolate frontend/backend issues
