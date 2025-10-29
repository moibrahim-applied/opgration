import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseIntegrationRepository, SupabaseConnectionRepository } from '@/src/infrastructure/database';
import { OAuthService } from '@/src/infrastructure/services';
import { OAuth2Config } from '@/src/domain';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { organizationId, projectId, integrationId, connectionName, workspaceSlug, actionSlug } = body;

    if (!organizationId || !projectId || !integrationId || !connectionName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Get integration
    const integrationRepo = new SupabaseIntegrationRepository(supabase);
    const integration = await integrationRepo.findById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (integration.authType !== 'oauth2') {
      return NextResponse.json({ error: 'Integration does not use OAuth2' }, { status: 400 });
    }

    // 4. Create connection record (without credentials yet)
    const connectionRepo = new SupabaseConnectionRepository(supabase);
    const connection = await connectionRepo.create({
      organizationId,
      projectId,
      integrationId,
      userId: user.id,
      name: connectionName,
    });

    // 5. Generate OAuth URL
    const oauthConfig = integration.authConfig as any;
    const oauthService = new OAuthService();

    // Handle both camelCase and snake_case from database
    const clientIdEnv = oauthConfig.clientIdEnv || oauthConfig.client_id_env;
    const clientSecretEnv = oauthConfig.clientSecretEnv || oauthConfig.client_secret_env;
    const clientId = process.env[clientIdEnv];

    if (!clientId) {
      return NextResponse.json({
        error: 'OAuth not configured for this integration',
        debug: { clientIdEnv, hasKey: !!process.env[clientIdEnv] }
      }, { status: 500 });
    }

    // Build OAuth2Config with correct format
    const oauth2Config: OAuth2Config = {
      authorizationUrl: oauthConfig.authorization_url || oauthConfig.authorizationUrl,
      tokenUrl: oauthConfig.token_url || oauthConfig.tokenUrl,
      scopes: oauthConfig.scopes,
      clientIdEnv,
      clientSecretEnv,
    };

    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/${integration.slug}`;

    // Create state with connection info and workspace context
    const state = JSON.stringify({
      integrationSlug: integration.slug,
      connectionId: connection.id,
      workspaceSlug,
      actionSlug,
    });

    const authUrl = oauthService.generateAuthorizationUrl(oauth2Config, {
      clientId,
      redirectUri,
      scopes: oauth2Config.scopes,
      state: encodeURIComponent(state),
    });

    // 6. Return auth URL for frontend to redirect
    return NextResponse.json({
      authUrl,
      connectionId: connection.id,
    });

  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}