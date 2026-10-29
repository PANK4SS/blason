import type { BinaryMask, Box, Point } from './types';

/**
 * Extrait les contours fermés d'un masque binaire.
 *
 * Chaque pixel d'encre pose, sur les côtés qui touchent le fond, une arête
 * orientée du réseau de sommets (coins de pixels). Les arêtes se chaînent
 * ensuite en boucles : contours extérieurs dans un sens, trous dans l'autre,
 * ce qui rend les trous corrects avec `fill-rule="evenodd"`.
 */
export function traceContours(mask: BinaryMask): Point[][] {
  const { width, height, data } = mask;
  const stride = width + 1;
  /** Pour chaque sommet de départ, les sommets d'arrivée des arêtes sortantes. */
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
 * Suit les arêtes depuis `start` jusqu'au retour au point de départ, en
 * consommant chaque arête au passage. Sur un sommet en diagonale, deux arêtes
 * sortent : on privilégie le virage le plus serré, ce qui sépare proprement
 * deux formes qui ne se touchent que par un coin.
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
  // Les boucles tournent dans le sens horaire (axe y vers le bas) : le virage
  // à droite est donc le plus serré, puis tout droit, puis à gauche.
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

/** Surface algébrique d'une boucle (formule du lacet), signe selon le sens. */
export function signedArea(loop: Point[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Cadre englobant les pixels d'encre, ou null si le masque est vide. */
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
