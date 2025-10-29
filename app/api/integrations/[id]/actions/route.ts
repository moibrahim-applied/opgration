import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseIntegrationRepository } from '@/src/infrastructure/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const integrationRepo = new SupabaseIntegrationRepository(supabase);

    const actions = await integrationRepo.findActionsByIntegrationId(id);

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}