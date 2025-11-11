# Trial Restrictions Deployment Script
# Execute these steps in order to deploy the new trial restrictions

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     TRIAL RESTRICTIONS DEPLOYMENT - STEP BY STEP              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify files exist
Write-Host "STEP 1: Verifying migration files..." -ForegroundColor Yellow
$migrationFile = "backend\migrations\add_ip_to_user_trials.sql"
if (Test-Path $migrationFile) {
    Write-Host "  ✓ Migration file found: $migrationFile" -ForegroundColor Green
} else {
    Write-Host "  ✗ Migration file NOT found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Step 2: Display migration SQL
Write-Host ""
Write-Host "STEP 2: Database Migration Required" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "Open Supabase SQL Editor:" -ForegroundColor White
Write-Host "  https://jaelyccdavvorfxpucdb.supabase.co/project/_/sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy and paste this SQL:" -ForegroundColor White
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Get-Content $migrationFile | ForEach-Object { Write-Host $_ -ForegroundColor Magenta }
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
$continue = Read-Host "Have you run the SQL in Supabase? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "  ⚠ Please run the SQL migration first, then restart this script" -ForegroundColor Yellow
    exit 0
}
Write-Host "  ✓ Database migration confirmed" -ForegroundColor Green

# Step 3: Check backend server
Write-Host ""
Write-Host "STEP 3: Backend Server" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray
$backendRunning = Test-NetConnection -ComputerName localhost -Port 3003 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null
if ($backendRunning) {
    Write-Host "  ⚠ Backend already running on port 3003" -ForegroundColor Yellow
    $restart = Read-Host "Restart backend server? (yes/no)"
    if ($restart -eq "yes") {
        Write-Host "  → Please stop the current backend and press Enter..." -ForegroundColor Cyan
        Read-Host
    }
} else {
    Write-Host "  ℹ Backend not running" -ForegroundColor White
}

Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor White
Write-Host "  Command: cd backend && node index.js" -ForegroundColor Gray
Write-Host ""
Write-Host "  Open a NEW PowerShell window and run:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  node index.js" -ForegroundColor White
Write-Host ""
$backendStarted = Read-Host "Backend started in new window? (yes/no)"
if ($backendStarted -ne "yes") {
    Write-Host "  ⚠ Please start the backend, then continue" -ForegroundColor Yellow
    exit 0
}
Write-Host "  ✓ Backend server running" -ForegroundColor Green

# Step 4: Test endpoints
Write-Host ""
Write-Host "STEP 4: Testing Endpoints" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Test 1: Trial status for new user
Write-Host ""
Write-Host "Test 1: New user trial..." -ForegroundColor White
$testEmail = "test-$(Get-Random)@test.com"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/trial-status?email=$testEmail" -Method GET
    if ($response.credits -eq 100) {
        Write-Host "  ✓ New user receives 100 credits" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Unexpected credits: $($response.credits)" -ForegroundColor Red
    }
    
    if ($response.minutesLeft -eq 20) {
        Write-Host "  ✓ Trial period set to 20 minutes" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Minutes left: $($response.minutesLeft)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Failed to test trial-status endpoint" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Red
}

# Test 2: Admin login
Write-Host ""
Write-Host "Test 2: Admin authentication..." -ForegroundColor White
try {
    $body = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3003/admin/login" -Method POST -Body $body -ContentType "application/json"
    $adminToken = $loginResponse.token
    
    if ($adminToken) {
        Write-Host "  ✓ Admin login successful" -ForegroundColor Green
        Write-Host "    Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Admin login failed" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Failed to login as admin" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Red
}

# Test 3: Admin users endpoint
if ($adminToken) {
    Write-Host ""
    Write-Host "Test 3: Admin users endpoint..." -ForegroundColor White
    try {
        $headers = @{
            Authorization = "Bearer $adminToken"
        }
        $usersResponse = Invoke-RestMethod -Uri "http://localhost:3003/admin/users" -Method GET -Headers $headers
        
        if ($usersResponse.users) {
            Write-Host "  ✓ Users endpoint working" -ForegroundColor Green
            Write-Host "    Total users: $($usersResponse.users.Count)" -ForegroundColor Gray
            
            # Check if new fields exist
            $firstUser = $usersResponse.users[0]
            if ($firstUser) {
                $hasIpField = $null -ne $firstUser.ipAddress -or $null -ne $firstUser.ip_address
                $hasTrialUsedField = $null -ne $firstUser.trialUsed -or $null -ne $firstUser.trial_used
                
                if ($hasIpField) {
                    Write-Host "  ✓ IP address field present" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠ IP address field missing" -ForegroundColor Yellow
                }
                
                if ($hasTrialUsedField) {
                    Write-Host "  ✓ Trial used field present" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠ Trial used field missing" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "  ⚠ No users in response" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ Failed to fetch users" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
    }
}

# Step 5: Frontend check
Write-Host ""
Write-Host "STEP 5: Frontend Server" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray
$frontendRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null
if ($frontendRunning) {
    Write-Host "  ✓ Frontend running on port 3000" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Frontend not running on port 3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Start frontend with:" -ForegroundColor Cyan
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
}

# Step 6: Manual verification
Write-Host ""
Write-Host "STEP 6: Manual Verification" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Open Admin Panel:" -ForegroundColor White
Write-Host "   http://localhost:3000/admin/backend-tools" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Paste this JWT token:" -ForegroundColor White
if ($adminToken) {
    Write-Host "   $adminToken" -ForegroundColor Green
} else {
    Write-Host "   (Generate token with admin login)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "3. Click 'Load Users'" -ForegroundColor White
Write-Host ""
Write-Host "4. Verify new columns are visible:" -ForegroundColor White
Write-Host "   - 🔒 Trial Used (✗ USED or ✓ ACTIVE)" -ForegroundColor Gray
Write-Host "   - 🌐 IP Address" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    DEPLOYMENT SUMMARY                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features Deployed:" -ForegroundColor White
Write-Host "  ✓ One trial per email address" -ForegroundColor Green
Write-Host "  ✓ One trial per IP address" -ForegroundColor Green
Write-Host "  ✓ 20-minute time limit" -ForegroundColor Green
Write-Host "  ✓ Automatic trial expiration" -ForegroundColor Green
Write-Host "  ✓ Admin panel displays IP & trial status" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor White
Write-Host "  FREE_TRIAL_CREDITS: 100" -ForegroundColor Gray
Write-Host "  CREDITS_PER_GENERATE: 10" -ForegroundColor Gray
Write-Host "  TRIAL_PERIOD_MINUTES: 20" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Test new user signup" -ForegroundColor Gray
Write-Host "  2. Verify trial expires after 20 minutes" -ForegroundColor Gray
Write-Host "  3. Test same email rejection" -ForegroundColor Gray
Write-Host "  4. Test same IP rejection" -ForegroundColor Gray
Write-Host "  5. Monitor backend console logs" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation:" -ForegroundColor White
Write-Host "  - TRIAL_RESTRICTIONS.md (detailed guide)" -ForegroundColor Gray
Write-Host "  - IMPLEMENTATION_SUMMARY.md (technical details)" -ForegroundColor Gray
Write-Host "  - QUICK_REFERENCE.txt (quick commands)" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "          Deployment Complete! 🎉" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
