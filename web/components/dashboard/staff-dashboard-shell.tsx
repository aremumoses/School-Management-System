'use client';

import { Grip } from 'lucide-react';
import type { Session } from 'next-auth';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumb';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { findActiveNavItem, type NavItem } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';
import { AppSidebarNav, SidebarBrand } from './app-sidebar';
import { GlobalSearchTrigger } from './global-search';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

const COLLAPSE_KEY = 'sms.sidebar.collapsed';

// The ghost variant paints aria-expanded buttons as "pressed" (bg-muted); the
// collapse toggle is expanded by default, so that state is reset here.
const sidebarToggleClass =
  'size-10 rounded-md text-heading hover:bg-card hover:text-primary aria-expanded:bg-transparent aria-expanded:text-heading aria-expanded:hover:bg-card aria-expanded:hover:text-primary';

interface StaffDashboardShellProps {
  label: string;
  navItems: NavItem[];
  session: Session;
  children: React.ReactNode;
}

/**
 * Application shell for staff dashboards — Admin, Teacher, Bursar, Exam
 * Officer, Librarian, Hostel/Transport, HR, Front Desk. See
 * prompts/00-DESIGN-SYSTEM.md §5.
 *
 * Akademi layout: a solid brand sidebar, and a top bar that sits on the page
 * background with the sidebar toggle, the page title and white control
 * squares. The collapse state is per-browser, not per-user — it's a viewport
 * preference, so localStorage is the right home for it and there's no reason
 * to spend a round-trip persisting it server-side.
 */
export function StaffDashboardShell({
  label,
  navItems,
  session,
  children,
}: StaffDashboardShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeItem = findActiveNavItem(pathname, navItems);

  // Read the stored preference after mount, deferred out of the effect's own
  // synchronous pass (see notification-bell.tsx for the same pattern and
  // why). Rendering expanded first and settling is deliberate: the sidebar
  // is server-rendered and localStorage isn't readable there, so expanded is
  // the safe default to paint.
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
      } catch {
        // Private-mode / storage-disabled browsers just get the default.
      }
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Non-fatal — the toggle still works for this session.
      }
      return next;
    });
  }, []);

  const crumbs = buildCrumbs(label, navItems, activeItem);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-[--duration-base] ease-[--ease-out-soft] md:flex print:hidden',
          collapsed ? 'w-[5.5rem]' : 'w-[17.5rem]',
        )}
      >
        <SidebarBrand label={label} collapsed={collapsed} />
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <AppSidebarNav navItems={navItems} activeHref={activeItem?.href} collapsed={collapsed} />
        </div>
      </aside>

      {/* min-w-0 overrides the flex default of min-width:auto — without it,
          a wide table/grid in `children` would refuse to shrink below its
          own intrinsic width and drag this entire column (header included)
          into a page-wide horizontal scroll instead of staying clipped to
          the viewport with the overflow contained inside the content's own
          `overflow-x-auto` wrapper. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[4.5rem] shrink-0 items-center gap-3 bg-background/85 px-4 backdrop-blur-md md:px-6 lg:px-8 print:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={cn(sidebarToggleClass, 'md:hidden')}
                  aria-label="Open navigation menu"
                />
              }
            >
              <Grip className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[17.5rem] gap-0 overflow-y-auto border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&_[data-slot=sheet-close]]:hover:bg-sidebar-accent [&_[data-slot=sheet-close]]:hover:text-sidebar-accent-foreground"
            >
              <SheetTitle className="sr-only">{label} navigation</SheetTitle>
              <SidebarBrand label={label} collapsed={false} />
              <AppSidebarNav
                navItems={navItems}
                activeHref={activeItem?.href}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(sidebarToggleClass, 'hidden md:inline-flex')}
          >
            <Grip className="size-5" />
          </Button>

          <Breadcrumbs items={crumbs} className="hidden flex-1 sm:block" />
          <span className="flex-1 truncate text-base font-semibold text-heading sm:hidden">
            {activeItem?.label ?? label}
          </span>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <GlobalSearchTrigger navItems={navItems} />
            <ThemeToggle />
            <NotificationBell />
            <UserMenu session={session} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div key={pathname} className="animate-page-in mx-auto max-w-[92rem]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Dashboard -> section -> page. The middle crumb is the nav group rather
 * than a URL segment: groups are the mental model the sidebar teaches, and
 * unlike path segments they always have a human-readable name. It's
 * deliberately not a link — a group is a heading, not a destination.
 */
function buildCrumbs(label: string, navItems: NavItem[], active?: NavItem): Crumb[] {
  const root = navItems[0];
  const home: Crumb = { label, href: root?.href };
  if (!active) return [home];
  if (active.href === root?.href) return [{ label: active.label }];
  return [home, { label: active.group }, { label: active.label }];
}
