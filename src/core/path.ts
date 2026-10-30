import type { Point } from './types';

/**
 * Converts a closed loop into cubic Bezier curves through a centripetal
 * Catmull-Rom spline: the curve passes through every original point and,
 * unlike the uniform variant, does not overshoot when the point spacing is
 * irregular (which is common after simplification).
 */
export function closedBezierPath(loop: Point[], precision = 2, alpha = 0.5): string {
  const n = loop.length;
  if (n < 4) return '';
  const r = (v: number): string => Number(v.toFixed(precision)).toString();

  let d = `M${r(loop[0].x)},${r(loop[0].y)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = loop[(i - 1 + n) % n];
    const p1 = loop[i];
    const p2 = loop[(i + 1) % n];
    const p3 = loop[(i + 2) % n];
    const [c1, c2] = controlPoints(p0, p1, p2, p3, alpha);
    d += `C${r(c1.x)},${r(c1.y)} ${r(c2.x)},${r(c2.y)} ${r(p2.x)},${r(p2.y)}`;
  }
  return `${d}Z`;
}

/** Control points of the p1-p2 segment of a non-uniform Catmull-Rom spline. */
function controlPoints(p0: Point, p1: Point, p2: Point, p3: Point, alpha: number): [Point, Point] {
  const d1 = Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y), alpha);
  const d2 = Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y), alpha);
  const d3 = Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y), alpha);

  // Degenerate spacing (coincident points): fall back to the uniform tangent,
  // which divides by no distance at all.
  const scale = d1 + d2 + d3;
  if (!(d1 > 1e-9 * scale) || !(d2 > 1e-9 * scale) || !(d3 > 1e-9 * scale)) {
    return [
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    ];
  }

  const a = d1 * d1;
  const b = d2 * d2;
  const c = d3 * d3;
  const n1 = 3 * d1 * (d1 + d2);
  const n2 = 3 * d3 * (d3 + d2);
  const w1 = 2 * a + 3 * d1 * d2 + b;
  const w2 = 2 * c + 3 * d3 * d2 + b;

  return [
    { x: (a * p2.x - b * p0.x + w1 * p1.x) / n1, y: (a * p2.y - b * p0.y + w1 * p1.y) / n1 },
    { x: (c * p1.x - b * p3.x + w2 * p2.x) / n2, y: (c * p1.y - b * p3.y + w2 * p2.y) / n2 },
  ];
}

export interface SvgDocumentInput {
  paths: string[];
  width: number;
  height: number;
  color: string;
  title?: string;
}

/** Assembles the final SVG document: a single path, no background. */
export function buildSvgDocument({ paths, width, height, color, title }: SvgDocumentInput): string {
  const w = Number(width.toFixed(2));
  const h = Number(height.toFixed(2));
  const titleTag = title ? `<title>${escapeXml(title)}</title>` : '';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    titleTag,
    `<path fill="${color}" fill-rule="evenodd" d="${paths.join('')}"/>`,
    '</svg>',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
