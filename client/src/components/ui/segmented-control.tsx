import { ToggleGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from './cn';
export function SegmentedControl({
  value,
  onValueChange,
  label,
  options,
  className,
  variant = 'plain',
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  options: {
    value: string;
    label: string;
    content?: ReactNode;
    disabled?: boolean;
  }[];
  className?: string;
  variant?: 'plain' | 'inset';
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      aria-label={label}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-lg',
        variant === 'inset' && 'border border-control bg-surface p-1',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option.label}
          disabled={option.disabled}
          className={cn(
            'inline-flex h-control items-center justify-center gap-1.5 rounded-md px-3 text-xs text-text-muted outline-none transition-colors duration-fast hover:bg-hover hover:text-text-primary focus-visible:ring-1 focus-visible:ring-focus disabled:opacity-50 data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-text-primary motion-reduce:transition-none [&_svg]:size-3.5',
            variant === 'inset' &&
              'data-[state=on]:bg-text-primary data-[state=on]:text-app [&[data-state=on]_span]:text-app',
          )}
        >
          {option.content || option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
