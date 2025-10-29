export interface Connection {
  id: string;
  organizationId: string;
  projectId: string;
  integrationId: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedCredential {
  id: string;
  connectionId: string;
  credentialType: 'access_token' | 'refresh_token' | 'api_key' | 'custom';
  encryptedValue: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateConnectionInput = {
  organizationId: string;
  projectId: string;
  integrationId: string;
  userId: string;
  name: string;
};

export type StoreCredentialInput = {
  connectionId: string;
  credentialType: 'access_token' | 'refresh_token' | 'api_key' | 'custom';
  value: string;
  expiresAt?: Date;
};