import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseTriggerRepository, SupabaseConnectionRepository } from '@/src/infrastructure/database';
import { TriggerProcessorService } from '@/src/infrastructure/services';

/**
 * GET /api/cron/process-triggers
 * Cron endpoint to process all active triggers
 *
 * This endpoint should be called every 5 minutes by a cron service like:
 * - Vercel Cron
 * - GitHub Actions
 * - External cron service (cron-job.org, etc.)
 *
 * Security: Use CRON_SECRET environment variable to authenticate
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting trigger processing...');

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize repositories
    const triggerRepo = new SupabaseTriggerRepository(supabase);
    const connectionRepo = new SupabaseConnectionRepository(supabase);

    // Initialize processor service
    const processor = new TriggerProcessorService(triggerRepo, connectionRepo);

    // Process all active triggers
    await processor.processActiveTriggers();

    // Also retry failed events
    await processor.retryFailedEvents();

    console.log('[Cron] Trigger processing completed');

    return NextResponse.json({
      success: true,
      message: 'Triggers processed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Error processing triggers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;
