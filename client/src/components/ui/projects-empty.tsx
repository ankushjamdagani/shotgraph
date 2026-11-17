import { FolderOpen, Plus } from 'lucide-react';
import { Button } from './button';
import { cn } from './cn';
export const projectsEmptyVariants = ['invitation', 'workspace', 'minimal'] as const;
export type ProjectsEmptyVariant = typeof projectsEmptyVariants[number];
export function ProjectsEmpty({ variant = 'invitation', onCreate, onOpen }: { variant?: ProjectsEmptyVariant; onCreate: () => void; onOpen: () => void }) {
  return <section aria-label="No projects yet" className={cn('flex min-h-72 flex-col justify-center gap-4 p-6 sm:p-10', variant === 'workspace' ? 'rounded-thumbnail border border-dashed border-subtle' : '', variant !== 'minimal' && 'items-center text-center')}>
    {variant !== 'minimal' && <FolderOpen className="size-8 text-text-muted" aria-hidden/>}
    <h2 className={cn('font-semibold tracking-tight', variant === 'invitation' ? 'text-2xl' : 'text-lg')}>{variant === 'workspace' ? 'Make room for your next film.' : variant === 'minimal' ? 'No projects yet.' : 'Your first film starts here.'}</h2>
    <p className="max-w-sm text-sm leading-relaxed text-text-muted">Create a project from an idea, or open an existing project folder.</p>
    <div className="flex flex-wrap items-center gap-2"><Button onClick={onCreate}><Plus/>New project</Button><Button variant="quiet" onClick={onOpen}>Open folder</Button></div>
  </section>;
}
