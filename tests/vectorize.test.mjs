import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vectorize } from '../dist-test/core.mjs';
import { countSubpaths, fillDisc, fillRect, whiteCanvas } from './helpers/raster.mjs';

const RED = [220, 30, 40];

test('a solid square gives a single closed path', () => {
  const image = fillRect(whiteCanvas(200, 200), 60, 60, 80, 80, RED);
  const result = vectorize(image);

  assert.equal(result.pathCount, 1);
  assert.equal(countSubpaths(result.svg), 1);
  assert.match(result.svg, /<svg[^>]+viewBox="0 0 9[5-7](\.\d+)? 9[5-7](\.\d+)?"/);
  assert.ok(result.pointCount < 40, `${result.pointCount} points for a square is too many`);
  assert.match(result.svg, /fill-rule="evenodd"/);
  assert.ok(!/<rect/.test(result.svg), 'no background should be written into the SVG');
});

test('a ring produces a contour and its hole', () => {
  const image = whiteCanvas(220, 220);
  fillDisc(image, 110, 110, 70, RED);
  fillDisc(image, 110, 110, 35, [255, 255, 255]);
  const result = vectorize(image);

  assert.equal(result.pathCount, 2, 'outer contour plus inner hole');
});

test('two separate shapes stay two paths', () => {
  const image = whiteCanvas(300, 160);
  fillRect(image, 30, 40, 60, 60, RED);
  fillRect(image, 200, 40, 60, 60, RED);
  const result = vectorize(image);

  assert.equal(result.pathCount, 2);
});

test('the dominant color is detected, and can be forced', () => {
  const image = fillRect(whiteCanvas(120, 120), 30, 30, 60, 60, RED);

  assert.equal(vectorize(image).color, '#DC1E28');
  assert.equal(vectorize(image, { color: '#0A84FF' }).color, '#0A84FF');
});

test('specks below the minimum area are ignored', () => {
  const image = whiteCanvas(200, 200);
  fillRect(image, 60, 60, 80, 80, RED);
  fillRect(image, 10, 10, 2, 2, RED);
  const result = vectorize(image, { minArea: 40 });

  assert.equal(result.pathCount, 1);
});

test('an all-white image reports that there is nothing to vectorize', () => {
  const result = vectorize(whiteCanvas(80, 80));

  assert.equal(result.pathCount, 0);
  assert.ok(result.diagnostics.some((d) => d.code === 'nothing-detected'));
});

test('a non-white background is reported', () => {
  const image = fillRect(whiteCanvas(200, 200), 0, 0, 200, 200, [180, 190, 210]);
  fillRect(image, 60, 60, 80, 80, RED);
  const result = vectorize(image);

  assert.ok(result.diagnostics.some((d) => d.code === 'background-not-white'));
});

test('a color that is too light is reported', () => {
  const image = fillRect(whiteCanvas(200, 200), 60, 60, 80, 80, [243, 240, 236]);
  const result = vectorize(image, { threshold: 8 });

  assert.ok(result.diagnostics.some((d) => d.code === 'color-too-light'));
});

test('an already cut-out PNG is treated as a white background', () => {
  const width = 160;
  const height = 160;
  const data = new Uint8ClampedArray(width * height * 4); // fully transparent
  const image = { width, height, data };
  fillRect(image, 40, 40, 80, 80, RED);
  const result = vectorize(image);

  assert.equal(result.pathCount, 1);
  assert.ok(!result.diagnostics.some((d) => d.code === 'background-not-white'));
});

test('the SVG stays geometrically true to the bounding box of the shape', () => {
  const image = fillRect(whiteCanvas(400, 300), 100, 80, 120, 60, RED);
  const result = vectorize(image, { padding: 0 });

  assert.ok(Math.abs(result.bounds.width - 120) <= 2, `width ${result.bounds.width}`);
  assert.ok(Math.abs(result.bounds.height - 60) <= 2, `height ${result.bounds.height}`);
});
