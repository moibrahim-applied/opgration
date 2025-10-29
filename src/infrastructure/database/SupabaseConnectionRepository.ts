import { SupabaseClient } from '@supabase/supabase-js';
import {
  Connection,
  CreateConnectionInput,
  StoreCredentialInput,
  EncryptedCredential,
  IConnectionRepository
} from '@/src/domain';

export class SupabaseConnectionRepository implements IConnectionRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Connection | null> {
    const { data, error } = await this.supabase
      .from('connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToConnection(data);
  }

  async findByProjectId(projectId: string): Promise<Connection[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToConnection);
  }

  async findByOrganizationId(organizationId: string): Promise<Connection[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToConnection);
  }

  async create(input: CreateConnectionInput): Promise<Connection> {
    const { data, error } = await this.supabase
      .from('connections')
      .insert({
        organization_id: input.organizationId,
        project_id: input.projectId,
        integration_id: input.integrationId,
        user_id: input.userId,
        name: input.name,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToConnection(data);
  }

  async update(id: string, input: Partial<CreateConnectionInput>): Promise<Connection> {
    const updateData: Record<string, unknown> = {};
    if (input.name) updateData.name = input.name;

    const { data, error } = await this.supabase
      .from('connections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToConnection(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Credentials
  async storeCredential(input: StoreCredentialInput): Promise<EncryptedCredential> {
    // Use Supabase RPC to encrypt the credential value
    const { data: encryptedValue, error: encryptError } = await this.supabase
      .rpc('encrypt_credential', {
        credential_value: input.value
      });

    if (encryptError) throw encryptError;

    const { data, error } = await this.supabase
      .from('encrypted_credentials')
      .upsert({
        connection_id: input.connectionId,
        credential_type: input.credentialType,
        encrypted_value: encryptedValue,
        expires_at: input.expiresAt?.toISOString(),
      }, {
        onConflict: 'connection_id,credential_type'
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToCredential(data);
  }

  async getCredential(connectionId: string, credentialType: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('encrypted_credentials')
      .select('encrypted_value')
      .eq('connection_id', connectionId)
      .eq('credential_type', credentialType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Use Supabase RPC to decrypt the credential
    const { data: decryptedValue, error: decryptError } = await this.supabase
      .rpc('decrypt_credential', {
        encrypted_value: data.encrypted_value
      });

    if (decryptError) throw decryptError;
    return decryptedValue;
  }

  async deleteCredentials(connectionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('encrypted_credentials')
      .delete()
      .eq('connection_id', connectionId);

    if (error) throw error;
  }

  // Mappers
  private mapToConnection(data: any): Connection {
    return {
      id: data.id,
      organizationId: data.organization_id,
      projectId: data.project_id,
      integrationId: data.integration_id,
      userId: data.user_id,
      name: data.name,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToCredential(data: any): EncryptedCredential {
    return {
      id: data.id,
      connectionId: data.connection_id,
      credentialType: data.credential_type,
      encryptedValue: data.encrypted_value,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}