import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { cn } from './cn';
export const setupActionVariants = ['Quiet split', 'Stacked invitation', 'Inline journey', 'Compact dock', 'Balanced row', 'Centered continue', 'Wide continue', 'Outline continue'] as const;
export type SetupActionVariant = typeof setupActionVariants[number];
export function SetupActions({variant='Quiet split',back,blank,primary,disabled,loading,onBack,onBlank,extra}: {
  variant?: SetupActionVariant; back: boolean; blank: boolean; primary: string; disabled?: boolean; loading?: boolean;
  onBack:()=>void; onBlank:()=>void; extra?: ReactNode;
}) {
  const stacked=variant==='Stacked invitation'||variant==='Wide continue';
  const balanced=variant==='Balanced row';
  const centered=variant==='Centered continue';
  if(centered) return <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-6">
    <div>{back && <Button variant="quiet" disabled={loading} onClick={onBack}><ArrowLeft/>Back</Button>}</div>
    <div className="flex flex-col gap-2">{extra}<Button type="submit" disabled={disabled} loading={loading} size="lg">{primary}<ArrowRight/></Button></div>
    <div className="flex justify-end">{blank && <Button variant="quiet" disabled={loading} onClick={onBlank} className="whitespace-normal">Start blank instead</Button>}</div>
  </div>;
  return <div className={cn('flex flex-wrap items-center gap-3 pb-6 pt-0',stacked?'flex-col items-stretch': 'justify-between',centered && 'relative justify-center',balanced && 'sm:grid sm:grid-cols-[1fr_auto_1fr]',variant==='Compact dock' && 'rounded-dialog bg-surface px-3 pb-6 pt-0')}>
    <div className={cn(centered && 'mr-auto')}>{back && <Button variant="quiet" disabled={loading} onClick={onBack}><ArrowLeft/>Back</Button>}</div>
    <div className={cn('flex flex-wrap items-center gap-3',stacked && 'flex-col items-stretch',variant==='Inline journey' && 'flex-1 justify-between',balanced && 'sm:col-span-2 sm:justify-between',centered && 'mr-auto')}>
      {extra}
      {blank && !stacked && <Button variant="quiet" disabled={loading} onClick={onBlank}>Start blank instead</Button>}
      <Button variant={variant==='Outline continue'?'secondary':'primary'} borderTone="subtle" type="submit" disabled={disabled} loading={loading} size="lg">{primary}<ArrowRight/></Button>
      {blank && stacked && <Button variant="quiet" disabled={loading} onClick={onBlank}>Or start with a blank project</Button>}
    </div>
  </div>;
}
