import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: integrationId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active connections for this integration
    const { data: connections, error } = await supabase
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
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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
