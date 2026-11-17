import { useState, type ReactNode } from 'react';
import { DropdownMenu, AlertDialog } from 'radix-ui';
import { ArrowLeft, ArrowRight, MoreHorizontal, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { cn } from './cn';
export const setupActionsVariants = ['split', 'stacked', 'toolbar', 'minimal'] as const;
export type SetupActionsVariant = typeof setupActionsVariants[number];
export function SetupActions({back,blank,primary,disabled,loading,onBack,onBlank,extra,middle,onReset,variant='split'}: {
  back: boolean; blank: boolean; primary: string; disabled?: boolean; loading?: boolean;
  onBack:()=>void; onBlank:()=>void; extra?: ReactNode; middle?: ReactNode; onReset?:()=>void; variant?:SetupActionsVariant;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const options = <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant="quiet" disabled={loading} aria-label="More setup actions"><MoreHorizontal /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content side="top" align="end" sideOffset={8} className="z-[80] min-w-44 rounded-md border border-subtle bg-card p-1 text-sm text-text-primary shadow-lg">
    {blank && <DropdownMenu.Item className="cursor-pointer rounded px-3 py-2 outline-none focus:bg-surface" onSelect={onBlank}>Start blank instead</DropdownMenu.Item>}
    {onReset && <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 outline-none focus:bg-surface" onSelect={()=>setConfirmReset(true)}><RotateCcw className="size-3"/>Reset setup</DropdownMenu.Item>}
  </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
  return <><div className={cn('flex flex-wrap items-center gap-3 pb-4', variant === 'stacked' ? 'justify-center border-t border-subtle pt-3' : 'justify-between', variant === 'toolbar' && 'rounded-thumbnail border border-subtle bg-card/70 p-3', variant === 'minimal' && 'border-t border-subtle pt-3')}>
    {variant === 'stacked' && <div className="flex w-full justify-center">{middle}</div>}
    <div className="flex items-center gap-1">{back && <Button variant="quiet" disabled={loading} onClick={onBack}><ArrowLeft/>Back</Button>}{variant !== 'minimal' && options}</div>
    {variant !== 'stacked' && <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">{middle}</div>}
    <div className="ml-auto flex items-center gap-2">{extra}{variant === 'minimal' && options}<Button type="submit" disabled={disabled} loading={loading} size="lg">{primary}<ArrowRight/></Button></div>
  </div><AlertDialog.Root open={confirmReset} onOpenChange={setConfirmReset}><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-[80] bg-app/85 backdrop-blur-sm"/><AlertDialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[min(400px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-dialog border border-subtle bg-card p-6 text-text-primary shadow-lg"><AlertDialog.Title className="text-lg font-semibold">Reset this setup?</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm text-text-muted">Your idea, directions and preferences will be cleared.</AlertDialog.Description><div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="quiet">Cancel</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button onClick={onReset}>Reset setup</Button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root></>;
}
