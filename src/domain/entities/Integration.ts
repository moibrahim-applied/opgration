export type AuthType = 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'custom';

export interface Integration {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  authType: AuthType;
  authConfig: OAuth2Config | ApiKeyConfig | Record<string, unknown>;
  baseUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

export interface ApiKeyConfig {
  headerName: string;
  paramName?: string;
}

export interface IntegrationAction {
  id: string;
  integrationId: string;
  name: string;
  slug: string;
  description?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpointPath: string;
  requestSchema: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  transformConfig?: TransformConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransformConfig {
  request?: {
    body?: Record<string, string>;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  };
  response?: {
    mapping?: Record<string, string>;
  };
}

export type CreateIntegrationInput = {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  authType: AuthType;
  authConfig: OAuth2Config | ApiKeyConfig | Record<string, unknown>;
  baseUrl?: string;
};

export type CreateIntegrationActionInput = {
  integrationId: string;
  name: string;
  slug: string;
  description?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpointPath: string;
  requestSchema: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  transformConfig?: TransformConfig;
};