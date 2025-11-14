import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspaceSlug');
    const projectId = searchParams.get('projectId');

    // Get the current user
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
        integrations (
          id,
          name,
          slug,
          logo_url,
          icon_svg
        ),
        organizations (
          id,
          name,
          slug
        ),
        projects (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id);

    // Filter by organization if workspaceSlug provided
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
    }

    // Filter by project if projectId provided
    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    // Get all connections for the user with integration details
    const { data: connections, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data
    const transformedConnections = (connections || []).map((conn: any) => ({
      id: conn.id,
      name: conn.name,
      isActive: conn.is_active,
      createdAt: conn.created_at,
      integration: {
        id: conn.integrations?.id,
        name: conn.integrations?.name,
        slug: conn.integrations?.slug,
        logoUrl: conn.integrations?.icon_svg || conn.integrations?.logo_url,
      },
      workspace: {
        id: conn.organizations?.id,
        name: conn.organizations?.name,
        slug: conn.organizations?.slug,
      },
      project: {
        id: conn.projects?.id,
        name: conn.projects?.name,
        slug: conn.projects?.slug,
      },
    }));

    return NextResponse.json({ connections: transformedConnections });
  } catch (error) {
    console.error('Connections API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
