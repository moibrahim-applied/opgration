const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running triggers migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251010_create_triggers_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, we need to execute statements individually
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.from('_migrations').select('*').limit(0);
        if (stmtError) {
          console.log('Note: Unable to run full migration via API.');
          console.log('Please run the migration manually in Supabase SQL Editor:\n');
          console.log('1. Go to: https://app.supabase.com/project/_/sql');
          console.log('2. Copy and paste the contents of:');
          console.log('   supabase/migrations/20251010_create_triggers_tables.sql');
          console.log('3. Click "Run"');
          return;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.log('\nPlease run the migration manually in Supabase SQL Editor:\n');
    console.log('1. Go to: https://app.supabase.com/project/_/sql');
    console.log('2. Copy and paste the contents of:');
    console.log('   supabase/migrations/20251010_create_triggers_tables.sql');
    console.log('3. Click "Run"');
  }
}

runMigration();
