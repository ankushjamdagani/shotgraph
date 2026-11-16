import { Switch as Primitive, Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn';
export function Switch({
  className,
  ...props
}: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-subtle bg-card outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 data-[state=checked]:bg-text-primary motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-text-muted transition-transform duration-fast data-[state=checked]:translate-x-4 data-[state=checked]:bg-app motion-reduce:transition-none" />
    </Primitive.Root>
  );
}
export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-focus bg-surface outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 data-[state=checked]:bg-text-primary data-[state=checked]:text-app',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
