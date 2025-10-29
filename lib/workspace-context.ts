import { createClient } from '@/lib/supabase/server';

export interface WorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
  userRole: 'owner' | 'admin' | 'member';
}

/**
 * Get workspace context from workspace slug
 * Validates user has access to workspace
 */
export async function getWorkspaceContext(
  workspaceSlug: string,
  userId: string
): Promise<WorkspaceContext | null> {
  const supabase = await createClient();

  const { data: workspace, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      organization_members!inner(role)
    `)
    .eq('slug', workspaceSlug)
    .eq('organization_members.user_id', userId)
    .single();

  if (error || !workspace) {
    return null;
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    userRole: (workspace as any).organization_members[0].role,
  };
}

/**
 * Get default workspace for a user (first workspace they belong to)
 */
export async function getDefaultWorkspace(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organizations(slug)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!membership || !(membership as any).organizations) {
    return null;
  }

  return (membership as any).organizations.slug;
}

/**
 * Get default project for a workspace (first project)
 */
export async function getDefaultProject(workspaceId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('slug')
    .eq('organization_id', workspaceId)
    .limit(1)
    .single();

  return project?.slug || null;
}
