export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
}

export type CreateOrganizationInput = {
  name: string;
  slug: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;