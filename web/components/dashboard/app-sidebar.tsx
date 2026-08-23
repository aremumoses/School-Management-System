'use client';

import Link from 'next/link';
import { NAV_ICONS } from '@/lib/nav-icons';
import { groupNavItems, type NavItem } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';

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
    <div className={cn('flex h-16 shrink-0 items-center gap-2.5', collapsed ? 'px-3' : 'px-4')}>
      {/* Solid brand mark — deliberately uses --primary directly rather than
          --sidebar-primary, since the latter is a light tint reserved for the
          active-nav pill; the logo should read as a solid brand chip
          regardless of the sidebar's own theme. */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-[13px] font-bold tracking-tight text-primary-foreground shadow-sm">
        SMS
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{label}</p>
          <p className="truncate text-[11px] text-muted-foreground">School OS</p>
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
        'group relative flex items-center rounded-lg text-sm font-medium transition-colors duration-[--duration-fast] ease-[--ease-out-soft] focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        collapsed ? 'h-10 w-10 justify-center' : 'gap-2.5 px-2.5 py-2',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          active ? 'text-sidebar-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
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
    <nav className={cn('flex flex-col gap-5 pb-6', collapsed ? 'items-center px-2' : 'px-3')}>
      {groups.map((group) => (
        <div key={group.label} className={cn('flex flex-col gap-0.5', collapsed && 'items-center')}>
          {collapsed ? (
            // A visible heading would not fit the rail, but the grouping is
            // still real structure — keep it for screen readers and mark the
            // boundary visually with a hairline instead.
            <>
              <span className="sr-only">{group.label}</span>
              <div className="mb-1.5 h-px w-6 bg-sidebar-border first:hidden" aria-hidden="true" />
            </>
          ) : (
            <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
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

export { Brand as SidebarBrand };
