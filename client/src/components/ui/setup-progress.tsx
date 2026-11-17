import { Button } from './button';
export function SetupProgress({steps,current,furthest,disabled,onSelect}:{steps:string[];current:number;furthest:number;disabled?:boolean;onSelect:(step:number)=>void}) {
  return <nav aria-label="Project setup steps" className="shrink-0 space-y-3 pb-5">
    <div className="flex items-center justify-between text-xs"><span className="font-medium">Step {current} of {steps.length} · {steps[current-1]}</span><span className="text-text-muted">{current===steps.length?'Ready to create':`Next: ${steps[current]}`}</span></div>
    <ol className="grid grid-cols-7 gap-2">{steps.map((name,index)=><li key={name}><Button variant="step" className="h-auto px-0 py-1" disabled={index+1>furthest || disabled} onClick={()=>onSelect(index+1)} aria-label={`Step ${index+1}: ${name}`} aria-current={current===index+1?'step':undefined}><span className={`h-0.5 w-full transition-colors duration-fast ${index+1<=current?'bg-text-primary':'bg-subtle'}`}/><span className="hidden text-xs sm:inline">{name}</span></Button></li>)}</ol>
  </nav>;
}
