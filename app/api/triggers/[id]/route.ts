import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseTriggerRepository } from '@/src/infrastructure/database';

/**
 * GET /api/triggers/[id]
 * Get a single trigger by ID
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

    return NextResponse.json({ trigger });
  } catch (error) {
    console.error('Error fetching trigger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trigger' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/triggers/[id]
 * Update a trigger
 */
export async function PATCH(
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
    const existingTrigger = await triggerRepo.findById(params.id);

    if (!existingTrigger) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
    }

    // Verify user owns this trigger
    if (existingTrigger.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate webhook URL if provided
    if (body.webhookUrl) {
      try {
        new URL(body.webhookUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid webhook URL' },
          { status: 400 }
        );
      }
    }

    const trigger = await triggerRepo.update(params.id, {
      name: body.name,
      description: body.description,
      config: body.config,
      webhookUrl: body.webhookUrl,
      webhookHeaders: body.webhookHeaders,
      webhookMethod: body.webhookMethod,
      isActive: body.isActive,
    });

    return NextResponse.json({ trigger });
  } catch (error) {
    console.error('Error updating trigger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update trigger' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/triggers/[id]
 * Delete a trigger
 */
export async function DELETE(
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
    const existingTrigger = await triggerRepo.findById(params.id);

    if (!existingTrigger) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
    }

    // Verify user owns this trigger
    if (existingTrigger.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await triggerRepo.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trigger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete trigger' },
      { status: 500 }
    );
  }
}
