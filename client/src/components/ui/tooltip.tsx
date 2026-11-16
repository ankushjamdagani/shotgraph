import { Tooltip as Primitive } from 'radix-ui';
import type { ReactNode } from 'react';
export const TooltipProvider = Primitive.Provider;
export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild>{children}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          side={side}
          sideOffset={6}
          className="z-[110] max-w-64 rounded-md border border-subtle bg-surface px-2.5 py-1.5 text-xs text-text-primary shadow-dialog data-[state=delayed-open]:animate-enter motion-reduce:animate-none"
        >
          {label}
          <Primitive.Arrow className="fill-surface" />
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
