import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <ol className="flex items-start" aria-label="Progress">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        return (
          <li key={label} className={cn('flex items-start', index < steps.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-2">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isComplete && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-card text-primary ring-4 ring-primary/15',
                  !isComplete && !isCurrent && 'border-border bg-card text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="size-4" aria-hidden="true" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'max-w-28 text-center text-xs font-medium',
                  isCurrent || isComplete ? 'text-heading' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {/* mt-5 centres the connector on the 40px circle, whatever the label's height. */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 mt-5 h-0.5 flex-1 rounded-full',
                  isComplete ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
