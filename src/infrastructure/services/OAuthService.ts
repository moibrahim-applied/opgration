import { OAuth2Config } from '@/src/domain';

export interface OAuthAuthorizationParams {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}

export class OAuthService {
  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthorizationUrl(
    config: OAuth2Config,
    params: OAuthAuthorizationParams
  ): string {
    const url = new URL(config.authorizationUrl);

    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', params.state);
    url.searchParams.set('scope', params.scopes.join(' '));

    // Add access_type=offline for Google to get refresh token
    if (config.authorizationUrl.includes('google')) {
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
    }

    return url.toString();
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    config: OAuth2Config,
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuthTokenResponse> {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }

  /**
   * Refresh an access token using refresh token
   */
  async refreshAccessToken(
    config: OAuth2Config,
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuthTokenResponse> {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }

  /**
   * Generate a secure random state for OAuth flow
   */
  generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}