import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Use getClaims() for fast local JWT verification
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;

    // Get workspaces (organizations) where user is a member
    // Use a single query with aggregations to avoid N+1 queries
    const { data: workspaces, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        created_at,
        organization_members!inner(role)
      `)
      .eq('organization_members.user_id', userId);

    if (error) {
      console.error('Error fetching workspaces:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Simple transform without extra queries - counts can be added later if needed
    const transformedWorkspaces = (workspaces || []).map((workspace: any) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: workspace.organization_members[0]?.role || 'member',
      createdAt: workspace.created_at,
    }));

    return NextResponse.json({ workspaces: transformedWorkspaces });
  } catch (error) {
    console.error('Workspaces API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Use getClaims() for fast local JWT verification
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;

    const body = await request.json();
    const { name, slug: providedSlug } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    // Use provided slug or create one from name
    const slug = providedSlug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.' }, { status: 400 });
    }

    // Create the organization
    const { data: workspace, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        slug,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating workspace:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Add the current user as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: workspace.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding user as owner:', memberError);
      // Try to clean up the created workspace
      await supabase.from('organizations').delete().eq('id', workspace.id);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Create workspace API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
