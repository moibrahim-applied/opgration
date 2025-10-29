import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connections for the user with integration details
    const { data: connections, error } = await supabase
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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
