# Backend migrations and E2E

This folder contains scripts and instructions for running end-to-end tests and DB migrations.

## Run E2E Puppeteer test

Make sure frontend and backend are running (frontend default: http://localhost:3001, backend: http://localhost:3003).

From the `backend` folder:

```powershell
npm run e2e
```

This runs `puppeteer_test.js` (headless) which simulates the UPI payment confirmation flow.

## Database migrations

If using Supabase (or Postgres), you need to create three tables for the backend to persist data across restarts:

1. **user_trials** - Stores user signups and subscriptions
2. **user_logins** - Tracks login events for admin monitoring  
3. **processed_transactions** - Prevents duplicate payment processing

Run the SQL migrations in this order:

```powershell
# Option 1: Run all migrations at once (PowerShell)
psql $env:DATABASE_URL -f migrations/create_user_trials.sql
psql $env:DATABASE_URL -f migrations/create_user_logins.sql
psql $env:DATABASE_URL -f migrations/create_processed_transactions.sql

# Option 2: Use the admin panel UI
# Navigate to /admin/backend-tools, paste your admin JWT, and click "Run Migration"
```

Or use the included GitHub Actions workflow (requires `DATABASE_URL` secret): .github/workflows/migrate.yml — open the Actions tab and run "Apply DB Migrations".

**Note**: If tables are missing, the backend will log warnings and fall back to memory-only storage. The SQL for creating tables will be printed in the console.

## Admin panel: run migrations & manage processed transactions

A simple admin UI is available in the frontend at `/admin/backend-tools` (Next dev server). It provides buttons to:

- View the migration SQL (`processed_transactions` table)
- Copy the SQL to clipboard
- Attempt to run the migration on the server (this runs `psql` against `DATABASE_URL` if set on the server)
- Reload processed transactions from the database into the backend in-memory set
- List recent processed transactions
- Manually add a processed transaction record

How it works:
- The frontend page calls Next API proxy endpoints under `/api/admin/*`, which forward requests to the backend (`http://localhost:3003/admin/*`).
- The backend endpoints require the admin JWT (use your existing admin login flow/token). Paste the admin JWT into the page to authorize actions.

When `DATABASE_URL` is not configured on the server, the "Run Migration" button will return the SQL and instruct you to run it manually (recommended for production / managed DBs like Supabase where direct SQL execution from the app is not available).

Security note: The admin panel operations are sensitive — only use them in trusted environments. Ensure your admin token is kept private and do not expose this page to public users.
