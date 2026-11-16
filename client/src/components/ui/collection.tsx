import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from 'react';
import { cn } from './cn';
export function Thumbnail({
  compact,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex select-none items-center justify-center overflow-hidden border border-subtle bg-transparent transition-colors duration-fast motion-reduce:transition-none group-hover:bg-hover group-focus-within:bg-hover',
        compact
          ? 'h-10 w-14 shrink-0 rounded-sm'
          : 'h-thumbnail w-full rounded-thumbnail',
        className,
      )}
      {...props}
    />
  );
}
export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full border-collapse text-left text-xs', className)}
      {...props}
    />
  );
}
export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-subtle px-3 py-2 text-xs font-medium text-text-muted',
        className,
      )}
      {...props}
    />
  );
}
export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'border-b border-subtle px-3 py-2.5 align-middle',
        className,
      )}
      {...props}
    />
  );
}
export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'group transition-colors duration-fast hover:bg-row-hover focus-within:bg-row-hover motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}
