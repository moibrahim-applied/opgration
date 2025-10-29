import { Connection, CreateConnectionInput, StoreCredentialInput, EncryptedCredential } from '../entities';

export interface IConnectionRepository {
  // Connections
  findById(id: string): Promise<Connection | null>;
  findByProjectId(projectId: string): Promise<Connection[]>;
  findByOrganizationId(organizationId: string): Promise<Connection[]>;
  create(input: CreateConnectionInput): Promise<Connection>;
  update(id: string, input: Partial<CreateConnectionInput>): Promise<Connection>;
  delete(id: string): Promise<void>;

  // Credentials
  storeCredential(input: StoreCredentialInput): Promise<EncryptedCredential>;
  getCredential(connectionId: string, credentialType: string): Promise<string | null>;
  deleteCredentials(connectionId: string): Promise<void>;
}