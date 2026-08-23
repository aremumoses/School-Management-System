import type { ReactNode } from 'react';
import { auth } from '@/auth';
import { ComingSoon, ModuleDisabled, WelcomeHome } from '@/components/dashboard/dashboard-placeholder';
import { MobileDashboardShell } from '@/components/dashboard/mobile-dashboard-shell';
import { StaffDashboardShell } from '@/components/dashboard/staff-dashboard-shell';
import { getDashboardConfig } from './dashboard-config';
import { requireDashboardAccess } from './require-dashboard-access';
import { ROLE_LABELS } from './role-labels';
import { getEnabledModules, requireModuleEnabled, type SchoolModuleId } from './school-modules';

/**
 * Factories for the three files every dashboard route group needs
 * (layout.tsx, page.tsx, [...slug]/page.tsx) — every one of the 10 route
 * groups under app/ is just a 2-line file calling one of these with its own
 * segment name. Keeps the actual route files trivial while the real logic
 * (access control, shell selection, placeholder content) lives in one place.
 */

export function createDashboardLayout(segment: string) {
  return async function DashboardLayout({ children }: { children: ReactNode }) {
    const session = await requireDashboardAccess(segment);
    const config = getDashboardConfig(segment);
    if (!config) {
      throw new Error(`No dashboard config registered for segment "${segment}"`);
    }

    const enabledModules = await getEnabledModules();
    const navItems = config.navItems.filter(
      (item) => !item.module || enabledModules.has(item.module),
    );
    const isModuleDisabled =
      config.requiresAnyModule !== undefined &&
      !config.requiresAnyModule.some((m) => enabledModules.has(m));
    const content = isModuleDisabled ? <ModuleDisabled label={config.label} /> : children;

    if (config.mobile) {
      return (
        <MobileDashboardShell
          label={config.label}
          navItems={navItems}
          bottomNavLabels={config.bottomNavLabels ?? []}
          session={session}
        >
          {content}
        </MobileDashboardShell>
      );
    }

    return (
      <StaffDashboardShell label={config.label} navItems={navItems} session={session}>
        {content}
      </StaffDashboardShell>
    );
  };
}

/**
 * For a single route nested inside another role's dashboard (e.g.
 * /student/cbt inside the `student` segment) that exists solely to serve one
 * toggleable module — redirects to that dashboard's home when the module is
 * off, since the nav item pointing here is already hidden and there's
 * nothing sensible to render at the URL itself.
 */
export function createModuleGuardLayout(moduleId: SchoolModuleId, fallbackHref: string) {
  return async function ModuleGuardLayout({ children }: { children: ReactNode }) {
    await requireModuleEnabled(moduleId, fallbackHref);
    return children;
  };
}

export function createDashboardHomePage(segment: string) {
  return async function DashboardHomePage() {
    const session = await auth();
    const roles = session?.user.roles ?? [];
    const roleLabel = roles[0] ? ROLE_LABELS[roles[0]] : getDashboardConfig(segment)?.label ?? '';
    return <WelcomeHome name={session?.user.name ?? 'there'} roleLabel={roleLabel} />;
  };
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function createCatchAllPage() {
  return async function CatchAllPage({
    params,
  }: {
    params: Promise<{ slug: string[] }>;
  }) {
    const { slug } = await params;
    const last = slug[slug.length - 1] ?? '';
    return <ComingSoon title={titleFromSlug(last)} />;
  };
}
