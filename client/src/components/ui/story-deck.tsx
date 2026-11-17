import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button, IconButton } from './button';
import { Checkbox } from './switch';
import { cn } from './cn';
import { selectedCard } from './selection';
export interface StoryDirection {id:number;title:string;durationLabel:string;beats:{label:string;text:string}[];}
export function StoryDeck({directions,selected,onToggle}:{directions:StoryDirection[];selected:Set<number>;onToggle:(id:number)=>void}) {
  const [active,setActive]=useState<number | null>(null);
  const current=directions.find(item=>item.id===active) || directions.find(item=>selected.has(item.id)) || directions[0];
  if(!current) return null;
  const currentIndex=directions.indexOf(current);
  const others=directions.filter(item=>item.id!==current.id);
  const move=(delta:number)=>setActive(directions[(currentIndex+delta+directions.length)%directions.length].id);
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 text-xs"><span className="text-text-muted">Direction {currentIndex+1} of {directions.length}</span><div className="flex gap-2"><IconButton label="Previous direction" disabled={directions.length<2} onClick={()=>move(-1)}><ChevronLeft/></IconButton><IconButton label="Next direction" disabled={directions.length<2} onClick={()=>move(1)}><ChevronRight/></IconButton></div></div>
    <div className="relative isolate px-3 pb-7 pt-14 sm:px-12">
      {others.slice(0,4).map((item,index)=><button type="button" key={item.id} onClick={()=>setActive(item.id)} aria-label={`Preview ${item.title}`} className={cn('absolute top-1 h-48 w-[80%] rounded-thumbnail border border-subtle bg-surface p-3 text-left text-xs text-text-muted transition-transform duration-normal hover:-translate-y-1 focus-visible:ring-1 focus-visible:ring-focus motion-reduce:transition-none',index%2===0?'left-1 -rotate-3':'right-1 rotate-3')} style={{zIndex:-index-1,top:index*5}}><span className="block truncate font-medium">{selected.has(item.id) && '✓ '}{item.title}</span></button>)}
      <article aria-label={current.title} className={cn('relative rounded-thumbnail border border-subtle bg-surface p-5 sm:p-6',selected.has(current.id)&&selectedCard)}>
        <div className="mb-4 flex items-start justify-between gap-4"><div><h3 className="text-base font-semibold">{current.title}</h3><p className="mt-2 text-xs text-text-muted">{current.durationLabel}{currentIndex===0?' · Recommended':''}</p></div><label className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={selected.has(current.id)} onCheckedChange={()=>onToggle(current.id)}/>{selected.has(current.id)?'Selected':'Select'}</label></div>
        <dl className="space-y-4">{current.beats.map((beat,index)=><div key={index}><dt className="text-xs font-medium">{beat.label}</dt><dd className="mt-1 text-sm leading-relaxed text-text-muted">{beat.text}</dd></div>)}</dl>
      </article>
    </div>
    <div aria-label="Choose a story to preview" className="flex flex-wrap justify-center gap-2">{directions.map(item=><Button key={item.id} variant={item.id===current.id?'soft':'quiet'} size="sm" onClick={()=>setActive(item.id)}>{selected.has(item.id)&&<Check/>}{item.title}</Button>)}</div>
  </div>;
}
