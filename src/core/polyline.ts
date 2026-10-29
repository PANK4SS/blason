import type { Point } from './types';

/** Lissage gaussien circulaire des coordonnées d'une boucle fermée. */
export function smoothClosed(loop: Point[], sigma: number): Point[] {
  if (sigma <= 0.05 || loop.length < 5) return loop;
  const radius = Math.max(1, Math.ceil(sigma * 2));
  const kernel: number[] = [];
  let total = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    total += v;
  }

  const n = loop.length;
  const out: Point[] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    let x = 0;
    let y = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const p = loop[(i + k + n * (radius + 1)) % n];
      const w = kernel[k + radius] / total;
      x += p.x * w;
      y += p.y * w;
    }
    out[i] = { x, y };
  }
  return out;
}

/**
 * Simplifie une boucle fermée (Ramer-Douglas-Peucker) : seuls les points qui
 * s'écartent de plus de `epsilon` de la corde sont conservés. Une ligne droite
 * se réduit à ses deux extrémités, une courbe garde ce qu'il faut de points.
 */
export function simplifyClosed(loop: Point[], epsilon: number): Point[] {
  const n = loop.length;
  if (n < 5 || epsilon <= 0) return loop;

  // Deux ancres diamétralement opposées coupent la boucle en deux chaînes
  // ouvertes, que l'algorithme classique sait traiter.
  let far = 0;
  let best = -1;
  for (let i = 1; i < n; i += 1) {
    const d = squaredDistance(loop[0], loop[i]);
    if (d > best) {
      best = d;
      far = i;
    }
  }

  const first = simplifyOpen(loop.slice(0, far + 1), epsilon);
  const second = simplifyOpen([...loop.slice(far), loop[0]], epsilon);
  const merged = [...first.slice(0, -1), ...second.slice(0, -1)];
  return merged.length >= 4 ? merged : loop;
}

/** Découpe les segments trop longs, pour borner l'écart des courbes de Bézier. */
export function subdivideClosed(loop: Point[], maxLength: number): Point[] {
  if (maxLength <= 0 || loop.length < 3) return loop;
  const out: Point[] = [];
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    out.push(a);
    const steps = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / maxLength);
    for (let k = 1; k <= steps; k += 1) {
      const t = k / (steps + 1);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** Translate puis divise les coordonnées (retour à l'échelle source). */
export function transform(loop: Point[], offsetX: number, offsetY: number, scale: number): Point[] {
  return loop.map((p) => ({ x: (p.x - offsetX) / scale, y: (p.y - offsetY) / scale }));
}

function simplifyOpen(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let worst = 0;
    let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (index >= 0 && worst > epsilon) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / length;
}

function squaredDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
