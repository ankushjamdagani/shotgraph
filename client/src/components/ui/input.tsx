import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from './cn';
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { borderTone?: 'control' | 'subtle'; variant?: 'default' | 'plain' }
>(({ className, borderTone = 'control', variant = 'default', ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'appearance-none h-control w-full min-w-0 rounded-md border border-control bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-app disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger',
      borderTone === 'subtle' && 'border-subtle',
      variant === 'plain' && 'focus-visible:outline-none rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:underline focus-visible:decoration-focus focus-visible:underline-offset-4',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { variant?: 'default' | 'plain' }
>(({ className, variant = 'default', ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-24 w-full rounded-md border border-control bg-surface p-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-1 focus-visible:ring-focus disabled:opacity-50 aria-[invalid=true]:border-danger',
      variant === 'plain' && 'focus-visible:outline-none resize-none rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium text-text-primary', className)}
      {...props}
    />
  );
}
