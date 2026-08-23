'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/lib/types/admin';

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

function ExpandableRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasJson = entry.beforeJson != null || entry.afterJson != null;

  return (
    <>
      <tr className="hover:bg-muted/30">
        <td className="px-3 py-2">
          <code className="text-xs font-mono text-muted-foreground">
            {entry.actorType}
          </code>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {entry.actorId ? entry.actorId.slice(0, 8) + '…' : '—'}
        </td>
        <td className="px-3 py-2">
          <Badge variant={actionVariant(entry.action)} className="text-xs">
            {entry.action}
          </Badge>
        </td>
        <td className="px-3 py-2">
          <span className="text-xs font-mono">{entry.entityType}</span>
          {entry.entityId && (
            <span className="ml-1 text-xs text-muted-foreground">
              {entry.entityId.slice(0, 8)}…
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
          {new Date(entry.createdAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </td>
        <td className="px-3 py-2">
          {hasJson ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="h-6 w-6 p-0"
            >
              {expanded ? (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden="true" />
              )}
              <span className="sr-only">{expanded ? 'Collapse' : 'Expand'} detail</span>
            </Button>
          ) : null}
        </td>
      </tr>
      {expanded && hasJson && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-3 pb-3 pt-1">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {entry.beforeJson != null && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
                  <pre className="overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
                    {JSON.stringify(entry.beforeJson, null, 2)}
                  </pre>
                </div>
              )}
              {entry.afterJson != null && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
                  <pre className="overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
                    {JSON.stringify(entry.afterJson, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No audit log entries match the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Actor Type</th>
              <th className="px-3 py-2 font-medium">Actor ID</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Entity</th>
              <th className="px-3 py-2 font-medium">Timestamp</th>
              <th className="px-3 py-2 font-medium" aria-label="Expand" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <ExpandableRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
