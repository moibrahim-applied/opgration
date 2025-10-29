import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseIntegrationRepository } from '@/src/infrastructure/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const integrationRepo = new SupabaseIntegrationRepository(supabase);

    const integrations = await integrationRepo.findAll();

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}