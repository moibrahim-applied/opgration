import { Sidebar } from '@/components/sidebar';
import { OnboardingProvider } from '@/components/onboarding-provider';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <OnboardingProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar user={user || undefined} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </OnboardingProvider>
  );
}