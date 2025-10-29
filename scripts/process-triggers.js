/**
 * Standalone Trigger Processor Script
 *
 * This script can be run in two modes:
 * 1. One-time execution: node scripts/process-triggers.js
 * 2. Continuous polling: node scripts/process-triggers.js --watch
 *
 * For production, use a process manager like PM2:
 * pm2 start scripts/process-triggers.js --name "trigger-processor" -- --watch
 */

const { createClient } = require('@supabase/supabase-js');

// Dynamic imports for ESM modules
async function run() {
  const { SupabaseTriggerRepository } = require('../src/infrastructure/database/SupabaseTriggerRepository');
  const { SupabaseConnectionRepository } = require('../src/infrastructure/database/SupabaseConnectionRepository');
  const { TriggerProcessorService } = require('../src/infrastructure/services/TriggerProcessorService');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Initialize repositories
  const triggerRepo = new SupabaseTriggerRepository(supabase);
  const connectionRepo = new SupabaseConnectionRepository(supabase);

  // Initialize processor
  const processor = new TriggerProcessorService(triggerRepo, connectionRepo);

  async function processTriggers() {
    const startTime = Date.now();
    console.log(`\n[${ new Date().toISOString()}] 🔄 Processing triggers...`);

    try {
      // Process active triggers
      await processor.processActiveTriggers();

      // Retry failed events
      await processor.retryFailedEvents();

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ✓ Processing completed in ${duration}ms`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ✗ Error:`, error);
    }
  }

  // Check if running in watch mode
  const watchMode = process.argv.includes('--watch') || process.argv.includes('-w');

  if (watchMode) {
    console.log('🔁 Starting trigger processor in watch mode (every 5 minutes)...');
    console.log('   Press Ctrl+C to stop\n');

    // Run immediately
    await processTriggers();

    // Then run every 5 minutes
    setInterval(processTriggers, 5 * 60 * 1000);
  } else {
    // Run once and exit
    await processTriggers();
    console.log('\n✓ Done! Run with --watch to keep running');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down trigger processor...');
  process.exit(0);
});

// Run
run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
