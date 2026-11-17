import { Film, X } from 'lucide-react';
import { IconButton } from './button';
import { cn } from './cn';
export const setupHeaderVariants = ['brand', 'compact', 'framed'] as const;
export type SetupHeaderVariant = typeof setupHeaderVariants[number];
export function SetupHeader({ variant = 'brand', showProjectLabel = true, step, position, total = 6, disabled, onClose, className }: { variant?: SetupHeaderVariant; showProjectLabel?: boolean; step: string; position: number; total?: number; disabled?: boolean; onClose: () => void; className?: string }) {
  return <header className="shrink-0 px-4 sm:px-8"><div data-art-exclusion className={cn('mx-auto flex min-h-16 w-full items-center justify-between gap-3 px-2 sm:px-4', variant === 'framed' && 'my-3 rounded-thumbnail border border-subtle bg-card', className)}>
    <div className="flex items-center gap-3"><Film className="size-5" aria-hidden/><span className="text-sm font-semibold tracking-tight">{variant === 'compact' && showProjectLabel ? 'New project' : 'Shotgraph'}</span>{variant === 'brand' && showProjectLabel && <span className="text-xs text-text-muted">New project</span>}</div>
    <div className="flex items-center gap-2">{variant !== 'brand' && <span className="text-xs text-text-muted">{step} · {position} / {total}</span>}<IconButton label="Close create project" disabled={disabled} onClick={onClose}><X/></IconButton></div>
  </div></header>;
}
