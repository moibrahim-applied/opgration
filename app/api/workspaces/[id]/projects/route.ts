import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Use getClaims() for fast local JWT verification
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;

    const { id: workspaceId } = await params;

    // Get projects for this workspace - simple and fast
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, slug, description, created_at')
      .eq('organization_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return projects without connection counts for faster loading
    // Connection counts can be fetched separately if needed
    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Use getClaims() for fast local JWT verification
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;

    const { id: workspaceId } = await params;

    // Verify user has access to create projects in this workspace
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, slug: providedSlug } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Use provided slug or create one from name
    const slug = providedSlug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.' }, { status: 400 });
    }

    // Create the project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        organization_id: workspaceId,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating project:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Create project API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
