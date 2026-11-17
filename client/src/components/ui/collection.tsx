import { ArrowUpRight, Plus } from 'lucide-react';
import { getGalleryInteraction } from './collection-hover';
import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from 'react';
import { cn } from './cn';
export function Thumbnail({
  compact,
  intent = 'open',
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean; intent?: 'open' | 'create' }) {
  return (
    <div
      className={cn(
        'relative flex select-none items-center justify-center overflow-hidden border border-subtle bg-transparent transition-colors duration-fast motion-reduce:transition-none',
        compact
          ? 'h-10 w-14 shrink-0 rounded-sm'
          : 'h-thumbnail w-full rounded-thumbnail',
        className,
      )}
      data-collection-preview
      data-create-preview={intent === 'create' || undefined}
      data-card-preview={!compact || undefined}
      {...props}
    >
      {children}
      <span aria-hidden="true" data-hover-cue className={cn('pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 text-text-primary opacity-0', compact ? 'size-6' : 'text-xs font-medium')}>
        {intent === 'create' ? <Plus className="size-3.5"/> : <ArrowUpRight className="size-3.5"/>}
        {!compact && (intent === 'create' ? 'Create project' : 'Open project')}
      </span>
    </div>
  );
}
export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full border-collapse bg-transparent text-left text-xs', className)}
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
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('group', getGalleryInteraction(), className)} {...props}/>;
}

/** Secondary action cue attached to the title, never a separate button. */
export function ProjectNameCue() {
  return <ArrowUpRight aria-hidden="true" data-name-cue className="size-3.5 shrink-0 opacity-0"/>;
}
