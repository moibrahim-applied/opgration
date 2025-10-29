import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseTriggerRepository } from '@/src/infrastructure/database';

/**
 * GET /api/triggers
 * List all triggers for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triggerRepo = new SupabaseTriggerRepository(supabase);
    const triggers = await triggerRepo.findByUserId(user.id);

    // Enrich with integration and connection details
    const enrichedTriggers = await Promise.all(
      triggers.map(async (trigger) => {
        // Fetch integration
        const { data: integration } = await supabase
          .from('integrations')
          .select('id, name, slug, logo_url, icon_svg')
          .eq('id', trigger.integrationId)
          .single();

        // Fetch connection
        const { data: connection } = await supabase
          .from('connections')
          .select('id, name')
          .eq('id', trigger.connectionId)
          .single();

        return {
          ...trigger,
          integration: integration ? {
            id: integration.id,
            name: integration.name,
            slug: integration.slug,
            logoUrl: integration.icon_svg || integration.logo_url,
          } : null,
          connection: connection ? {
            id: connection.id,
            name: connection.name,
          } : null,
        };
      })
    );

    return NextResponse.json({ triggers: enrichedTriggers });
  } catch (error) {
    console.error('Error fetching triggers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch triggers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/triggers
 * Create a new trigger
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['workspaceId', 'projectId', 'connectionId', 'integrationId', 'name', 'triggerType', 'webhookUrl'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate webhook URL
    try {
      new URL(body.webhookUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    const triggerRepo = new SupabaseTriggerRepository(supabase);

    const trigger = await triggerRepo.create({
      userId: user.id,
      workspaceId: body.workspaceId,
      projectId: body.projectId,
      connectionId: body.connectionId,
      integrationId: body.integrationId,
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      config: body.config || {},
      webhookUrl: body.webhookUrl,
      webhookHeaders: body.webhookHeaders,
      webhookMethod: body.webhookMethod || 'POST',
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    return NextResponse.json({ trigger }, { status: 201 });
  } catch (error) {
    console.error('Error creating trigger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create trigger' },
      { status: 500 }
    );
  }
}
