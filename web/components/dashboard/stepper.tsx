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
          <li key={label} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isComplete && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary',
                  !isComplete && !isCurrent && 'border-border text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="size-4" aria-hidden="true" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'max-w-24 text-center text-xs font-medium',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 -translate-y-3.5',
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
