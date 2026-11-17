import { type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { cn } from './cn';
export const setupActionsVariants = ['split', 'stacked', 'toolbar', 'minimal'] as const;
export type SetupActionsVariant = typeof setupActionsVariants[number];
export function SetupActions({back,primary,disabled,loading,onBack,extra,middle,vertical,variant='split'}: {
  back: boolean; primary: string; disabled?: boolean; loading?: boolean;
  onBack:()=>void; extra?: ReactNode; middle?: ReactNode; variant?:SetupActionsVariant; vertical?:boolean;
}) {
  return <><div className={cn('flex flex-wrap items-center gap-3 pb-4', variant === 'stacked' ? 'justify-center border-t border-subtle pt-3' : 'justify-between', variant === 'toolbar' && 'rounded-thumbnail border border-subtle bg-card/70 p-3', variant === 'minimal' && 'border-t border-subtle pt-3', vertical && 'lg:flex-col lg:items-stretch')}>
    {middle && variant === 'stacked' && <div className="flex w-full justify-center">{middle}</div>}
    <div className="flex items-center gap-1">{back && <Button variant="quiet" disabled={loading} onClick={onBack}><ArrowLeft/>Back</Button>}</div>
    {middle && variant !== 'stacked' && <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">{middle}</div>}
    <div className={cn('ml-auto flex items-center gap-2', vertical && 'lg:ml-0 lg:flex-col lg:items-stretch lg:[&>button]:h-auto lg:[&>button]:min-h-10 lg:[&>button]:whitespace-normal')}>{extra}<Button type="submit" disabled={disabled} loading={loading} size="lg">{primary}<ArrowRight/></Button></div>
  </div></>;
}
