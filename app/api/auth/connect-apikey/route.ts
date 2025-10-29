import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = claims.claims.sub;

    // Get request body
    const body = await request.json();
    const { integrationId, organizationId, projectId, connectionName, apiKey } = body;

    if (!integrationId || !organizationId || !projectId || !connectionName || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (integration.auth_type !== 'api_key') {
      return NextResponse.json(
        { error: 'This integration does not use API key authentication' },
        { status: 400 }
      );
    }

    // For Opgration utilities, any non-empty API key is valid
    // In a real scenario, you'd validate against a specific key
    if (integration.slug === 'opgration') {
      if (!apiKey || apiKey.trim().length < 10) {
        return NextResponse.json(
          { error: 'API key must be at least 10 characters' },
          { status: 400 }
        );
      }
    }

    // Create connection
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id: userId,
        integration_id: integrationId,
        organization_id: organizationId,
        project_id: projectId,
        name: connectionName,
        is_active: true,
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Connection creation error:', connectionError);
      return NextResponse.json(
        { error: 'Failed to create connection' },
        { status: 500 }
      );
    }

    // Encrypt and store the API key
    const { data: encryptedKey, error: encryptError } = await supabase.rpc(
      'encrypt_credential',
      { credential_value: apiKey }
    );

    if (encryptError) {
      // Rollback connection creation
      await supabase.from('connections').delete().eq('id', connection.id);
      return NextResponse.json(
        { error: 'Failed to encrypt API key' },
        { status: 500 }
      );
    }

    // Store encrypted API key
    const { error: credError } = await supabase.from('encrypted_credentials').insert({
      connection_id: connection.id,
      credential_type: 'api_key',
      encrypted_value: encryptedKey,
    });

    if (credError) {
      // Rollback connection creation
      await supabase.from('connections').delete().eq('id', connection.id);
      return NextResponse.json(
        { error: 'Failed to store API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      message: 'Connection created successfully',
    });
  } catch (error) {
    console.error('API key connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
