'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Up to five page numbers, centred on the current page. */
function pageWindow(current: number, total: number): number[] {
  const size = Math.min(5, total);
  const start = Math.min(Math.max(1, current - 2), total - size + 1);
  return Array.from({ length: size }, (_, index) => start + index);
}

/**
 * Footer of Akademi's table card: "Showing X–Y of Z" and numbered pages.
 * `currentPage` is 1-based.
 */
export function TablePagination({
  firstShown,
  lastShown,
  total,
  itemName,
  currentPage,
  pageCount,
  onPageChange,
}: {
  firstShown: number;
  lastShown: number;
  total: number;
  itemName?: { singular: string; plural: string };
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
      <p className="text-sm text-muted-foreground">
        Showing {firstShown}–{lastShown} of {total}
        {itemName ? ` ${total === 1 ? itemName.singular : itemName.plural}` : ''}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          {pageWindow(currentPage, pageCount).map((pageNumber) => {
            const isCurrent = pageNumber === currentPage;
            return (
              <Button
                key={pageNumber}
                variant={isCurrent ? 'default' : 'ghost'}
                size="icon"
                aria-label={`Page ${pageNumber}`}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => !isCurrent && onPageChange(pageNumber)}
                className={cn(
                  'size-9 rounded-md tabular-nums',
                  !isCurrent && 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                )}
              >
                {pageNumber}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Next page"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
