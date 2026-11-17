import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './button';
/** Approved Quiet split footer. */
export function SetupActions({back,blank,primary,disabled,loading,onBack,onBlank,extra}: {
  back: boolean; blank: boolean; primary: string; disabled?: boolean; loading?: boolean;
  onBack:()=>void; onBlank:()=>void; extra?: ReactNode;
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3 pb-6 pt-0">
    <div>{back && <Button variant="quiet" disabled={loading} onClick={onBack}><ArrowLeft/>Back</Button>}</div>
    <div className="flex flex-wrap items-center gap-3">
      {extra}
      {blank && <Button variant="quiet" disabled={loading} onClick={onBlank}>Start blank instead</Button>}
      <Button type="submit" disabled={disabled} loading={loading} size="lg">{primary}<ArrowRight/></Button>
    </div>
  </div>;
}
