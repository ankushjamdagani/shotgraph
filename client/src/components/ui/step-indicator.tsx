import { cn } from './cn';
export const stepIndicatorVariants = ['counter', 'breadcrumb', 'track', 'chapters', 'none'] as const;
export type StepIndicatorVariant = typeof stepIndicatorVariants[number];
export interface StepIndicatorProps {
  steps: string[]; currentStep: number; furthestStep: number;
  onStepClick: (step: number) => void; variant?: StepIndicatorVariant; disabled?: boolean;
}
export function StepIndicator({ steps, currentStep, furthestStep, onStepClick, variant = 'counter', disabled }: StepIndicatorProps) {
  if (variant === 'none') return null;
  const label = `${currentStep} / ${steps.length} · ${steps[currentStep - 1]}`;
  if (variant === 'counter') return <p aria-label="Project setup progress" className="text-xs text-text-muted tabular-nums">{label}</p>;
  if (variant === 'track') return <div aria-label="Project setup progress" className="w-40 space-y-2"><p className="text-xs text-text-muted">{label}</p><div role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep} className="h-0.5 bg-subtle"><div className="h-full bg-text-primary transition-[width] motion-reduce:transition-none" style={{ width: `${currentStep / steps.length * 100}%` }} /></div></div>;
  return <nav aria-label="Project setup steps"><ol className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', variant === 'chapters' && 'gap-x-4')}>
    {steps.map((name, index) => <li key={name} className="flex items-center gap-3">
      {variant === 'breadcrumb' && index > 0 && <span aria-hidden className="text-text-muted">/</span>}
      <button type="button" disabled={disabled || index + 1 > furthestStep} aria-current={index + 1 === currentStep ? 'step' : undefined} onClick={() => onStepClick(index + 1)} className={cn('rounded-sm py-1 text-xs text-text-muted outline-none hover:text-text-primary focus-visible:ring-1 focus-visible:ring-focus disabled:opacity-40', index + 1 === currentStep && 'font-semibold text-text-primary', variant === 'chapters' && 'border-b border-transparent aria-[current=step]:border-text-primary')}>
        {variant === 'chapters' && <span className="mr-1 font-mono">{String(index + 1).padStart(2, '0')}</span>}{name}
      </button>
    </li>)}
  </ol></nav>;
}
