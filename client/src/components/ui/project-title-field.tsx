import { Input, Label } from './input';
import { cn } from './cn';
export const projectTitleVariants = ['Above idea', 'Beside heading', 'Header title', 'Title strip'] as const;
export type ProjectTitleVariant = typeof projectTitleVariants[number];
export function ProjectTitleField({value,onChange,variant='Above idea'}:{value:string;onChange:(value:string)=>void;variant?:ProjectTitleVariant}) {
  return <div className={cn('min-w-0',variant==='Title strip' && 'flex items-center gap-4 rounded-md bg-card px-3 py-2',variant==='Beside heading' && 'sm:max-w-64')}>
    <Label htmlFor="creation-project-title" className={variant==='Header title'||variant==='Beside heading'?'sr-only':'text-xs text-text-muted'}>Project title</Label>
    <Input id="creation-project-title" variant="plain" value={value} onChange={event=>onChange(event.target.value)} maxLength={200} placeholder="Untitled project" className={cn('text-sm',variant==='Above idea' && 'text-lg')}/>
  </div>;
}
