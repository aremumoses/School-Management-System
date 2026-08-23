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
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="group flex min-h-[4.5rem] items-start gap-3 rounded-xl border border-border/70 p-3 transition-all duration-[--duration-base] ease-[--ease-out-soft] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/60 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <action.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-medium text-foreground">
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
