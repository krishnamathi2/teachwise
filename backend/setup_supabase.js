// Script to apply all database migrations to Supabase
// Run: node setup_supabase.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(fileName) {
  console.log(`\n📄 Running migration: ${fileName}`);
  
  try {
    const sqlPath = path.join(__dirname, 'migrations', fileName);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL by statement and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create index') ||
          statement.toLowerCase().includes('select')) {
        
        // Use Supabase's RPC to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          // If RPC doesn't exist, try direct query
          console.warn('⚠️ RPC method not available, trying alternative approach...');
          
          // For table creation, we need to use Supabase REST API or psql
          // Let's just log the instructions instead
          console.log('✓ SQL statement prepared (needs manual execution)');
          console.log(statement.substring(0, 100) + '...');
        } else {
          console.log('✓ Statement executed successfully');
        }
      }
    }
    
    console.log(`✅ Migration completed: ${fileName}`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed: ${fileName}`, err.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying tables...');
  
  const tables = ['user_trials', 'user_logins', 'processed_transactions'];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      
      if (error) {
        console.error(`❌ Table '${tableName}' not accessible:`, error.message);
      } else {
        console.log(`✅ Table '${tableName}' exists and is accessible`);
      }
    } catch (err) {
      console.error(`❌ Error checking table '${tableName}':`, err.message);
    }
  }
}

async function setupSupabase() {
  console.log('🚀 Setting up Supabase database for TeachWise Backend\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  // Note: Supabase JS client doesn't support DDL directly
  // We need to use the SQL Editor or psql
  
  console.log('\n⚠️ IMPORTANT: Supabase JS client cannot execute DDL (CREATE TABLE) directly.');
  console.log('You have two options:\n');
  
  console.log('Option 1 - Use Supabase Dashboard (RECOMMENDED):');
  console.log('  1. Open: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);
  console.log('  2. Go to SQL Editor');
  console.log('  3. Copy and run the SQL from: backend/migrations/create_all_tables.sql\n');
  
  console.log('Option 2 - Use psql command line:');
  console.log('  Get your DATABASE_URL from Supabase Dashboard → Settings → Database');
  console.log('  Then run:');
  console.log('  psql "your-database-url" -f backend/migrations/create_all_tables.sql\n');
  
  console.log('📄 SQL file location: backend/migrations/create_all_tables.sql');
  
  // Show the SQL content
  const sqlPath = path.join(__dirname, 'migrations', 'create_all_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('\n' + '='.repeat(60));
  console.log('SQL TO EXECUTE IN SUPABASE:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  
  // Verify if tables already exist
  await verifyTables();
  
  console.log('\n✨ After running the SQL, restart your backend to load data from Supabase!');
}

setupSupabase().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
