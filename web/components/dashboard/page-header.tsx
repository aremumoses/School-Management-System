import type { ReactNode } from 'react';

/**
 * Page title (H1) + optional description + actions, top-right — design
 * system §5.
 *
 * The title steps down to 2xl on small screens. That is not just scaling: at
 * 375px a large heading eats a third of the fold before the user has seen a
 * single row of content, which is exactly the "shrunk desktop design"
 * new-design §29 warns against.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  /** The page's primary action, or a fragment of two or three. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-heading sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
