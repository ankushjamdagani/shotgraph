import { readFileSync } from 'node:fs';
const css = readFileSync(
  new URL('../src/styles/tokens.css', import.meta.url),
  'utf8',
);
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
let failed = false;
for (const theme of ['theme-film-lab-mono', 'theme-paper-ink']) {
  const block = css.match(new RegExp(`\\.${theme} \\{([^}]+)`))[1];
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+): (#\w+);/g)].map((m) => [m[1], m[2]]),
  );
  for (const [role, threshold] of [
    ['text-primary', 4.5],
    ['text-muted', 4.5],
    ['border-focus', 3],
    ['border-control', 3],
  ]) {
    const minimum = Math.min(
      ...['bg-app', 'bg-surface', 'bg-card', 'bg-hover'].map((bg) =>
        contrast(tokens[role], tokens[bg]),
      ),
    );
    console.log(
      `${theme}: ${role} ${minimum.toFixed(2)}:1 ${minimum >= threshold ? 'PASS' : 'FAIL'}`,
    );
    if (minimum < threshold) failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
