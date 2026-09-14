'use client';

import { Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { NAV_ICONS } from '@/lib/nav-icons';
import { groupNavItems, type NavItem } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';
import { useLogout } from './use-logout';

/**
 * The grouped, icon-led sidebar navigation shared by every dashboard shell
 * (design system §5).
 *
 * Two things make this readable where the previous flat list was not:
 * items are bucketed under section headings (Admin alone has 25 of them),
 * and each carries an icon so the collapsed rail is still navigable. The
 * rail is not a separate component — `collapsed` drives the same markup, so
 * the active item, hover states and focus order can never drift between the
 * two widths.
 */

function Brand({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex h-[4.5rem] shrink-0 items-center gap-3',
        collapsed ? 'justify-center px-3' : 'px-6',
      )}
    >
      {/* Coral mark, matching the login panel. Decorative: the label beside it
          (or the page title, in the rail) carries the name. */}
      <div
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-coral text-[0.8125rem] font-bold tracking-tight text-brand-foreground"
      >
        SMS
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-lg font-semibold text-sidebar-accent-foreground">{label}</p>
          <p className="truncate text-xs text-sidebar-foreground/80">School OS</p>
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  // Indexed directly rather than through a `navIcon(name)` helper: the React
  // Compiler cannot prove an opaque call returns a stable component and
  // rejects it as "creating a component during render". A property read off a
  // module-level constant it can follow.
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      // `title` rather than a Tooltip component: in the collapsed rail this
      // is the only way to read an item's name, and a native title survives
      // even if JS for the tooltip layer hasn't hydrated yet.
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center rounded-md text-sm transition-colors duration-[--duration-fast] ease-[--ease-out-soft] focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        collapsed ? 'size-11 justify-center' : 'gap-3 px-4 py-2.5',
        active
          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          active
            ? 'text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground',
        )}
        aria-hidden="true"
      />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );
}

export function AppSidebarNav({
  navItems,
  activeHref,
  collapsed = false,
  onNavigate,
}: {
  navItems: NavItem[];
  activeHref?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const groups = groupNavItems(navItems);

  return (
    <nav className={cn('flex flex-col gap-5 pt-2 pb-6', collapsed ? 'items-center px-2' : 'px-4')}>
      {groups.map((group) => (
        <div key={group.label} className={cn('flex flex-col gap-1', collapsed && 'items-center')}>
          {collapsed ? (
            // A visible heading would not fit the rail, but the grouping is
            // still real structure — keep it for screen readers and mark the
            // boundary visually with a hairline instead.
            <>
              <span className="sr-only">{group.label}</span>
              <div className="mb-1.5 h-px w-6 bg-sidebar-border first:hidden" aria-hidden="true" />
            </>
          ) : (
            <p className="px-4 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/80 uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={item.href === activeHref}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Log out, pinned to the bottom of the sidebar so it is always one click
 * away — before this it only existed inside the account menu in the top bar.
 * Styled like a nav item; in the collapsed rail it is icon-only with a title.
 */
export function SidebarLogout({ collapsed = false }: { collapsed?: boolean }) {
  const { loggingOut, logout } = useLogout();

  return (
    <div
      className={cn(
        'shrink-0 border-t border-sidebar-border py-4',
        collapsed ? 'flex justify-center px-2' : 'px-4',
      )}
    >
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loggingOut}
        title={collapsed ? 'Log out' : undefined}
        className={cn(
          'group flex items-center rounded-md text-sm text-sidebar-foreground/90 transition-colors duration-[--duration-fast] ease-[--ease-out-soft] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none disabled:opacity-70',
          collapsed ? 'size-11 justify-center' : 'w-full gap-3 px-4 py-2.5',
        )}
      >
        {loggingOut ? (
          <Loader2 className="size-[18px] shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut
            className="size-[18px] shrink-0 text-sidebar-foreground/80 transition-colors group-hover:text-sidebar-accent-foreground"
            aria-hidden="true"
          />
        )}
        {collapsed ? (
          <span className="sr-only">Log out</span>
        ) : (
          <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
        )}
      </button>
    </div>
  );
}

export { Brand as SidebarBrand };
