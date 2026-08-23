import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { primaryDashboardPath } from '@/lib/dashboard-config';

// "/" is just a gateway now that real auth exists (Stage 0's health-check
// placeholder lived here before). proxy.ts handles this same redirect for
// most navigations already — this covers a direct hit on "/" itself, which
// proxy.ts's matcher intentionally still lets through to here.
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  redirect(primaryDashboardPath(session.user.roles));
}
