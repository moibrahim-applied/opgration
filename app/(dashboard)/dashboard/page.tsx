import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDefaultWorkspace } from '@/lib/workspace-context';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/signin');
  }

  // Get user's default workspace
  const defaultWorkspaceSlug = await getDefaultWorkspace(user.id);

  if (!defaultWorkspaceSlug) {
    // User has no workspaces, redirect to create one
    redirect('/workspaces');
  }

  // Redirect to workspace-scoped dashboard
  redirect(`/w/${defaultWorkspaceSlug}/dashboard`);
}
