import { Input, Label } from './input';
/** Approved title placement above the idea, with its own independent value. */
export function ProjectTitleField({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  return <div className="min-w-0 space-y-2">
    <Label htmlFor="creation-project-title" className="text-xs text-text-muted">Project title</Label>
    <Input id="creation-project-title" variant="plain" value={value} onChange={event=>onChange(event.target.value)} maxLength={200} placeholder="Untitled project" className="text-lg"/>
  </div>;
}
