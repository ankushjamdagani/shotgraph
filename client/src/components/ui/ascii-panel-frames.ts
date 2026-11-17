/** Full-panel scenes: concentrated at the foot, sparse movement above. */
export function renderAsciiPanelFrame(kind: string, time: number, width: number, height: number): string[] {
  const grid = Array.from({ length: height }, () => Array<string>(width).fill(' '));
  const put = (x: number, y: number, glyph: string) => {
    const col = Math.round(x), row = Math.round(y);
    if (col >= 0 && col < width && row >= 0 && row < height) grid[row][col] = glyph;
  };
  if (kind === '44') {
    for (let petal = 0; petal < 140; petal++) {
      const phase = (petal * .56984 + time * .018) % 1;
      const x = ((petal * .754877) % 1) * width + Math.sin(time * .4 + petal) * 4;
      const y = height * (1 - (1 - phase) ** 2.5);
      put(x, y, Math.sin(time * .6 + petal) > .4 ? "'" : '.');
      if (phase > .75 && petal % 3 === 0) put(x + 1, y, ',');
    }
    for (let row = height - 7; row < height; row++) for (let col = 0; col < width; col++) {
      if (Math.sin(col * .7 + row) > .5) put(col, row, row % 2 === 0 ? '.' : "'");
    }
  } else if (kind === '40') {
    for (let drop = 0; drop < 150; drop++) {
      const x = ((drop * .754877) % 1) * width;
      const phase = (drop * .56984 + time * .06) % 1;
      const y = phase * height;
      put(x - phase * 2, y, y > height * .7 ? ':' : '.');
      if (drop % 3 === 0) put(x - phase * 2, y - 1, '/');
    }
    for (let ripple = 0; ripple < 22; ripple++) {
      const phase = (ripple * .618 + time * .12) % 1;
      const center = ((ripple * .754877) % 1) * width;
      const base = height * (.79 + ((ripple * .56984) % 1) * .18);
      for (let a = 0; a < Math.PI * 2; a += .15)
        put(center + Math.cos(a) * phase * 8, base + Math.sin(a) * phase * 1.8, phase < .7 ? '-' : '.');
    }
  } else if (kind === '41') {
    for (let strand = 0; strand < 18; strand++) {
      for (let col = 0; col < width; col++) {
        const x = col / width;
        const bottom = height * (.78 + strand * .015);
        const curve = Math.sin(x * 5 + time * .24 + strand * .1) * height * .06;
        const rise = Math.abs(x - .5) ** 3 * height * 1.8;
        const row = bottom + curve - rise;
        put(col, row, strand % 3 === 0 ? ':' : '.');
      }
    }
  } else if (kind === '36') {
    // A wind-swept meadow, with taller stems framing the sides.
    for (let stem = 0; stem < 95; stem++) {
      const base = ((stem * .618034) % 1) * width;
      const edge = Math.abs(base / width - .5) * 2;
      const length = height * (.07 + ((stem * .371) % 1) * .13 + edge ** 3 * .27);
      for (let step = 0; step < length; step += .55) {
        const bend = Math.sin(time * .55 + stem * .7) * step ** 1.4 * .045;
        put(base + bend, height - 1 - step, step % 6 < 1.2 ? ':' : '/');
        if (step > length * .4 && step % 5 < .6) put(base + bend + 1.5, height - step - 2, "'");
      }
      if (stem % 4 === 0) {
        const bend = Math.sin(time * .55 + stem * .7) * length ** 1.4 * .045;
        put(base + bend, height - 1 - length, '*');
      }
    }
  }
  // A handful of drifting seeds / glints gives the upper edges life.
  for (let particle = 0; particle < 24; particle++) {
    const phase = (particle * .381966 + time * .012) % 1;
    const edge = particle % 2 === 0 ? .04 : .91;
    put(width * edge + Math.sin(time * .2 + particle) * 3, height * (1 - phase), particle % 5 === 0 ? '+' : '.');
  }
  return grid.map(row => row.join(''));
}
