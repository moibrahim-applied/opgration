import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Use getClaims() for faster auth
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;

    const { id: connectionId } = await params;

    // Get connection with integration details
    const { data: connection, error } = await supabase
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
          description,
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
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (error || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get integration actions with request schema
    const { data: actions } = await supabase
      .from('integration_actions')
      .select('id, name, slug, description, http_method, request_schema')
      .eq('integration_id', (connection.integrations as any).id)
      .order('name');

    // Transform the data
    const transformedConnection = {
      id: connection.id,
      name: connection.name,
      organization_id: connection.organization_id,
      project_id: connection.project_id,
      is_active: connection.is_active,
      created_at: connection.created_at,
      integrations: {
        id: (connection.integrations as any).id,
        name: (connection.integrations as any).name,
        slug: (connection.integrations as any).slug,
        description: (connection.integrations as any).description,
        logo_url: (connection.integrations as any).logo_url,
        icon_svg: (connection.integrations as any).icon_svg,
      },
      organizations: (connection.organizations as any),
      projects: (connection.projects as any),
    };

    return NextResponse.json({
      connection: transformedConnection,
      actions: actions || []
    });
  } catch (error) {
    console.error('Get connection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Use getClaims() for faster auth
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;
    const { id: connectionId } = await params;

    // Verify the connection belongs to the user
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('id, user_id')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete the connection (cascades will handle related records)
    const { error: deleteError } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Delete connection error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete connection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
