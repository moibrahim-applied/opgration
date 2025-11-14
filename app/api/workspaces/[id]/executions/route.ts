import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseApiLogRepository } from '@/src/infrastructure/database';
import { ApiLogFilters, PaginationOptions } from '@/src/domain';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;
    const { id: workspaceId } = await params;

    // Verify user has access to this workspace
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = (searchParams.get('sortBy') || 'executedAt') as 'executedAt' | 'statusCode';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build filters
    const filters: ApiLogFilters = {};

    if (searchParams.get('projectId')) {
      filters.projectId = searchParams.get('projectId')!;
    }
    if (searchParams.get('connectionId')) {
      filters.connectionId = searchParams.get('connectionId')!;
    }
    if (searchParams.get('actionId')) {
      filters.actionId = searchParams.get('actionId')!;
    }
    if (searchParams.get('statusCode')) {
      filters.statusCode = parseInt(searchParams.get('statusCode')!, 10);
    }
    if (searchParams.get('hasError')) {
      filters.hasError = searchParams.get('hasError') === 'true';
    }
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    // Build pagination options
    const pagination: PaginationOptions = {
      limit,
      offset,
      sortBy,
      sortOrder
    };

    // Fetch executions using repository
    const apiLogRepo = new SupabaseApiLogRepository(supabase);
    const { logs, total } = await apiLogRepo.findByWorkspace(
      workspaceId,
      filters,
      pagination
    );

    return NextResponse.json({
      executions: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total
      }
    });
  } catch (error) {
    console.error('Executions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
