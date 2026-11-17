import { Button } from './button';
import { Check } from 'lucide-react';
import { cn } from './cn';
export const progressVariants=['Named track','Numbered stops','Compact chapters','Progress ribbon'] as const;
export type ProgressVariant=typeof progressVariants[number];
export function SetupProgress({steps,current,furthest,disabled,onSelect,variant='Named track'}:{steps:string[];current:number;furthest:number;disabled?:boolean;onSelect:(step:number)=>void;variant?:ProgressVariant}) {
  return <nav aria-label="Project setup steps" className="h-[92px] shrink-0 space-y-3 pb-5">
    <div className="flex items-center justify-between text-xs"><span className="font-medium">Step {current} of {steps.length} · {steps[current-1]}</span><span className="text-text-muted">{current===steps.length?'Ready to create':`Next: ${steps[current]}`}</span></div>
    {variant==='Progress ribbon' && <div aria-hidden className="h-1 overflow-hidden rounded-full bg-subtle"><div className="h-full bg-text-primary transition-[width] duration-normal motion-reduce:transition-none" style={{width:`${current/steps.length*100}%`}}/></div>}
    <ol className={cn('grid grid-cols-7 gap-2',variant==='Compact chapters'&&'rounded-md bg-card p-1',variant==='Progress ribbon'&&'!mt-1')}>{steps.map((name,index)=><li key={name}><Button variant="step" className={cn('h-auto px-0 py-1',variant==='Compact chapters'&&'items-center rounded-md px-1 aria-[current=step]:bg-surface',variant==='Numbered stops'&&'flex-row items-center gap-2')} disabled={index+1>furthest || disabled} onClick={()=>onSelect(index+1)} aria-label={`Step ${index+1}: ${name}`} aria-current={current===index+1?'step':undefined}>
      {variant==='Named track' && <span className={`h-0.5 w-full transition-colors duration-fast ${index+1<=current?'bg-text-primary':'bg-subtle'}`}/>}
      {variant==='Numbered stops' && <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border border-subtle text-xs',index+1<=current&&'border-text-primary bg-text-primary text-app')}>{index+1<current?<Check className="size-3"/>:index+1}</span>}
      <span className={cn('text-xs',variant==='Named track'||variant==='Numbered stops'?'hidden sm:inline':'truncate')}>{name}</span>
    </Button></li>)}</ol>
  </nav>;
}
