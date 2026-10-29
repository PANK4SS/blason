import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vectorize } from '../dist-test/core.mjs';
import { countSubpaths, fillDisc, fillRect, whiteCanvas } from './helpers/raster.mjs';

const RED = [220, 30, 40];

test('un carré plein donne un seul tracé fermé', () => {
  const image = fillRect(whiteCanvas(200, 200), 60, 60, 80, 80, RED);
  const result = vectorize(image);

  assert.equal(result.pathCount, 1);
  assert.equal(countSubpaths(result.svg), 1);
  assert.match(result.svg, /<svg[^>]+viewBox="0 0 9[5-7](\.\d+)? 9[5-7](\.\d+)?"/);
  assert.ok(result.pointCount < 40, `${result.pointCount} points pour un carré, c'est trop`);
  assert.match(result.svg, /fill-rule="evenodd"/);
  assert.ok(!/<rect/.test(result.svg), 'aucun fond ne doit être écrit dans le SVG');
});

test('un anneau produit un contour et son trou', () => {
  const image = whiteCanvas(220, 220);
  fillDisc(image, 110, 110, 70, RED);
  fillDisc(image, 110, 110, 35, [255, 255, 255]);
  const result = vectorize(image);

  assert.equal(result.pathCount, 2, 'contour extérieur + trou intérieur');
});

test('deux formes distinctes restent deux tracés', () => {
  const image = whiteCanvas(300, 160);
  fillRect(image, 30, 40, 60, 60, RED);
  fillRect(image, 200, 40, 60, 60, RED);
  const result = vectorize(image);

  assert.equal(result.pathCount, 2);
});

test('la couleur dominante est détectée, et peut être imposée', () => {
  const image = fillRect(whiteCanvas(120, 120), 30, 30, 60, 60, RED);

  assert.equal(vectorize(image).color, '#DC1E28');
  assert.equal(vectorize(image, { color: '#0A84FF' }).color, '#0A84FF');
});

test('les poussières sous la surface minimale sont ignorées', () => {
  const image = whiteCanvas(200, 200);
  fillRect(image, 60, 60, 80, 80, RED);
  fillRect(image, 10, 10, 2, 2, RED);
  const result = vectorize(image, { minArea: 40 });

  assert.equal(result.pathCount, 1);
});

test('une image entièrement blanche signale qu’il n’y a rien à vectoriser', () => {
  const result = vectorize(whiteCanvas(80, 80));

  assert.equal(result.pathCount, 0);
  assert.ok(result.diagnostics.some((d) => d.code === 'nothing-detected'));
});

test('un fond non blanc est signalé', () => {
  const image = fillRect(whiteCanvas(200, 200), 0, 0, 200, 200, [180, 190, 210]);
  fillRect(image, 60, 60, 80, 80, RED);
  const result = vectorize(image);

  assert.ok(result.diagnostics.some((d) => d.code === 'background-not-white'));
});

test('une couleur trop claire est signalée', () => {
  const image = fillRect(whiteCanvas(200, 200), 60, 60, 80, 80, [243, 240, 236]);
  const result = vectorize(image, { threshold: 8 });

  assert.ok(result.diagnostics.some((d) => d.code === 'color-too-light'));
});

test('un PNG déjà détouré est traité comme un fond blanc', () => {
  const width = 160;
  const height = 160;
  const data = new Uint8ClampedArray(width * height * 4); // tout transparent
  const image = { width, height, data };
  fillRect(image, 40, 40, 80, 80, RED);
  const result = vectorize(image);

  assert.equal(result.pathCount, 1);
  assert.ok(!result.diagnostics.some((d) => d.code === 'background-not-white'));
});

test('le SVG reste géométriquement fidèle au cadre de la forme', () => {
  const image = fillRect(whiteCanvas(400, 300), 100, 80, 120, 60, RED);
  const result = vectorize(image, { padding: 0 });

  assert.ok(Math.abs(result.bounds.width - 120) <= 2, `largeur ${result.bounds.width}`);
  assert.ok(Math.abs(result.bounds.height - 60) <= 2, `hauteur ${result.bounds.height}`);
});
