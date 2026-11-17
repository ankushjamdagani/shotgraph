import { Input, Label } from './input';
/** Editable project title in Review, independent of the idea and selected story. */
export function ProjectTitleField({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  return <div className="min-w-0 space-y-2">
    <Label htmlFor="creation-project-title" className="text-xs text-text-muted">Project title</Label>
    <Input id="creation-project-title" variant="plain" value={value} onChange={event=>onChange(event.target.value)} maxLength={200} placeholder="Untitled project" className="text-lg"/>
  </div>;
}
