import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseTriggerRepository } from '@/src/infrastructure/database';

/**
 * GET /api/triggers/[id]/events
 * Get event history for a trigger
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triggerRepo = new SupabaseTriggerRepository(supabase);
    const trigger = await triggerRepo.findById(params.id);

    if (!trigger) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
    }

    // Verify user owns this trigger
    if (trigger.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get limit from query params (default 50, max 100)
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;

    const events = await triggerRepo.findEventsByTriggerId(params.id, limit);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching trigger events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
