import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Generate a secure random API key
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  return `opgr_${randomBytes.toString('base64url')}`;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// GET - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select('id, name, key_prefix, last_used_at, created_at, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12) + '...'; // Show first 12 chars

    // Store in database
    const { data: keyRecord, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select()
      .single();

    if (error) throw error;

    // Return full key ONLY on creation (never shown again)
    return NextResponse.json({
      key: keyRecord,
      apiKey, // Full key - user must save this!
      warning: 'Save this key now. You will not be able to see it again.',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}