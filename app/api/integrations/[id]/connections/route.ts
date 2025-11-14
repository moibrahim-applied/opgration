import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: integrationId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspaceSlug');
    const organizationId = searchParams.get('organizationId');
    const projectId = searchParams.get('projectId');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('connections')
      .select(`
        id,
        name,
        organization_id,
        project_id,
        is_active,
        created_at,
        organizations(id, name, slug),
        projects(id, name, slug)
      `)
      .eq('integration_id', integrationId)
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Filter by organization - support both slug and ID
    if (workspaceSlug) {
      // Get organization by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', workspaceSlug)
        .single();

      if (orgError || !org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      query = query.eq('organization_id', org.id);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Get all active connections for this integration
    const { data: connections, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    return NextResponse.json({
      connections: connections || [],
      hasConnections: connections && connections.length > 0
    });
  } catch (error) {
    console.error('Error in connections endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
