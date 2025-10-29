import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseTriggerRepository } from '@/src/infrastructure/database';

/**
 * GET /api/triggers/[id]/stats
 * Get statistics for a trigger
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

    const stats = await triggerRepo.getStatsByTriggerId(params.id);

    // Add trigger metadata to stats
    const response = {
      ...stats,
      trigger: {
        id: trigger.id,
        name: trigger.name,
        type: trigger.triggerType,
        isActive: trigger.isActive,
        lastCheckedAt: trigger.lastCheckedAt,
        lastTriggeredAt: trigger.lastTriggeredAt,
        errorCount: trigger.errorCount,
        createdAt: trigger.createdAt,
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching trigger stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
