import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { cn } from './cn';
export const setupActionVariants = ['Quiet split', 'Stacked invitation', 'Inline journey', 'Compact dock'] as const;
export type SetupActionVariant = typeof setupActionVariants[number];
export function SetupActions({variant='Quiet split',back,blank,primary,disabled,loading,onBack,onBlank,extra}: {
  variant?: SetupActionVariant; back: boolean; blank: boolean; primary: string; disabled?: boolean; loading?: boolean;
  onBack:()=>void; onBlank:()=>void; extra?: ReactNode;
}) {
  const stacked=variant==='Stacked invitation';
  return <div className={cn('flex flex-wrap items-center gap-3 pb-6 pt-0',stacked?'flex-col items-stretch': 'justify-between',variant==='Compact dock' && 'rounded-dialog bg-surface px-3 pb-6 pt-0')}>
    <div>{back && <Button variant="quiet" disabled={loading} onClick={onBack}><ArrowLeft/>Back</Button>}</div>
    <div className={cn('flex flex-wrap items-center gap-3',stacked && 'flex-col items-stretch',variant==='Inline journey' && 'flex-1 justify-between')}>
      {extra}
      {blank && !stacked && <Button variant="quiet" disabled={loading} onClick={onBlank}>Start blank instead</Button>}
      <Button type="submit" disabled={disabled} loading={loading} size="lg">{primary}<ArrowRight/></Button>
      {blank && stacked && <Button variant="quiet" disabled={loading} onClick={onBlank}>Or start with a blank project</Button>}
    </div>
  </div>;
}
