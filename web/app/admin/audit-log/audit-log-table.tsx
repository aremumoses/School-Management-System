'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/lib/types/admin';
import { cn } from '@/lib/utils';

const ACTION_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'outline'> = {
  CREATE: 'success',
  DELETE: 'error',
  UPDATE: 'warning',
  APPROVE: 'info',
  PUBLISH: 'info',
  RETURN: 'warning',
  LOGIN: 'outline',
  LOGOUT: 'outline',
};

function actionVariant(action: string): 'success' | 'error' | 'warning' | 'info' | 'outline' {
  const key = Object.keys(ACTION_VARIANT).find((k) => action.startsWith(k));
  return key ? ACTION_VARIANT[key] : 'outline';
}

const HEAD = 'h-12 text-left font-semibold whitespace-nowrap text-primary dark:text-heading';

function JsonPanel({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-semibold text-heading">{label}</p>
      <pre className="max-h-80 overflow-auto rounded-lg bg-card p-3 font-mono text-xs text-foreground ring-1 ring-border">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function ExpandableRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasJson = entry.beforeJson != null || entry.afterJson != null;

  return (
    <>
      <tr className="transition-colors hover:bg-primary/5">
        <td className="py-3 pr-3 pl-5 sm:pl-6">
          <span className="block text-xs font-semibold tracking-wide text-heading">{entry.actorType}</span>
          <span className="block font-mono text-xs text-muted-foreground">
            {entry.actorId ? entry.actorId.slice(0, 8) + '…' : '—'}
          </span>
        </td>
        <td className="px-3 py-3">
          <Badge variant={actionVariant(entry.action)} className="font-mono text-xs">
            {entry.action}
          </Badge>
        </td>
        <td className="px-3 py-3">
          <span className="block text-sm font-medium text-heading">{entry.entityType}</span>
          {entry.entityId && (
            <span className="block font-mono text-xs text-muted-foreground">
              {entry.entityId.slice(0, 8)}…
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {new Date(entry.createdAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </td>
        <td className="py-3 pr-5 pl-3 text-right sm:pr-6">
          {hasJson ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
            >
              <ChevronDown
                className={cn('size-4 transition-transform', expanded && 'rotate-180')}
                aria-hidden="true"
              />
              <span className="sr-only">{expanded ? 'Collapse' : 'Expand'} detail</span>
            </Button>
          ) : null}
        </td>
      </tr>
      {expanded && hasJson && (
        <tr className="bg-muted/40">
          <td colSpan={5} className="px-5 pt-1 pb-4 sm:px-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {entry.beforeJson != null && <JsonPanel label="Before" value={entry.beforeJson} />}
              {entry.afterJson != null && <JsonPanel label="After" value={entry.afterJson} />}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** The entries table — the page frames it in a card with the total and pagination. */
export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
        No audit log entries match the current filters.
      </p>
    );
  }

  return (
    // `relative` makes this scroller the containing block for the sr-only
    // labels (absolutely positioned) in the last column — without it they
    // escape the scroll clip and push the whole page sideways on phones.
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-primary/5">
            <th scope="col" className={cn(HEAD, 'pr-3 pl-5 sm:pl-6')}>Actor</th>
            <th scope="col" className={cn(HEAD, 'px-3')}>Action</th>
            <th scope="col" className={cn(HEAD, 'px-3')}>Entity</th>
            <th scope="col" className={cn(HEAD, 'px-3')}>Timestamp</th>
            <th scope="col" className="w-14 pr-5 sm:pr-6">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <ExpandableRow key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
