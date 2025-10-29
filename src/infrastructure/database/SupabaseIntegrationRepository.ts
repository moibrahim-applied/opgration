import { SupabaseClient } from '@supabase/supabase-js';
import {
  Integration,
  IntegrationAction,
  CreateIntegrationInput,
  CreateIntegrationActionInput,
  IIntegrationRepository
} from '@/src/domain';

export class SupabaseIntegrationRepository implements IIntegrationRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(): Promise<Integration[]> {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data.map(this.mapToIntegration);
  }

  async findById(id: string): Promise<Integration | null> {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToIntegration(data);
  }

  async findBySlug(slug: string): Promise<Integration | null> {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToIntegration(data);
  }

  async create(input: CreateIntegrationInput): Promise<Integration> {
    const { data, error } = await this.supabase
      .from('integrations')
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description,
        logo_url: input.logoUrl,
        auth_type: input.authType,
        auth_config: input.authConfig,
        base_url: input.baseUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToIntegration(data);
  }

  async update(id: string, input: Partial<CreateIntegrationInput>): Promise<Integration> {
    const updateData: Record<string, unknown> = {};
    if (input.name) updateData.name = input.name;
    if (input.slug) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
    if (input.authType) updateData.auth_type = input.authType;
    if (input.authConfig) updateData.auth_config = input.authConfig;
    if (input.baseUrl !== undefined) updateData.base_url = input.baseUrl;

    const { data, error } = await this.supabase
      .from('integrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToIntegration(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Integration Actions
  async findActionsByIntegrationId(integrationId: string): Promise<IntegrationAction[]> {
    const { data, error } = await this.supabase
      .from('integration_actions')
      .select('*')
      .eq('integration_id', integrationId)
      .order('name');

    if (error) throw error;
    return data.map(this.mapToAction);
  }

  async findActionById(actionId: string): Promise<IntegrationAction | null> {
    const { data, error } = await this.supabase
      .from('integration_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToAction(data);
  }

  async findActionBySlug(integrationId: string, slug: string): Promise<IntegrationAction | null> {
    const { data, error } = await this.supabase
      .from('integration_actions')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToAction(data);
  }

  async createAction(input: CreateIntegrationActionInput): Promise<IntegrationAction> {
    const { data, error } = await this.supabase
      .from('integration_actions')
      .insert({
        integration_id: input.integrationId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        http_method: input.httpMethod,
        endpoint_path: input.endpointPath,
        request_schema: input.requestSchema,
        response_schema: input.responseSchema,
        transform_config: input.transformConfig,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToAction(data);
  }

  async updateAction(actionId: string, input: Partial<CreateIntegrationActionInput>): Promise<IntegrationAction> {
    const updateData: Record<string, unknown> = {};
    if (input.name) updateData.name = input.name;
    if (input.slug) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.httpMethod) updateData.http_method = input.httpMethod;
    if (input.endpointPath) updateData.endpoint_path = input.endpointPath;
    if (input.requestSchema) updateData.request_schema = input.requestSchema;
    if (input.responseSchema !== undefined) updateData.response_schema = input.responseSchema;
    if (input.transformConfig !== undefined) updateData.transform_config = input.transformConfig;

    const { data, error } = await this.supabase
      .from('integration_actions')
      .update(updateData)
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;
    return this.mapToAction(data);
  }

  async deleteAction(actionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('integration_actions')
      .delete()
      .eq('id', actionId);

    if (error) throw error;
  }

  // Mappers
  private mapToIntegration(data: any): Integration {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      logoUrl: data.logo_url,
      authType: data.auth_type,
      authConfig: data.auth_config,
      baseUrl: data.base_url,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToAction(data: any): IntegrationAction {
    return {
      id: data.id,
      integrationId: data.integration_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      httpMethod: data.http_method,
      endpointPath: data.endpoint_path,
      requestSchema: data.request_schema,
      responseSchema: data.response_schema,
      transformConfig: data.transform_config,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}