import { SkipForward } from 'lucide-react';
import { Button } from './button';

/** An independent shortcut, outside the guided form's navigation. */
export function EmptyProjectAction({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return <div className="fixed bottom-24 right-4 z-[60] sm:right-6">
    <Button variant="secondary" borderTone="subtle" disabled={disabled} onClick={onClick} className="h-auto gap-3 rounded-thumbnail px-4 py-3 text-left shadow-md">
      <SkipForward className="size-4 shrink-0" aria-hidden />
      <span><span className="block text-xs text-text-muted">Skip setup</span><span className="block text-sm font-medium">Create empty project</span></span>
    </Button>
  </div>;
}
