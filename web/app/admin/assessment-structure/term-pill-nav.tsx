import { cn } from '@/lib/utils';

/**
 * Akademi's pill strip for choosing a term, shared by the Admin and Exam
 * Officer assessment-structure pages. Plain links, as before: choosing a term
 * is a full page load, which also resets the component editor below.
 */
export function TermPillNav({
  terms,
  selectedTermId,
  basePath,
}: {
  terms: { id: string; name: string; sessionName: string }[];
  selectedTermId: string;
  basePath: string;
}) {
  return (
    <nav
      aria-label="Term"
      className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-card p-1.5 dark:ring-1 dark:ring-foreground/10"
    >
      {terms.map((term) => {
        const isActive = term.id === selectedTermId;
        return (
          <a
            key={term.id}
            href={`${basePath}?termId=${term.id}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              isActive
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-foreground'
                : 'text-muted-foreground hover:bg-primary/5 hover:text-heading',
            )}
          >
            {term.sessionName} — {term.name}
          </a>
        );
      })}
    </nav>
  );
}
