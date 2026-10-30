import type { BinaryMask, Box, Point } from './types';

/**
 * Extracts the closed contours of a binary mask.
 *
 * On every side that touches the background, an ink pixel lays down a directed
 * edge of the vertex lattice (the pixel corners). The edges then chain into
 * loops: outer contours wind one way, holes the other, which makes the holes
 * come out right under `fill-rule="evenodd"`.
 */
export function traceContours(mask: BinaryMask): Point[][] {
  const { width, height, data } = mask;
  const stride = width + 1;
  /** For each start vertex, the end vertices of its outgoing edges. */
  const edges = new Map<number, number[]>();

  const addEdge = (ax: number, ay: number, bx: number, by: number): void => {
    const from = ay * stride + ax;
    const to = by * stride + bx;
    const list = edges.get(from);
    if (list) list.push(to);
    else edges.set(from, [to]);
  };

  const isInk = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && data[y * width + x] === 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isInk(x, y)) continue;
      if (!isInk(x, y - 1)) addEdge(x, y, x + 1, y);
      if (!isInk(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
      if (!isInk(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
      if (!isInk(x - 1, y)) addEdge(x, y + 1, x, y);
    }
  }

  const loops: Point[][] = [];
  for (const start of edges.keys()) {
    while ((edges.get(start)?.length ?? 0) > 0) {
      const loop = walkLoop(edges, start, stride);
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

/**
 * Walks the edges from `start` until it returns to the starting point,
 * consuming each edge on the way. Two edges leave a diagonal vertex: the
 * tightest turn wins, which cleanly separates two shapes that only meet at a
 * corner.
 */
function walkLoop(edges: Map<number, number[]>, start: number, stride: number): Point[] {
  const loop: Point[] = [];
  let current = start;
  let direction: Point | null = null;

  for (let guard = 0; guard < 1e7; guard += 1) {
    const outgoing = edges.get(current);
    if (!outgoing || outgoing.length === 0) break;

    const index: number = outgoing.length === 1 ? 0 : pickTightestTurn(outgoing, current, direction, stride);
    const next: number = outgoing[index];
    outgoing.splice(index, 1);
    if (outgoing.length === 0) edges.delete(current);

    loop.push({ x: current % stride, y: Math.floor(current / stride) });
    direction = {
      x: (next % stride) - (current % stride),
      y: Math.floor(next / stride) - Math.floor(current / stride),
    };
    current = next;
    if (current === start) break;
  }
  return loop;
}

function pickTightestTurn(
  outgoing: number[],
  current: number,
  direction: Point | null,
  stride: number,
): number {
  if (!direction) return 0;
  // Loops wind clockwise (y axis pointing down), so the tightest turn is the
  // one to the right, then straight ahead, then left.
  const preference = [
    { x: -direction.y, y: direction.x },
    { x: direction.x, y: direction.y },
    { x: direction.y, y: -direction.x },
  ];
  for (const want of preference) {
    for (let i = 0; i < outgoing.length; i += 1) {
      const dx = (outgoing[i] % stride) - (current % stride);
      const dy = Math.floor(outgoing[i] / stride) - Math.floor(current / stride);
      if (dx === want.x && dy === want.y) return i;
    }
  }
  return 0;
}

/** Signed area of a loop (shoelace formula); the sign follows the winding. */
export function signedArea(loop: Point[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Bounding box of the ink pixels, or null if the mask is empty. */
export function inkBounds(mask: BinaryMask): Box | null {
  const { width, height, data } = mask;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[y * width + x] !== 1) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
