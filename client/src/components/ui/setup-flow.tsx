import type { ReactNode } from 'react';
import { cn } from './cn';

export const setupFlowVariants = ['Original', 'Aligned bands', 'Framed workspace', 'Quiet focus', 'Chapter rail', 'Split introduction', 'Split anchored', 'Split sidebar', 'Split workspace', 'Split open', 'Split compact', 'Action rail'] as const;
export type SetupFlowVariant = typeof setupFlowVariants[number];

export const isSplitSetupFlow = (variant: SetupFlowVariant) => variant.startsWith('Split ');
export const isSideSetupFlow = (variant: SetupFlowVariant) => isSplitSetupFlow(variant) || variant === 'Chapter rail' || variant === 'Action rail';

export interface SetupFlowProps {
  variant?: SetupFlowVariant;
  columnClassName?: string;
  disabled?: boolean;
  background?: ReactNode;
  header: ReactNode;
  introduction: ReactNode;
  progress: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}

/** Structural comparisons: keep one content tree and one set of actions across layouts. */
export function SetupFlow({ variant = 'Original', header, introduction, progress, actions, children, columnClassName, disabled, background }: SetupFlowProps) {
  const quiet = variant === 'Quiet focus';
  const original = variant === 'Original';
  const chapter = variant === 'Chapter rail';
  const split = isSplitSetupFlow(variant);
  const anchored = variant === 'Split anchored';
  const sidebar = variant === 'Split sidebar';
  const workspace = variant === 'Split workspace';
  const open = variant === 'Split open';
  const compact = variant === 'Split compact';
  const rail = variant === 'Action rail';
  const side = chapter || split || rail;
  return <fieldset disabled={disabled} data-flow-layout={variant} className={cn('relative isolate m-0 flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0', variant === 'Framed workspace' && 'sm:m-5 sm:rounded-dialog sm:border sm:border-subtle sm:bg-app')}>
    {!quiet && background}
    <div className={cn('shrink-0', !original && variant !== 'Quiet focus' && 'border-b border-subtle', variant === 'Quiet focus' && 'sm:mx-8')}>{header}</div>
    <div className={cn('relative isolate flex min-h-0 flex-1 flex-col', side && 'lg:grid', chapter && 'lg:grid-cols-[220px_minmax(0,1fr)]', split && 'lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,2fr)]',
      anchored && 'lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]',
      sidebar && 'lg:grid-cols-[300px_minmax(0,1fr)]',
      workspace && 'lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6 lg:p-6',
      open && 'mx-auto w-full max-w-[1440px] lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] lg:gap-12 lg:px-12 lg:py-8',
      compact && 'lg:grid-cols-[240px_minmax(0,1fr)]', rail && 'lg:grid-cols-[minmax(0,1fr)_280px]')}>
      {quiet && background}
      {chapter && <aside className="shrink-0 border-b border-subtle px-6 py-3 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">{progress}</aside>}
      {split && <aside data-setup-sidebar data-art-exclusion className={cn(
        'flex shrink-0 flex-col gap-5 border-b border-subtle px-4 py-5 sm:px-8 lg:min-h-0 lg:gap-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-12',
        anchored && 'lg:gap-16 lg:pb-20',
        sidebar && 'bg-card lg:px-6',
        workspace && 'lg:border-0 lg:px-2 lg:py-6',
        open && 'lg:border-0 lg:px-0 lg:py-6 lg:[&_h2]:text-4xl',
        compact && 'lg:px-4 lg:py-8 lg:[&_h2]:text-2xl',
      )}>{introduction}<div className={cn('shrink-0', anchored && 'lg:mt-auto', open && 'lg:mt-8')}>{progress}</div></aside>}
      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col px-2 py-3 sm:px-6 sm:py-6', original && 'justify-center', variant === 'Quiet focus' && 'sm:py-10', workspace && 'lg:rounded-dialog lg:border lg:border-subtle lg:bg-app', open && 'lg:px-0 lg:py-6')}>
        <div className={cn('mx-auto flex min-h-0 w-full flex-1 flex-col px-2 sm:px-4', original && 'sm:max-h-[840px]')}>
          {!split && <div className="shrink-0">{introduction}</div>}
          {!original && !side && <div className={cn('mx-auto w-full shrink-0 px-2 pb-4 sm:px-4', columnClassName, variant === 'Quiet focus' && 'flex justify-center')} >{progress}</div>}
          <div className="flex min-h-0 flex-1 flex-col [container-type:inline-size] [--setup-rail-width:100cqw]">{children}</div>
          {!rail && !quiet && <div className={cn('shrink-0 pt-3', !original && 'border-t border-subtle', open && 'lg:border-0', workspace && 'lg:mt-4')}>{actions}</div>}
        </div>
      </div>
      {rail && <aside className="flex shrink-0 flex-col gap-6 border-t border-subtle px-4 py-4 sm:px-8 lg:justify-between lg:border-l lg:border-t-0 lg:py-10">{progress}{actions}</aside>}
    </div>
    {quiet && <footer data-setup-footer className="shrink-0 border-t border-subtle bg-app px-4 pb-[env(safe-area-inset-bottom)] pt-1 sm:px-10">{actions}</footer>}
  </fieldset>;
}
