import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BulkImportPreviewResponse } from '@/lib/types/students';

interface DisplayRow {
  rowNumber: number;
  isValid: boolean;
  name: string;
  details: string;
  errors: string[];
}

/**
 * A card list rather than a table — a wide table forces horizontal
 * scrolling on a 375px viewport to read error text, which works against
 * this screen's explicit goal of never making an error feel hidden or
 * like a crash (see the bulk-import frontend prompt). Cards wrap text
 * naturally at any width instead.
 */
export function ImportPreviewTable({ preview }: { preview: BulkImportPreviewResponse }) {
  const rows: DisplayRow[] = [
    ...preview.valid.map((row) => ({
      rowNumber: row.rowNumber,
      isValid: true,
      name: `${row.firstName} ${row.lastName}`,
      details: `${row.className} ${row.armName} — Guardian: ${row.guardianFirstName} ${row.guardianLastName}`,
      errors: [],
    })),
    ...preview.invalid.map((row) => ({
      rowNumber: row.rowNumber,
      isValid: false,
      name: `${row.data.firstName ?? ''} ${row.data.lastName ?? ''}`.trim() || '(blank name)',
      details: [row.data.className, row.data.armName].filter(Boolean).join(' '),
      errors: row.errors,
    })),
  ].sort((a, b) => a.rowNumber - b.rowNumber);

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.rowNumber}
          className={cn(
            'flex gap-3 rounded-lg border p-3',
            row.isValid ? 'border-border' : 'border-error-soft bg-error-soft/30',
          )}
        >
          {row.isValid ? (
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-label="Valid row"
            />
          ) : (
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-label="Row has errors"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-foreground">{row.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">Row {row.rowNumber}</span>
            </div>
            {row.isValid ? (
              <p className="text-sm text-muted-foreground">{row.details}</p>
            ) : (
              <ul className="list-inside list-disc space-y-0.5 text-sm text-destructive">
                {row.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
