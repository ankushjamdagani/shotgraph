import * as React from 'react';
import { Dialog as Primitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './button';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-enter motion-reduce:animate-none" />
      <Primitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-40px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-dialog bg-surface p-7 text-text-primary shadow-dialog outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close asChild>
          <IconButton label="Close dialog" className="absolute right-3 top-3">
            <X />
          </IconButton>
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn('pr-8 text-xl font-semibold tracking-tight', className)}
      {...props}
    />
  );
}
export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn('mt-2 text-sm leading-relaxed text-text-muted', className)}
      {...props}
    />
  );
}
