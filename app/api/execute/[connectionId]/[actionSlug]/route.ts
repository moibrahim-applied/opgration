import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SupabaseIntegrationRepository, SupabaseConnectionRepository } from '@/src/infrastructure/database';
import { ApiExecutionService, OAuthService, TokenRefreshService } from '@/src/infrastructure/services';
import crypto from 'crypto';

// Hash API key for lookup
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Create service role client (bypasses RLS)
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function executeAction(
  request: NextRequest,
  params: { connectionId: string; actionSlug: string }
) {
  try {
    const { connectionId, actionSlug } = params;

    // Get workspace and project from headers
    const workspaceId = request.headers.get('x-workspace-id');
    const projectId = request.headers.get('x-project-id');
    const apiKey = request.headers.get('x-api-key');

    console.log('API Execute called:', {
      connectionId,
      actionSlug,
      workspaceId: workspaceId || 'not provided',
      projectId: projectId || 'not provided',
      hasApiKey: !!apiKey
    });

    // Validate required headers
    if (!workspaceId || !projectId) {
      return NextResponse.json(
        {
          error: 'Missing required headers',
          required: ['X-Workspace-ID', 'X-Project-ID', 'X-API-Key'],
          provided: {
            'X-Workspace-ID': !!workspaceId,
            'X-Project-ID': !!projectId,
            'X-API-Key': !!apiKey,
          }
        },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let supabase;

    // Check if this is from UI (no API key) or API (with API key)
    if (!apiKey) {
      // UI request - use user session
      const { createClient } = await import('@/lib/supabase/server');
      supabase = await createClient();

      const { data: claims, error: authError } = await supabase.auth.getClaims();

      if (authError || !claims?.claims?.sub) {
        return NextResponse.json(
          { error: 'Unauthorized - please sign in' },
          { status: 401 }
        );
      }

      userId = claims.claims.sub;
      console.log('Authenticated via session:', userId);
    } else {
      // API request - use API key
      supabase = createServiceClient();
      const keyHash = hashApiKey(apiKey);
      const { data: keyRecord, error: keyError } = await supabase
        .from('user_api_keys')
        .select('user_id, is_active')
        .eq('key_hash', keyHash)
        .single();

      if (keyError || !keyRecord || !keyRecord.is_active) {
        console.error('Invalid API key:', keyError);
        return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
      }

      userId = keyRecord.user_id;
      console.log('Authenticated via API key:', userId);
    }

    // 2. Verify access to workspace/project
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    // 3. Get connection
    const connectionRepo = new SupabaseConnectionRepository(supabase);
    const connection = await connectionRepo.findById(connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify connection belongs to the specified workspace/project
    if (connection.organizationId !== workspaceId || connection.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Connection does not belong to specified workspace/project' },
        { status: 403 }
      );
    }

    if (!connection.isActive) {
      return NextResponse.json({ error: 'Connection is inactive' }, { status: 400 });
    }

    // 4. Get integration and action
    const integrationRepo = new SupabaseIntegrationRepository(supabase);
    const integration = await integrationRepo.findById(connection.integrationId);

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const action = await integrationRepo.findActionBySlug(integration.id, actionSlug);
    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    console.log('Found action:', action.name);

    // 5. Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('encrypted_credentials')
      .select('credential_type, encrypted_value, expires_at')
      .eq('connection_id', connectionId);

    if (credError || !credentials || credentials.length === 0) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 500 });
    }

    console.log('Found credentials:', credentials.map(c => c.credential_type));

    // 6. Decrypt access token or API key based on integration type
    let accessToken = '';

    if (integration.authType === 'api_key') {
      // For API key integrations
      const apiKeyCred = credentials.find(c => c.credential_type === 'api_key');
      if (!apiKeyCred) {
        return NextResponse.json({ error: 'No API key found' }, { status: 500 });
      }

      const { data: decryptedApiKey, error: decryptError } = await supabase.rpc(
        'decrypt_credential',
        { encrypted_value: apiKeyCred.encrypted_value }
      );

      if (decryptError || !decryptedApiKey) {
        console.error('Failed to decrypt API key:', decryptError);
        return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
      }

      accessToken = decryptedApiKey as string;
      console.log('Decrypted API key');
    } else {
      // For OAuth2 integrations
      const accessTokenCred = credentials.find(c => c.credential_type === 'access_token');
      if (!accessTokenCred) {
        return NextResponse.json({ error: 'No access token found' }, { status: 500 });
      }

      const { data: decryptedData, error: decryptError } = await supabase.rpc(
        'decrypt_credential',
        { encrypted_value: accessTokenCred.encrypted_value }
      );

      if (decryptError || !decryptedData) {
        console.error('Failed to decrypt token:', decryptError);
        return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
      }

      accessToken = decryptedData as string;
      console.log('Decrypted access token');
    }

    // 7. Check if token is expired and refresh if needed (OAuth2 only)
    if (integration.authType === 'oauth2' && credentials.find(c => c.credential_type === 'access_token')?.expires_at) {
      const accessTokenCred = credentials.find(c => c.credential_type === 'access_token')!;
      const expiresAt = new Date(accessTokenCred.expires_at!);
      const now = new Date();
      const bufferMinutes = 5;

      if (expiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000) {
        console.log('Token expired or expiring soon, refreshing...');

        const refreshTokenCred = credentials.find(c => c.credential_type === 'refresh_token');
        if (refreshTokenCred) {
          const { data: decryptedRefreshToken } = await supabase.rpc(
            'decrypt_credential',
            { encrypted_value: refreshTokenCred.encrypted_value }
          );

          if (decryptedRefreshToken) {
            // Refresh the token using OAuth service
            const oauthService = new OAuthService();
            const authConfig = integration.authConfig as any;
            const clientId = process.env[authConfig.client_id_env || authConfig.clientIdEnv];
            const clientSecret = process.env[authConfig.client_secret_env || authConfig.clientSecretEnv];
            const tokenUrl = authConfig.token_url || authConfig.tokenUrl;

            if (clientId && clientSecret && tokenUrl) {
              const tokens = await oauthService.refreshAccessToken(
                { tokenUrl } as any,
                decryptedRefreshToken as string,
                clientId,
                clientSecret
              );

              // Update the access token in the database
              const { data: encryptedToken } = await supabase.rpc(
                'encrypt_credential',
                { credential_value: tokens.accessToken }
              );

              await supabase
                .from('encrypted_credentials')
                .update({
                  encrypted_value: encryptedToken,
                  expires_at: tokens.expiresIn
                    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
                    : null,
                })
                .eq('connection_id', connectionId)
                .eq('credential_type', 'access_token');

              accessToken = tokens.accessToken;
              console.log('Token refreshed successfully');
            }
          }
        }
      }
    }

    // 8. Parse request parameters (from body for POST or query for GET)
    let body: Record<string, any> = {};
    if (request.method === 'GET') {
      // For GET requests, parse query parameters
      const url = new URL(request.url);
      url.searchParams.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      // For POST/PUT/etc, parse JSON body
      body = await request.json().catch(() => ({}));
    }

    console.log('Executing action with:', {
      actionName: action.name,
      baseUrl: integration.baseUrl,
      endpointPath: action.endpointPath,
      hasTransformConfig: !!action.transformConfig,
      transformConfig: action.transformConfig,
      payload: body,
    });

    // 9. Execute the API call
    const executionService = new ApiExecutionService();
    const result = await executionService.execute({
      action,
      baseUrl: integration.baseUrl || '',
      accessToken,
      payload: body,
    });

    // 10. Log the execution
    await supabase.from('api_logs').insert({
      connection_id: connectionId,
      action_id: action.id,
      request_payload: body,
      response_payload: result,
      status_code: 200,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API execution error:', error);

    // Try to log the error
    try {
      const { connectionId } = await params;
      const supabase = createServiceClient();
      await supabase.from('api_logs').insert({
        connection_id: connectionId,
        action_id: null,
        request_payload: {},
        response_payload: { error: error instanceof Error ? error.message : 'Unknown error' },
        status_code: 500,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'API execution failed' },
      { status: 500 }
    );
  }
}

// Export both GET and POST handlers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string; actionSlug: string }> }
) {
  return executeAction(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string; actionSlug: string }> }
) {
  return executeAction(request, await params);
}
