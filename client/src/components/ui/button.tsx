import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium outline-none transition-colors duration-fast motion-reduce:transition-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-app disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--action-primary)] text-[var(--action-primary-text)] hover:opacity-80',
        secondary:
          'border border-control bg-surface text-text-primary hover:bg-hover',
        ghost: 'text-text-primary hover:bg-hover',
        soft: 'bg-card text-text-primary hover:bg-hover',
        quiet: 'text-text-muted hover:bg-hover hover:text-text-primary',
        destructive: 'bg-danger-solid text-white hover:bg-danger-hover',
      },
      size: {
        sm: 'h-control-sm px-2',
        md: 'h-control px-3',
        lg: 'h-control-lg px-4 text-sm',
        icon: 'size-control p-0',
        'icon-sm': 'size-control-sm p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  borderTone?: 'control' | 'subtle';
  loading?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      borderTone = 'control',
      size,
      asChild,
      loading,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot.Root : 'button';
    return (
      <Component
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), variant === 'secondary' && borderTone === 'subtle' && 'border-subtle', className)}
        {...props}
      >
        {loading && !asChild ? (
          <Loader2
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </Component>
    );
  },
);
Button.displayName = 'Button';
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  label: string;
  children: React.ReactNode;
}
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { label, size = 'icon', variant = 'ghost', loading, children, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      size={size}
      variant={variant}
      loading={loading}
      aria-label={label}
      {...props}
    >
      {loading ? null : children}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
