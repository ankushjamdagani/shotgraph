import * as React from 'react';
import { Select as Primitive } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
export const Select = Primitive.Root;
export const SelectValue = Primitive.Value;
export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        'flex h-control min-w-36 items-center justify-between gap-3 rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon>
        <ChevronDown className="size-3.5" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}
export function SelectContent({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        position="popper"
        sideOffset={5}
        className="z-[60] max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-lg border border-subtle bg-surface p-1 text-text-primary shadow-dialog"
        {...props}
      >
        <Primitive.Viewport>{children}</Primitive.Viewport>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function SelectItem({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className="relative flex select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none focus:bg-hover data-[disabled]:opacity-50"
      {...props}
    >
      <Primitive.ItemIndicator className="absolute left-2">
        <Check className="size-3.5" />
      </Primitive.ItemIndicator>
      <Primitive.ItemText>{children}</Primitive.ItemText>
    </Primitive.Item>
  );
}
