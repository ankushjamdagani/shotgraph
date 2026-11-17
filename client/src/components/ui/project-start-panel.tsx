import { getDefaultStartAppearance } from './page-background';
import { AsciiArt } from './ascii-art';
import type { CSSProperties, ReactNode } from 'react';
import { Film, Plus, FolderOpen } from 'lucide-react';
import { Button } from './button';

/** Broad introductory half of the Projects split composition. */
export function ProjectStartPanel({ onCreate, onOpenFolder, opening, theme, style }: {
  onCreate: () => void;
  onOpenFolder: () => void;
  opening?: boolean;
  theme?: ReactNode;
  style?: CSSProperties;
}) {
  const appearance = style ?? getDefaultStartAppearance();
  return <section style={appearance} aria-label="Start a project" className="relative isolate overflow-hidden m-5 mr-0 hidden min-w-0 basis-[36%] shrink-0 flex-col rounded-dialog border border-subtle bg-transparent px-8 py-7 lg:flex xl:px-10">
    <AsciiArt appearance={appearance} />
    <div data-art-exclusion className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Film className="size-6" aria-hidden />
        <span className="text-lg font-semibold tracking-tight">Shotgraph</span>
      </div>
      {theme}
    </div>
    <div className="flex flex-1 flex-col justify-center pb-28 pt-10">
      <div data-art-exclusion>
      <h2 className="max-w-md text-3xl font-medium leading-tight tracking-tight xl:text-4xl 2xl:text-5xl">From idea<br/>to final cut.</h2>
      <p className="mt-4 max-w-xs text-sm leading-6 text-text-muted">Start a new project or pick up where you left off.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="md" onClick={onCreate}><Plus/>New Project</Button>
        <Button size="md" variant="ghost" loading={opening} onClick={onOpenFolder}><FolderOpen/>Open Folder</Button>
      </div>
      </div>
    </div>
  </section>;
}
