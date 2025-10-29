import { Integration, IntegrationAction, CreateIntegrationInput, CreateIntegrationActionInput } from '../entities';

export interface IIntegrationRepository {
  // Integrations
  findAll(): Promise<Integration[]>;
  findById(id: string): Promise<Integration | null>;
  findBySlug(slug: string): Promise<Integration | null>;
  create(input: CreateIntegrationInput): Promise<Integration>;
  update(id: string, input: Partial<CreateIntegrationInput>): Promise<Integration>;
  delete(id: string): Promise<void>;

  // Integration Actions
  findActionsByIntegrationId(integrationId: string): Promise<IntegrationAction[]>;
  findActionById(actionId: string): Promise<IntegrationAction | null>;
  findActionBySlug(integrationId: string, slug: string): Promise<IntegrationAction | null>;
  createAction(input: CreateIntegrationActionInput): Promise<IntegrationAction>;
  updateAction(actionId: string, input: Partial<CreateIntegrationActionInput>): Promise<IntegrationAction>;
  deleteAction(actionId: string): Promise<void>;
}