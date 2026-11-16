import * as React from 'react';
import { AlertDialog as Primitive } from 'radix-ui';
import { cn } from './cn';
import { buttonVariants } from './button';
export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-enter motion-reduce:animate-none" />
      <Primitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100%-40px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-dialog bg-surface text-text-primary shadow-dialog outline-none',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn(
        'break-words text-xl font-semibold leading-snug tracking-tight',
        className,
      )}
      {...props}
    />
  );
}
export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn('mt-3 text-sm leading-relaxed text-text-muted', className)}
      {...props}
    />
  );
}
export function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex justify-end gap-2.5 bg-card px-7 py-4', className)}
      {...props}
    />
  );
}
export const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Primitive.Cancel>
>(({ className, ...props }, ref) => (
  <Primitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: 'secondary' }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';
export const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Primitive.Action>
>(({ className, ...props }, ref) => (
  <Primitive.Action
    ref={ref}
    className={cn(buttonVariants({ variant: 'destructive' }), className)}
    {...props}
  />
));
AlertDialogAction.displayName = 'AlertDialogAction';
