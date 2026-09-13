import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/**
 * Akademi's brand-coloured form label. Required fields get a red asterisk,
 * plus "(required)" for screen readers, which don't announce the asterisk.
 */
export function FormFieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-primary dark:text-heading">
      <span>
        {children}
        {required && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </span>
    </Label>
  );
}
