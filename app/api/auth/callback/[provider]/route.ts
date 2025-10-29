import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseIntegrationRepository, SupabaseConnectionRepository } from '@/src/infrastructure/database';
import { OAuthService } from '@/src/infrastructure/services';
import { OAuth2Config } from '@/src/domain';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // 1. Get OAuth params from query
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/connections/error?message=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/connections/error?message=Invalid callback', request.url)
      );
    }

    // 2. Verify state and get connection data from session/cookie
    // For now, we'll parse state as JSON (in production, verify against stored state)
    let stateData: { integrationSlug: string; connectionId: string };
    try {
      stateData = JSON.parse(decodeURIComponent(state));
    } catch {
      return NextResponse.redirect(
        new URL('/connections/error?message=Invalid state', request.url)
      );
    }

    // 3. Get integration config
    const integrationRepo = new SupabaseIntegrationRepository(supabase);
    const integration = await integrationRepo.findBySlug(stateData.integrationSlug);

    if (!integration || integration.authType !== 'oauth2') {
      return NextResponse.redirect(
        new URL('/connections/error?message=Integration not found', request.url)
      );
    }

    const oauthConfig = integration.authConfig as any;

    // 4. Get OAuth credentials from environment (handle snake_case from DB)
    const clientIdEnv = oauthConfig.clientIdEnv || oauthConfig.client_id_env;
    const clientSecretEnv = oauthConfig.clientSecretEnv || oauthConfig.client_secret_env;
    const clientId = process.env[clientIdEnv];
    const clientSecret = process.env[clientSecretEnv];

    if (!clientId || !clientSecret) {
      console.error(`Missing OAuth credentials: ${clientIdEnv} or ${clientSecretEnv}`);
      return NextResponse.redirect(
        new URL('/connections/error?message=OAuth configuration error', request.url)
      );
    }

    // Build OAuth2Config
    const oauth2Config: OAuth2Config = {
      authorizationUrl: oauthConfig.authorization_url || oauthConfig.authorizationUrl,
      tokenUrl: oauthConfig.token_url || oauthConfig.tokenUrl,
      scopes: oauthConfig.scopes,
      clientIdEnv,
      clientSecretEnv,
    };

    // 5. Exchange code for tokens
    const oauthService = new OAuthService();
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/${provider}`;

    const tokens = await oauthService.exchangeCodeForToken(
      oauth2Config,
      code,
      redirectUri,
      clientId,
      clientSecret
    );

    // 6. Store tokens in encrypted_credentials
    const connectionRepo = new SupabaseConnectionRepository(supabase);

    // Store access token
    await connectionRepo.storeCredential({
      connectionId: stateData.connectionId,
      credentialType: 'access_token',
      value: tokens.accessToken,
      expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
    });

    // Store refresh token if provided
    if (tokens.refreshToken) {
      await connectionRepo.storeCredential({
        connectionId: stateData.connectionId,
        credentialType: 'refresh_token',
        value: tokens.refreshToken,
      });
    }

    // 7. Redirect to connection detail page showing all available actions
    const workspaceSlug = (stateData as any).workspaceSlug || 'default-workspace';
    return NextResponse.redirect(
      new URL(`/w/${workspaceSlug}/connections/${stateData.connectionId}`, request.url)
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/connections/error?message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    );
  }
}