import type { CSSProperties } from 'react';

export interface ProjectBackgroundStyles {
  page: CSSProperties;
  panel: CSSProperties;
  start?: CSSProperties;
}

/** Warm Stock is the shared page and framed-panel ground in both themes. */
export function getPageBackground(): CSSProperties {
  return { background: 'var(--project-body-background)' };
}

/** Approved Living Meadow / Cobalt Signal defaults, independent of the debugger. */
export function getDefaultStartAppearance(): CSSProperties {
  return { backgroundColor: 'inherit', '--welcome-ascii-kind': '36', '--welcome-ascii-depth': .85, '--welcome-motion': 'running' } as CSSProperties;
}
