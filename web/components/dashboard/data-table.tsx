'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDownUp, Check, ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** The data-table pattern from prompts/00-DESIGN-SYSTEM.md §6 — sticky header, sortable columns, row hover, pagination, and a real "no results" state for the search-filtered case (the all-empty case is handled by the page itself, before this component is even rendered). */
export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Search…',
  getRowId,
  rowSelection,
  onRowSelectionChange,
  rowClassName,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  /** Required (with `rowSelection`/`onRowSelectionChange`) to enable checkbox row selection — e.g. for a bulk action toolbar. */
  getRowId?: (row: TData) => string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (next: RowSelectionState) => void;
  /** Per-row styling hook — e.g. an error-tinted left border on overdue rows. */
  rowClassName?: (row: TData) => string | undefined;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const enableRowSelection = Boolean(onRowSelectionChange);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, ...(rowSelection ? { rowSelection } : {}) },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const next =
            typeof updater === 'function' ? updater(rowSelection ?? {}) : updater;
          onRowSelectionChange(next);
        }
      : undefined,
    enableRowSelection,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const rows = table.getRowModel().rows;

  // Sorting lives in the column headers, which the mobile card layout does
  // not render — so it gets its own control below md rather than silently
  // disappearing on a phone.
  const sortableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanSort() && typeof column.columnDef.header === 'string');
  const activeSort = sorting[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label={searchPlaceholder}
          />
        </div>

        {sortableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="lg" className="shrink-0 md:hidden" />}
            >
              <ArrowDownUp className="size-4" />
              Sort
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {sortableColumns.map((column) => {
                const isActive = activeSort?.id === column.id;
                return (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={() => column.toggleSorting(isActive ? !activeSort.desc : false)}
                  >
                    <span className="flex-1">{String(column.columnDef.header)}</span>
                    {isActive &&
                      (activeSort.desc ? (
                        <ChevronDown className="size-4 text-primary" />
                      ) : (
                        <ChevronUp className="size-4 text-primary" />
                      ))}
                    {!isActive && <Check className="size-4 opacity-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* new-design §38: below md the table becomes a card list rather than
          a horizontally-scrolling grid. A 9-column student row is unusable
          on a phone at any scroll offset — the header scrolls out of view,
          so every cell loses the label that gave it meaning. */}
      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      onKeyDown={
                        canSort
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                header.column.toggleSorting(undefined, e.shiftKey);
                              }
                            }
                          : undefined
                      }
                      tabIndex={canSort ? 0 : undefined}
                      role={canSort ? 'button' : undefined}
                      aria-sort={
                        sortDirection === 'asc'
                          ? 'ascending'
                          : sortDirection === 'desc'
                            ? 'descending'
                            : canSort
                              ? 'none'
                              : undefined
                      }
                      className={cn(
                        canSort &&
                          'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="size-3.5" aria-hidden="true" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown
                              className="size-3.5 text-muted-foreground/50"
                              aria-hidden="true"
                            />
                          ))}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results match your search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn('hover:bg-accent/60', rowClassName?.(row.original))}
                  data-selected={row.getIsSelected() || undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No results match your search.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                'rounded-xl border border-border bg-card p-3',
                rowClassName?.(row.original),
              )}
              data-selected={row.getIsSelected() || undefined}
            >
              <dl className="space-y-1.5">
                {row.getVisibleCells().map((cell) => {
                  const header = cell.column.columnDef.header;
                  const rendered = flexRender(cell.column.columnDef.cell, cell.getContext());
                  // A non-string header is a control (the select-all
                  // checkbox) or a bare actions column — there's no label
                  // worth printing, so the cell spans the row instead.
                  if (typeof header !== 'string' || header === '') {
                    return (
                      <dd key={cell.id} className="flex justify-end pt-1 first:pt-0">
                        {rendered}
                      </dd>
                    );
                  }
                  return (
                    <div key={cell.id} className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                        {header}
                      </dt>
                      <dd className="min-w-0 text-right text-sm text-foreground">{rendered}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))
        )}
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
