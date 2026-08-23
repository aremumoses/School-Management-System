'use client';

import { CornerDownLeft, GraduationCap, Loader2, Search, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { globalSearch, type SearchHit } from '@/lib/actions/search';
import { groupNavItems, type NavItem } from '@/lib/dashboard-config';
import { NAV_ICONS } from '@/lib/nav-icons';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 220;
const MIN_RECORD_QUERY = 2;

interface Row {
  key: string;
  section: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Lower sorts first. Records are appended after pages regardless. */
  rank: number;
}

/**
 * Global search — the ⌘K palette described in new-design.md §26, and in
 * prompts/00-DESIGN-SYSTEM.md §5 ("Command palette").
 *
 * Two result sources with deliberately different latencies. *Pages* come
 * from the caller's own nav config and are filtered in memory, so the
 * palette is useful on the very first keystroke and works offline; *records*
 * (students, staff) round-trip to a server action and are debounced. The
 * page results are the reason this is worth having at all — a school admin
 * has 25 destinations and no one memorises where "Assessment Structure"
 * lives.
 *
 * Only nav items the caller can actually reach are searchable: the shell
 * passes the already module-filtered, already role-scoped list, so the
 * palette can never advertise a screen the user would be bounced from.
 */
export function GlobalSearch({
  navItems,
  open,
  onOpenChange,
}: {
  navItems: NavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 shadow-xl sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        {/* Mounted only while open, which is what resets the query between
            openings. An `if (open) setQuery('')` effect would do the same job
            but as a cascading render the compiler rightly objects to —
            unmounting is both simpler and the actual React idiom. */}
        {open && <SearchPanel navItems={navItems} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function SearchPanel({
  navItems,
  onOpenChange,
}: {
  navItems: NavItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<{ hits: SearchHit[]; searching: boolean }>({
    hits: [],
    searching: false,
  });
  const [rawIndex, setRawIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const hits = records.hits;
  const searching = records.searching;

  // Debounced record lookup. Every state write happens inside a timer rather
  // than in the effect's synchronous pass — same reason as notification-bell's
  // deferred first fetch. The `cancelled` flag (rather than an
  // AbortController) is because this calls a server action, which has no
  // signal to pass; the guard stops a slow earlier query from overwriting a
  // newer result.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_RECORD_QUERY) {
      const clear = setTimeout(() => setRecords({ hits: [], searching: false }), 0);
      return () => clearTimeout(clear);
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      setRecords((current) => ({ ...current, searching: true }));
      void globalSearch(term)
        .then((results) => {
          if (cancelled) return;
          setRecords({ hits: [...results.students, ...results.staff], searching: false });
        })
        .catch(() => {
          if (!cancelled) setRecords({ hits: [], searching: false });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const rows = useMemo<Row[]>(() => {
    const term = query.trim().toLowerCase();
    const navGroups = groupNavItems(navItems);
    const pageRows: Row[] = [];

    for (const group of navGroups) {
      for (const item of group.items) {
        const rank = term ? matchRank(term, item.label, group.label, item.hint) : 0;
        if (rank === null) continue;
        pageRows.push({
          key: `nav:${item.href}`,
          section: term ? 'Pages' : 'Jump to',
          label: item.label,
          sublabel: item.hint ?? group.label,
          href: item.href,
          icon: NAV_ICONS[item.icon],
          rank,
        });
      }
    }

    // Stable sort by match quality, so a page whose *name* starts with the
    // term always beats one that merely mentions it in its description.
    // Without this, typing "attend" put "Analytics & Reports" above
    // "Attendance" — its hint happens to contain the word.
    if (term) pageRows.sort((a, b) => a.rank - b.rank);

    // Unfiltered, the palette is a launcher, not a dump of all 25 screens.
    const pages = term ? pageRows.slice(0, 8) : pageRows.slice(0, 6);

    const recordRows: Row[] = hits.map((hit) => ({
      key: `${hit.kind}:${hit.id}`,
      section: hit.kind === 'student' ? 'Students' : 'Staff',
      label: hit.title,
      sublabel: hit.subtitle,
      href: hit.href,
      icon: hit.kind === 'student' ? GraduationCap : UserRound,
      rank: 0,
    }));

    return [...pages, ...recordRows];
  }, [query, navItems, hits]);

  // Derived, not stored: as results stream in the highlight should stay where
  // the user put it unless that row no longer exists. Clamping during render
  // rather than in an effect means there is never a frame showing an index
  // that points past the end of the list.
  const activeIndex = rawIndex >= rows.length ? 0 : rawIndex;

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setRawIndex(rows.length ? (activeIndex + 1) % rows.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setRawIndex(rows.length ? (activeIndex - 1 + rows.length) % rows.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row) go(row.href);
    }
  }

  // Keep the highlighted row in view during keyboard traversal.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let lastSection: string | null = null;

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border px-3.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, students, staff…"
          aria-label="Search pages, students and staff"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {searching && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div ref={listRef} className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5" role="listbox">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No matches</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a student&apos;s name, an admission number, or a page title.
            </p>
          </div>
        ) : (
          rows.map((row, index) => {
            const showSection = row.section !== lastSection;
            lastSection = row.section;
            const active = index === activeIndex;
            return (
              <div key={row.key}>
                {showSection && (
                  <p className="px-2.5 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {row.section}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  onClick={() => go(row.href)}
                  onMouseMove={() => setRawIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-[--duration-fast]',
                    active ? 'bg-accent' : 'bg-transparent',
                  )}
                >
                  <row.icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.label}
                    </span>
                    {row.sublabel && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.sublabel}
                      </span>
                    )}
                  </span>
                  {active && (
                    <CornerDownLeft
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-3.5 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          to navigate
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd>
          to open
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>esc</Kbd>
          to close
        </span>
      </div>
    </>
  );
}

/**
 * How well a nav item matches the typed term — lower is better, `null` means
 * no match at all. Deliberately a four-bucket ordering rather than a fuzzy
 * score: with at most ~25 candidates the useful distinction is only "is this
 * the thing they named, or something that mentions it", and a real fuzzy
 * ranker would be both slower and harder to predict.
 */
function matchRank(
  term: string,
  label: string,
  group: string,
  hint?: string,
): number | null {
  const name = label.toLowerCase();
  if (name.startsWith(term)) return 0;
  if (name.includes(term)) return 1;
  if (group.toLowerCase().includes(term)) return 2;
  if (hint?.toLowerCase().includes(term)) return 3;
  return null;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

/**
 * Owns the ⌘K / Ctrl-K binding and the trigger button in the header.
 *
 * The listener is registered once here rather than inside the dialog so the
 * shortcut works whether or not the palette is mounted open, and it bails
 * out when focus is inside a text field — otherwise typing a literal "k"
 * with a stray modifier in a lesson note would yank the editor away.
 */
export function GlobalSearchTrigger({ navItems }: { navItems: NavItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
      ) {
      return;
      }
      event.preventDefault();
      setOpen((current) => !current);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-sm text-muted-foreground transition-colors duration-[--duration-fast] hover:border-input hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:w-64 lg:w-72"
      aria-label="Search pages, students and staff"
      >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden flex-1 text-left md:inline">Search…</span>
      <kbd className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border border-border px-1.5 py-0.5 font-sans text-[10px] font-medium md:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
      </button>
      <GlobalSearch navItems={navItems} open={open} onOpenChange={setOpen} />
    </>
  );
}
