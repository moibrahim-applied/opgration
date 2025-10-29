import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/signin');
  }

  // Verify workspace exists and user has access
  const { data: workspace, error: workspaceError } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      organization_members!inner(role)
    `)
    .eq('slug', workspaceSlug)
    .eq('organization_members.user_id', user.id)
    .single();

  if (workspaceError || !workspace) {
    notFound();
  }

  // Store workspace context in a way children can access it
  // We'll pass it through React Context or use params in child pages
  return <>{children}</>;
}
