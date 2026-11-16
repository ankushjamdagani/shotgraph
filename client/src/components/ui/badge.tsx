import type { HTMLAttributes } from 'react';
import { cn } from './cn';
export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border border-subtle bg-surface px-1.5 py-0.5 text-xs font-medium text-text-muted',
        className,
      )}
      {...props}
    />
  );
}
/** Parent removes this after six seconds; no persistence or layout shift. */
export function NewItemIndicator({
  side = 'right',
  small = false,
}: {
  side?: 'left' | 'right';
  small?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="New project"
      className={cn(
        'pointer-events-none absolute z-10 size-2 rounded-full bg-notification animate-indicator-life motion-reduce:animate-none after:absolute after:-inset-1 after:rounded-full after:border after:border-notification after:opacity-0 after:animate-indicator-ring motion-reduce:after:animate-none',
        side === 'right' ? 'right-3 top-3' : 'left-1.5 top-1.5',
        small && 'after:-inset-0.5',
      )}
    />
  );
}
