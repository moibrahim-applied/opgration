export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProjectInput = {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'organizationId'>>;