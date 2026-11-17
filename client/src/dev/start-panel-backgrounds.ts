import type { CSSProperties } from 'react';

/** Development comparisons only; approved defaults stay in semantic tokens. */
export const startPanelBackgrounds = [
  'Approved · Plain',
  '04 · Opposite corners',
  '05 · Soft diagonal',
  '10 · Offset arcs',
  '36 · ASCII living meadow',
  '40 · ASCII rain garden',
  '41 · ASCII flowing contours',
  '44 · ASCII drifting petals',
] as const;

export function getStartPanelBackground(name: string, depth = 34, motion = true): CSSProperties {
  const base = 'var(--bg-surface)';
  const tint = (color: string) =>
    `color-mix(in srgb, ${base}, ${color} ${depth}%)`;
  if (name === '04 · Opposite corners') return {
    background: `radial-gradient(at 0% 0%, ${tint('#e5b48e')}, transparent 60%), radial-gradient(at 100% 100%, ${tint('#94adcf')}, transparent 60%), ${base}`,
  };
  if (name === '05 · Soft diagonal') return {
    background: `linear-gradient(145deg, ${base} 30%, ${tint('#b5b0a5')} 50%, ${base} 72%)`,
  };
  // Crisp, static vector patterns: no gradient fills, blur, or raster texture.
  const pattern = (body: string, width: number, height: number, repeat = true): CSSProperties => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="none" stroke="#888888" stroke-width="1" opacity="${Math.min(depth / 50, .48)}">${body}</g></svg>`;
    return {
      backgroundColor: base,
      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      backgroundSize: repeat ? `${width}px ${height}px` : '100% 100%',
      backgroundRepeat: repeat ? 'repeat' : 'no-repeat',
    };
  };
  if (name.includes('ASCII')) return {
    backgroundColor: base,
    '--welcome-ascii-kind': name.slice(0, 2),
    '--welcome-ascii-depth': Math.min(depth / 40, 1),
    '--welcome-motion': motion ? 'running' : 'paused',
  } as CSSProperties;
  switch (name) {
    case '10 · Offset arcs':
      return pattern('<path d="M400 390a210 210 0 0 0-210 210M400 426a174 174 0 0 0-174 174M400 462a138 138 0 0 0-138 138"/>', 400, 600, false);
    default:
      return {};
  }
}
