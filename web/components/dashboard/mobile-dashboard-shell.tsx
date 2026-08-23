'use client';

import { MoreHorizontal } from 'lucide-react';
import type { Session } from 'next-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { findActiveNavItem, groupNavItems, type NavItem } from '@/lib/dashboard-config';
import { NAV_ICONS } from '@/lib/nav-icons';
import { cn } from '@/lib/utils';
import { AppSidebarNav, SidebarBrand } from './app-sidebar';
import { GlobalSearchTrigger } from './global-search';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

interface MobileDashboardShellProps {
  label: string;
  navItems: NavItem[];
  bottomNavLabels: string[];
  session: Session;
  children: React.ReactNode;
}

/**
 * Mobile-first shell for Student/Parent — bottom tab bar below `md`, the
 * same grouped sidebar as staff above it. See prompts/00-DESIGN-SYSTEM.md §5
 * and new-design §29 ("do not simply shrink the desktop design").
 *
 * The phone layout is genuinely a different layout rather than a narrowed
 * one: primary navigation moves to thumb reach at the bottom, the overflow
 * opens as a bottom sheet rather than a side drawer, and every tab target is
 * a full-height column so it clears the 44px touch minimum.
 */
export function MobileDashboardShell({
  label,
  navItems,
  bottomNavLabels,
  session,
  children,
}: MobileDashboardShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const activeItem = findActiveNavItem(pathname, navItems);

  const byLabel = new Map(navItems.map((item) => [item.label, item]));
  const bottomItems = bottomNavLabels
    .filter((l) => l !== 'More')
    .map((l) => byLabel.get(l))
    .filter((item): item is NavItem => Boolean(item));
  const moreItems = navItems.filter((item) => !bottomItems.includes(item));
  const moreGroups = groupNavItems(moreItems);
  const moreIsActive = Boolean(activeItem && moreItems.includes(activeItem));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[16.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex print:hidden">
        <SidebarBrand label={label} collapsed={false} />
        <div className="flex-1 overflow-y-auto">
          <AppSidebarNav navItems={navItems} activeHref={activeItem?.href} />
        </div>
      </aside>

      {/* min-w-0 overrides the flex default of min-width:auto — see the
          identical note in staff-dashboard-shell.tsx. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/85 px-4 backdrop-blur-md print:hidden">
          <Breadcrumbs
            items={
              activeItem && activeItem.href !== navItems[0]?.href
                ? [{ label, href: navItems[0]?.href }, { label: activeItem.label }]
                : [{ label: activeItem?.label ?? label }]
            }
            className="hidden flex-1 md:block"
          />
          <span className="flex-1 truncate text-base font-semibold md:hidden">
            {activeItem?.label ?? label}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <div className="hidden md:block">
              <GlobalSearchTrigger navItems={navItems} />
            </div>
            <ThemeToggle />
            <NotificationBell />
            <UserMenu session={session} />
          </div>
        </header>

        {/* pb-24 clears the fixed tab bar plus the iOS home indicator. */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
          <div key={pathname} className="animate-page-in mx-auto max-w-[92rem]">
            {children}
          </div>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
          aria-label={`${label} primary navigation`}
        >
          {bottomItems.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = item.href === activeItem?.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors duration-[--duration-fast]',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-[--duration-fast]',
                    // A filled pill behind the icon, so the active tab is not
                    // signalled by colour alone (§14 / new-design §36).
                    active && 'bg-sidebar-primary',
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="w-full truncate text-center leading-tight">
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            );
          })}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors duration-[--duration-fast]',
                moreIsActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-[--duration-fast]',
                  moreIsActive && 'bg-sidebar-primary',
                )}
              >
                <MoreHorizontal className="size-[18px]" aria-hidden="true" />
              </span>
              <span>More</span>
            </button>
            <SheetContent side="bottom" className="max-h-[78vh] overflow-y-auto">
              <SheetTitle>More</SheetTitle>
              <div className="flex flex-col gap-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {moreGroups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-0.5">
                    <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {group.label}
                    </p>
                    {group.items.map((item) => {
                      const Icon = NAV_ICONS[item.icon];
                      const active = item.href === activeItem?.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-[--duration-fast]',
                            active
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-foreground hover:bg-accent',
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-[18px] shrink-0',
                              active ? 'text-sidebar-primary-foreground' : 'text-muted-foreground',
                            )}
                            aria-hidden="true"
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </div>
  );
}
