import { IConnectionRepository } from '@/src/domain';
import { OAuthService } from './OAuthService';

export interface RefreshTokenInput {
  connectionId: string;
  integration: {
    authConfig: {
      tokenUrl: string;
      clientIdEnv: string;
      clientSecretEnv: string;
    };
  };
}

export class TokenRefreshService {
  constructor(
    private connectionRepo: IConnectionRepository,
    private oauthService: OAuthService
  ) {}

  /**
   * Refresh an expired access token using the refresh token
   */
  async refreshAccessToken(input: RefreshTokenInput): Promise<string> {
    // Get refresh token
    const refreshToken = await this.connectionRepo.getCredential(
      input.connectionId,
      'refresh_token'
    );

    if (!refreshToken) {
      throw new Error('No refresh token found. User must re-authenticate.');
    }

    // Get OAuth credentials from environment
    const authConfig = input.integration.authConfig as any;
    const clientIdEnv = authConfig.clientIdEnv || authConfig.client_id_env;
    const clientSecretEnv = authConfig.clientSecretEnv || authConfig.client_secret_env;
    const clientId = process.env[clientIdEnv];
    const clientSecret = process.env[clientSecretEnv];

    if (!clientId || !clientSecret) {
      throw new Error('OAuth credentials not configured');
    }

    const tokenUrl = authConfig.token_url || authConfig.tokenUrl;

    // Refresh the token
    const tokens = await this.oauthService.refreshAccessToken(
      { tokenUrl } as any,
      refreshToken,
      clientId,
      clientSecret
    );

    // Store new access token
    await this.connectionRepo.storeCredential({
      connectionId: input.connectionId,
      credentialType: 'access_token',
      value: tokens.accessToken,
      expiresAt: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : undefined,
    });

    // Update refresh token if a new one was provided
    if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
      await this.connectionRepo.storeCredential({
        connectionId: input.connectionId,
        credentialType: 'refresh_token',
        value: tokens.refreshToken,
      });
    }

    console.log('Token refreshed successfully for connection:', input.connectionId);
    return tokens.accessToken;
  }
}