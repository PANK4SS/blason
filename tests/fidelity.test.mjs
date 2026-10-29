import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vectorize } from '../dist-test/core.mjs';
import { fillDisc, fillRect, whiteCanvas } from './helpers/raster.mjs';
import { fillLoops, inkMask, intersectionOverUnion, parsePaths } from './helpers/rasterize.mjs';

const INK = [200, 40, 60];
const THRESHOLD = 40;

/**
 * Vectorise, re-rasterise le SVG obtenu puis compare au masque d'origine.
 * C'est la seule mesure qui prouve que le tracé épouse vraiment la forme.
 */
function fidelity(image, options = {}) {
  const result = vectorize(image, { threshold: THRESHOLD, padding: 0, ...options });
  const loops = parsePaths(result.svg);
  const offset = { x: result.bounds.x, y: result.bounds.y };
  const placed = loops.map((loop) => loop.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })));
  const rendered = fillLoops(placed, image.width, image.height);
  const score = intersectionOverUnion(rendered, inkMask(image, THRESHOLD));
  if (process.env.SHOW_FIDELITY) console.log('  fidélité', score.toFixed(4));
  return score;
}

test('un carré est reproduit au pixel près', () => {
  const image = fillRect(whiteCanvas(240, 240), 70, 50, 100, 120, INK);
  const score = fidelity(image);
  assert.ok(score > 0.985, `fidélité ${score.toFixed(4)}`);
});

test('un disque est reproduit fidèlement', () => {
  const image = fillDisc(whiteCanvas(240, 240), 120, 120, 80, INK);
  const score = fidelity(image);
  assert.ok(score > 0.99, `fidélité ${score.toFixed(4)}`);
});

test('un anneau garde son trou au bon endroit', () => {
  const image = whiteCanvas(260, 260);
  fillDisc(image, 130, 130, 95, INK);
  fillDisc(image, 130, 130, 50, [255, 255, 255]);
  const score = fidelity(image);
  assert.ok(score > 0.985, `fidélité ${score.toFixed(4)}`);
});

test('une forme fine et anguleuse reste reconnaissable', () => {
  const image = whiteCanvas(240, 240);
  fillRect(image, 40, 110, 160, 16, INK);
  fillRect(image, 112, 40, 16, 160, INK);
  const score = fidelity(image);
  assert.ok(score > 0.98, `fidélité ${score.toFixed(4)}`);
});
