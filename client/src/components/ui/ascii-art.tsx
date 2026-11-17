import { renderAsciiPanelFrame } from './ascii-panel-frames';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
type AsciiStyle = CSSProperties & {
  '--welcome-ascii-kind'?: string;
  '--welcome-ascii-depth'?: number;
  '--welcome-motion'?: string;
  '--welcome-color-speed'?: number;
};

/** Frame-by-frame ASCII video; no movement of the artwork container. */
export function AsciiArt({ appearance, exclusionStyle = 'hard' }: { appearance?: CSSProperties; exclusionStyle?: 'hard' | 'soft' }) {
  const style = appearance as AsciiStyle | undefined;
  const kind = style?.['--welcome-ascii-kind'];
  const gradientId = useId();
  const softExclusions = exclusionStyle === 'soft';
  const maskId = gradientId + '-mask';
  const blurId = gradientId + '-blur';
  const animated = style?.['--welcome-motion'] === 'running';
  const layer = useRef<SVGSVGElement>(null);
  const [bounds, setBounds] = useState({ width: 400, height: 600, exclusions: [] as {x:number;y:number;width:number;height:number}[] });
  useLayoutEffect(() => {
    const panel = layer.current?.parentElement;
    if (!panel) return;
    const measure = () => {
      const rect = panel.getBoundingClientRect();
      const exclusions = Array.from(panel.querySelectorAll('[data-art-exclusion]')).map(element => {
        const box = element.getBoundingClientRect();
        return { x: box.left - rect.left - 20, y: box.top - rect.top - 20, width: box.width + 40, height: box.height + 40 };
      });
      setBounds({ width: rect.width, height: rect.height, exclusions });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    const observeContent = () => {
      panel.querySelectorAll('[data-art-exclusion]').forEach(element => observer.observe(element));
      measure();
    };
    observeContent();
    const mutations = new MutationObserver(records => {
      if (records.some(record => !layer.current?.contains(record.target))) observeContent();
    });
    mutations.observe(panel, {childList:true, subtree:true});
    panel.addEventListener('scroll', measure, true);
    measure();
    return () => { observer.disconnect(); mutations.disconnect(); panel.removeEventListener('scroll', measure, true); };
  }, [kind]);
  const [time, setTime] = useState(0);
  useEffect(() => {
    setTime(0);
    if (!kind || !animated) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let request = 0, last = 0, elapsed = 0;
    const tick = (now: number) => {
      if (!document.hidden && !reduced.matches && now - last >= 1000 / 12) {
        elapsed += Math.min((now - last) / 1000, .1);
        setTime(elapsed);
        last = now;
      } else if (document.hidden || reduced.matches) last = now;
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [kind, animated]);
  if (!kind) return null;
  const columns = Math.max(40, Math.floor(bounds.width / 7));
  const rowCount = Math.max(30, Math.floor(bounds.height / 11));
  const cellWidth = bounds.width / columns, cellHeight = bounds.height / rowCount;
  const source = renderAsciiPanelFrame(kind, time, columns, rowCount);
  const rows = Array.from({length:rowCount}, (_, rowIndex) => Array.from({length:columns}, (_, col) => {
    const excluded = bounds.exclusions.some(box =>
      col * cellWidth + cellWidth > box.x && col * cellWidth < box.x + box.width &&
      rowIndex * cellHeight + cellHeight > box.y && rowIndex * cellHeight < box.y + box.height);
    return excluded && !softExclusions ? ' ' : source[rowIndex]?.[col] ?? ' ';
  }).join(''));
  const phase = Math.sin(time * (style?.['--welcome-color-speed'] ?? 3) / 20) * 36;
  const color = (offset:number) => 'hsl(calc(var(--collection-art-hue,215) + ' + (phase+offset).toFixed(2) + ') 76% var(--collection-art-lightness,46%))';
  return <svg ref={layer} aria-hidden="true" data-ascii-layer data-placement="panel" data-frame={time.toFixed(2)} viewBox={`0 0 ${bounds.width} ${bounds.height}`} className="pointer-events-none absolute inset-0 -z-10 size-full font-mono text-[7.5px]" style={{ opacity: style?.['--welcome-ascii-depth'] ?? .85, fontSize: cellWidth / .6 }}>
    <defs>
      {softExclusions && <>
        <filter id={blurId} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="28"/></filter>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={bounds.width} height={bounds.height}>
          <rect width={bounds.width} height={bounds.height} fill="white"/>
          {bounds.exclusions.map((box,index)=><rect key={index} x={box.x-12} y={box.y-12} width={box.width+24} height={box.height+24} rx="48" fill="black" filter={`url(#${blurId})`}/>)}
        </mask>
      </>}
      <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style={{stopColor:color(0)}}/>
      <stop offset="50%" style={{stopColor:color(35)}}/>
      <stop offset="100%" style={{stopColor:color(70)}}/>
    </linearGradient></defs>
    <text mask={softExclusions ? `url(#${maskId})` : undefined} fill={'url(#'+gradientId+')'} xmlSpace="preserve" className="whitespace-pre">{rows.map((row, index) => <tspan key={index} textLength={bounds.width} lengthAdjust="spacingAndGlyphs" x={0} y={(index + .8) * cellHeight}>{row}</tspan>)}</text>
  </svg>;
}
