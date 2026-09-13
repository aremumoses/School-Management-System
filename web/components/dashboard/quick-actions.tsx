import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One short line — what this actually does, not a restatement of the label. */
  hint?: string;
}

/**
 * Quick actions — new-design §7.
 *
 * The point is *task* shortcuts, not a second navigation menu: every entry
 * should be something a user came here to do today ("Record Payment"),
 * never a place they might browse ("Finance"). Keep the list to 6 or fewer
 * per dashboard — past that it stops being a shortcut and becomes another
 * list to read.
 */
export function QuickActions({
  actions,
  title = 'Quick actions',
}: {
  actions: QuickAction[];
  title?: string;
}) {
  if (actions.length === 0) return null;

  return (
    <Card className="rounded-xl ring-0 [--card-spacing:--spacing(6)] dark:ring-1">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="group flex min-h-[4.5rem] items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-[--duration-base] ease-[--ease-out-soft] hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <action.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-semibold text-heading">
                  {action.label}
                </span>
                {action.hint && (
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {action.hint}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
