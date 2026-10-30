/**
 * Re-rasterizes an SVG produced by the core (only M/C/Z) to objectively
 * measure how faithful it is to the original image.
 */

export function parsePaths(svg) {
  const d = svg.match(/ d="([^"]*)"/)?.[1] ?? '';
  const loops = [];
  let current = null;
  let cursor = { x: 0, y: 0 };

  const tokens = d.match(/[MCZ][^MCZ]*/g) ?? [];
  for (const token of tokens) {
    const command = token[0];
    const numbers = (token.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (command === 'M') {
      current = [];
      loops.push(current);
      cursor = { x: numbers[0], y: numbers[1] };
      current.push(cursor);
    } else if (command === 'C') {
      for (let i = 0; i + 5 < numbers.length; i += 6) {
        const c1 = { x: numbers[i], y: numbers[i + 1] };
        const c2 = { x: numbers[i + 2], y: numbers[i + 3] };
        const end = { x: numbers[i + 4], y: numbers[i + 5] };
        for (let s = 1; s <= 8; s += 1) current.push(cubicAt(cursor, c1, c2, end, s / 8));
        cursor = end;
      }
    }
  }
  return loops;
}

/** Fills the loops under the evenodd rule, into a width x height mask. */
export function fillLoops(loops, width, height) {
  const mask = new Uint8Array(width * height);
  const edges = [];
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i += 1) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      if (a.y !== b.y) edges.push([a, b]);
    }
  }

  for (let y = 0; y < height; y += 1) {
    const scan = y + 0.5;
    const crossings = [];
    for (const [a, b] of edges) {
      const [low, high] = a.y < b.y ? [a, b] : [b, a];
      if (scan < low.y || scan >= high.y) continue;
      crossings.push(low.x + ((scan - low.y) / (high.y - low.y)) * (high.x - low.x));
    }
    crossings.sort((p, q) => p - q);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.ceil(crossings[i] - 0.5));
      const to = Math.min(width - 1, Math.floor(crossings[i + 1] - 0.5));
      for (let x = from; x <= to; x += 1) mask[y * width + x] = 1;
    }
  }
  return mask;
}

/** Reference ink mask, computed directly on the source image. */
export function inkMask(image, threshold) {
  const mask = new Uint8Array(image.width * image.height);
  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    const alpha = image.data[p + 3] / 255;
    const ink = (255 - Math.min(image.data[p], image.data[p + 1], image.data[p + 2])) * alpha;
    mask[i] = ink > threshold ? 1 : 0;
  }
  return mask;
}

/** Intersection over union: 1 means a perfect cutout. */
export function intersectionOverUnion(a, b) {
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === 1 && b[i] === 1) intersection += 1;
    if (a[i] === 1 || b[i] === 1) union += 1;
  }
  return union === 0 ? 1 : intersection / union;
}

function cubicAt(p0, c1, c2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}
