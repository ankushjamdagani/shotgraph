import { Button } from './button';
export function SetupProgress({steps,current,furthest,disabled,onSelect}:{steps:string[];current:number;furthest:number;disabled?:boolean;onSelect:(step:number)=>void}) {
  return <nav aria-label="Project setup steps" className="h-[92px] shrink-0 space-y-3 pb-5">
    <div className="flex items-center justify-between text-xs"><span className="font-medium">Step {current} of {steps.length} · {steps[current-1]}</span><span className="text-text-muted">{current===steps.length?'Ready to create':`Next: ${steps[current]}`}</span></div>
    <div aria-hidden className="h-1 overflow-hidden rounded-full bg-subtle"><div className="h-full bg-text-primary transition-[width] duration-normal motion-reduce:transition-none" style={{width:`${current/steps.length*100}%`}}/></div>
    <ol className="!mt-1 grid grid-cols-7 gap-2">{steps.map((name,index)=><li key={name}><Button variant="step" className="h-auto px-0 py-1" disabled={index+1>furthest || disabled} onClick={()=>onSelect(index+1)} aria-label={`Step ${index+1}: ${name}`} aria-current={current===index+1?'step':undefined}><span className="truncate text-xs">{name}</span></Button></li>)}</ol>
  </nav>;
}
