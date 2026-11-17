import { Check } from 'lucide-react';
import * as React from 'react';
import { DropdownMenu as Primitive } from 'radix-ui';
import { cn } from './cn';
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-[60] min-w-44 rounded-lg border border-subtle bg-surface p-1 text-text-primary shadow-dialog data-[state=open]:animate-enter motion-reduce:animate-none',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof Primitive.Item> & { destructive?: boolean }) {
  return (
    <Primitive.Item
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none focus:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4',
        destructive && 'text-danger',
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator(
  props: React.ComponentProps<typeof Primitive.Separator>,
) {
  return <Primitive.Separator className="my-1 h-px bg-subtle" {...props} />;
}

export const DropdownMenuRadioGroup = Primitive.RadioGroup;
export function DropdownMenuRadioItem({className,children,...props}:React.ComponentProps<typeof Primitive.RadioItem>) {
  return <Primitive.RadioItem className={cn('relative flex cursor-default select-none items-center gap-2.5 rounded-md py-2 pl-3 pr-8 text-sm outline-none focus:bg-hover [&_svg]:size-3.5',className)} {...props}>
    {children}<Primitive.ItemIndicator className="absolute right-2.5"><Check/></Primitive.ItemIndicator>
  </Primitive.RadioItem>;
}
