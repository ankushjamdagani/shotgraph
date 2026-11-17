import { ArrowUpRight, Link2, X } from 'lucide-react';
import { IconButton } from './button';
export function ReferenceLinks({ urls, onRemove }: { urls: string[]; onRemove: (url: string) => void }) {
  if (!urls.length) return null;
  return <ul aria-label="Reference links" className="flex flex-wrap gap-2">{urls.map(url => {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return null; }
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return <li key={url} className="flex min-w-0 max-w-full items-center gap-2 rounded-thumbnail border border-subtle bg-card/70 py-2 pl-3 pr-1">
      <a href={url} target="_blank" rel="noreferrer" title={url} className="flex min-w-0 items-center gap-3 rounded-sm outline-none transition-colors hover:text-text-primary focus-visible:ring-1 focus-visible:ring-focus">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-subtle text-text-muted"><Link2 className="size-4" /></span>
        <span className="min-w-0"><span className="block truncate text-xs font-medium">{host}</span><span className="block max-w-56 truncate text-[11px] text-text-muted">{path || 'Reference website'}</span></span>
        <ArrowUpRight className="size-3 shrink-0 text-text-muted" />
      </a><IconButton label={`Remove reference ${host}${path}`} onClick={() => onRemove(url)}><X /></IconButton>
    </li>;
  })}</ul>;
}
