import { RadioGroup } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from './cn';
import { selectedCardData } from './selection';
export const visualListVariants=['Landscape cards','Compact tiles','Filmstrip','Split cards'] as const;
export type VisualListVariant=typeof visualListVariants[number];
export interface VisualChoice {value:string;label:string;description:string;image:string;grade?:string;detail?:string;}
export function VisualChoiceList({label,value,onChange,options,variant='Landscape cards'}:{label:string;value:string;onChange:(value:string)=>void;options:VisualChoice[];variant?:VisualListVariant}) {
  const split=variant==='Split cards', compact=variant==='Compact tiles', film=variant==='Filmstrip';
  return <div className="space-y-2"><RadioGroup.Root orientation="horizontal" aria-label={label} value={value} onValueChange={onChange} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-1 pb-4 pt-1">
    {options.map(option=><RadioGroup.Item key={option.value} value={option.value} className={cn('relative shrink-0 snap-start overflow-hidden rounded-thumbnail border border-subtle bg-transparent text-left outline-none transition-colors duration-fast focus-visible:ring-1 focus-visible:ring-focus',selectedCardData,split?'flex w-[min(420px,85vw)]':compact?'w-48':film?'w-64':'w-[min(300px,78vw)]')}>
      <div className={cn('relative overflow-hidden',split?'w-36 shrink-0 self-stretch':'aspect-video')}><img src={option.image} alt="" className={cn('size-full object-cover',option.grade)} loading="lazy"/>{!split && <RadioGroup.Indicator className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-text-primary text-app"><Check className="size-4"/></RadioGroup.Indicator>}</div>
      <div className={cn('space-y-2 p-4',film&&'px-3 py-3',compact&&'p-3')}><span className="flex items-center gap-2 text-sm font-semibold">{option.label}{split && <RadioGroup.Indicator><Check className="size-4"/></RadioGroup.Indicator>}</span>{option.detail&&<span className="block text-xs text-text-muted">{option.detail}</span>}{!film && <span className="block text-xs leading-relaxed text-text-muted">{option.description}</span>}</div>
    </RadioGroup.Item>)}
  </RadioGroup.Root><p className="text-xs text-text-muted">Scroll to explore · use arrow keys to choose</p></div>;
}
