import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SupabaseIntegrationRepository, SupabaseConnectionRepository } from '@/src/infrastructure/database';
import { ApiExecutionService, OAuthService } from '@/src/infrastructure/services';
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

/**
 * Converts all keys in an object to camelCase recursively
 * Allows users to send any case format (lowercase, UPPERCASE, snake_case, etc.)
 *
 * Examples:
 * - spreadsheetid → spreadsheetId
 * - SpreadsheetId → spreadsheetId
 * - spreadsheet_id → spreadsheetId
 * - SPREADSHEETID → spreadsheetid (all caps becomes lowercase)
 */
function toCamelCase(str: string): string {
  return str.replace(/[-_\s](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function normalizeKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => normalizeKeys(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const normalized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key);
        normalized[camelKey] = normalizeKeys(obj[key]);
      }
    }
    return normalized;
  }

  return obj;
}

/**
 * V2 Execute Endpoint - API key in header, data in body
 *
 * Request Headers:
 * {
 *   "X-API-Key": "key_abc123" (optional for UI, required for API)
 * }
 *
 * Request Body:
 * {
 *   "workspace_id": "ws_456",
 *   "project_id": "proj_789",
 *   "connection_id": "conn_abc",
 *   "action": "search-rows-advanced",
 *   "parameters": {
 *     "spreadsheetId": "...",
 *     "filters": [...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    // Parse request body
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request body must be valid JSON',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 400 }
      );
    }

    const {
      workspace_id,
      project_id,
      connection_id,
      action: actionSlug,
      parameters = {}
    } = body;

    // Get API key from header
    const api_key = request.headers.get('X-API-Key') || request.headers.get('x-api-key');

    console.log('API v2 Execute called:', {
      connection_id,
      action: actionSlug,
      workspace_id: workspace_id || 'not provided',
      project_id: project_id || 'not provided',
      hasApiKey: !!api_key,
      requestId
    });

    // Validate required fields
    const missingFields = [];
    if (!workspace_id) missingFields.push('workspace_id');
    if (!project_id) missingFields.push('project_id');
    if (!connection_id) missingFields.push('connection_id');
    if (!actionSlug) missingFields.push('action');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            details: {
              missing: missingFields,
              required: ['workspace_id', 'project_id', 'connection_id', 'action'],
              note: 'X-API-Key header is optional for authenticated sessions'
            }
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let supabase;

    // Check if this is from UI (no API key) or API (with API key)
    if (!api_key) {
      // UI request - use user session
      const { createClient } = await import('@/lib/supabase/server');
      supabase = await createClient();

      const { data: claims, error: authError } = await supabase.auth.getClaims();

      if (authError || !claims?.claims?.sub) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required. Provide X-API-Key header or use authenticated session.',
            },
            metadata: {
              request_id: requestId,
              timestamp,
            }
          },
          { status: 401 }
        );
      }

      userId = claims.claims.sub;
      console.log('Authenticated via session:', userId);
    } else {
      // API request - use API key
      supabase = createServiceClient();
      const keyHash = hashApiKey(api_key);
      const { data: keyRecord, error: keyError } = await supabase
        .from('user_api_keys')
        .select('user_id, is_active')
        .eq('key_hash', keyHash)
        .single();

      if (keyError || !keyRecord || !keyRecord.is_active) {
        console.error('Invalid API key:', keyError);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_API_KEY',
              message: 'The provided API key is invalid or inactive',
            },
            metadata: {
              request_id: requestId,
              timestamp,
            }
          },
          { status: 401 }
        );
      }

      userId = keyRecord.user_id;
      console.log('Authenticated via API key:', userId);
    }

    // Verify access to workspace/project
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', workspace_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this workspace',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 403 }
      );
    }

    // Get connection
    const connectionRepo = new SupabaseConnectionRepository(supabase);
    const connection = await connectionRepo.findById(connection_id);

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'The specified connection does not exist',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 404 }
      );
    }

    // Verify connection belongs to the specified workspace/project
    if (connection.organizationId !== workspace_id || connection.projectId !== project_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_MISMATCH',
            message: 'Connection does not belong to specified workspace/project',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 403 }
      );
    }

    if (!connection.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_INACTIVE',
            message: 'The specified connection is inactive',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 400 }
      );
    }

    // Get integration and action
    const integrationRepo = new SupabaseIntegrationRepository(supabase);
    const integration = await integrationRepo.findById(connection.integrationId);

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTEGRATION_NOT_FOUND',
            message: 'Integration not found',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 404 }
      );
    }

    const action = await integrationRepo.findActionBySlug(integration.id, actionSlug);
    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACTION_NOT_FOUND',
            message: `Action '${actionSlug}' not found for integration '${integration.name}'`,
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 404 }
      );
    }

    console.log('Found action:', action.name);

    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('encrypted_credentials')
      .select('credential_type, encrypted_value, expires_at')
      .eq('connection_id', connection_id);

    if (credError || !credentials || credentials.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_CREDENTIALS',
            message: 'No credentials found for this connection',
          },
          metadata: {
            request_id: requestId,
            timestamp,
          }
        },
        { status: 500 }
      );
    }

    console.log('Found credentials:', credentials.map(c => c.credential_type));

    // Decrypt access token or API key based on integration type
    let accessToken = '';

    if (integration.authType === 'api_key') {
      // For API key integrations
      const apiKeyCred = credentials.find(c => c.credential_type === 'api_key');
      if (!apiKeyCred) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_API_KEY',
              message: 'No API key found for this connection',
            },
            metadata: {
              request_id: requestId,
              timestamp,
            }
          },
          { status: 500 }
        );
      }

      const { data: decryptedApiKey, error: decryptError } = await supabase.rpc(
        'decrypt_credential',
        { encrypted_value: apiKeyCred.encrypted_value }
      );

      if (decryptError || !decryptedApiKey) {
        console.error('Failed to decrypt API key:', decryptError);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CREDENTIAL_DECRYPTION_FAILED',
              message: 'Failed to decrypt credentials',
            },
            metadata: {
              request_id: requestId,
              timestamp,
            }
          },
          { status: 500 }
        );
      }

      accessToken = decryptedApiKey as string;
      console.log('Decrypted API key');
    } else {
      // For OAuth2 integrations
      const accessTokenCred = credentials.find(c => c.credential_type === 'access_token');
      if (!accessTokenCred) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_ACCESS_TOKEN',
              message: 'No access token found for this connection',
            },
            metadata: {
              request_id: requestId,
              timestamp,
            }
          },
          { status: 500 }
        );
      }

      const { data: decryptedData, error: decryptError } = await supabase.rpc(
        'decrypt_credential',
        { encrypted_value: accessTokenCred.encrypted_value }
      );

      if (decryptError || !decryptedData) {
        console.error('Failed to decrypt token:', decryptError);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CREDENTIAL_DECRYPTION_FAILED',
              message: 'Failed to decrypt credentials',
            },
            metadata: {
              request_id: requestId,
              timestamp,
            }
          },
          { status: 500 }
        );
      }

      accessToken = decryptedData as string;
      console.log('Decrypted access token');
    }

    // Check if token is expired and refresh if needed (OAuth2 only)
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
                .eq('connection_id', connection_id)
                .eq('credential_type', 'access_token');

              accessToken = tokens.accessToken;
              console.log('Token refreshed successfully');
            }
          }
        }
      }
    }

    // Normalize parameter keys to camelCase (spreadsheetid → spreadsheetId)
    const normalizedParameters = normalizeKeys(parameters);

    console.log('Executing action with:', {
      actionName: action.name,
      baseUrl: integration.baseUrl,
      endpointPath: action.endpointPath,
      hasTransformConfig: !!action.transformConfig,
      originalParameters: parameters,
      normalizedParameters
    });

    // Execute the API call
    const executionService = new ApiExecutionService();
    const result = await executionService.execute({
      action,
      baseUrl: integration.baseUrl || '',
      accessToken,
      payload: normalizedParameters,
    });

    // Log the execution
    await supabase.from('api_logs').insert({
      connection_id: connection_id,
      action_id: action.id,
      request_payload: normalizedParameters,
      response_payload: result,
      status_code: 200,
    });

    const executionId = `exec_${crypto.randomUUID()}`;

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        execution_id: executionId,
        request_id: requestId,
        timestamp,
        action: action.name,
        integration: integration.name,
      }
    });

  } catch (error) {
    console.error('API v2 execution error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'API execution failed',
          details: process.env.NODE_ENV === 'development' ? {
            stack: error instanceof Error ? error.stack : undefined
          } : undefined
        },
        metadata: {
          request_id: requestId,
          timestamp,
        }
      },
      { status: 500 }
    );
  }
}
