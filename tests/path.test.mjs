import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closedBezierPath } from '../dist-test/core.mjs';

const numbers = (d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

test('at even spacing, the centripetal spline recovers the uniform tangents', () => {
  // A square of side 10: the first segment runs from (0,0) to (10,0), and its
  // control points must be offset by 1/6 of the neighbours' diagonal.
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const d = closedBezierPath(square, 4);
  const [, , c1x, c1y] = numbers(d);

  // p1 + (p2 - p0) / 6 avec p0 = (0,10), p1 = (0,0), p2 = (10,0).
  assert.ok(Math.abs(c1x - 10 / 6) < 0.01, `c1x = ${c1x}`);
  assert.ok(Math.abs(c1y - -10 / 6) < 0.01, `c1y = ${c1y}`);
});

test('the control points stay close to their segment', () => {
  // Very irregular spacing used to make the tangents blow up.
  const loop = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 60, y: 2 },
    { x: 61, y: 40 },
    { x: 30, y: 41 },
    { x: 0, y: 20 },
  ];
  const values = numbers(closedBezierPath(loop, 3));

  for (const v of values) assert.ok(v > -40 && v < 110, `coordinate out of range: ${v}`);
});

test('coincident points do not produce NaN', () => {
  const loop = [
    { x: 5, y: 5 },
    { x: 5, y: 5 },
    { x: 20, y: 5 },
    { x: 20, y: 20 },
    { x: 5, y: 20 },
  ];
  const values = numbers(closedBezierPath(loop, 3));

  assert.ok(values.length > 0);
  for (const v of values) assert.ok(Number.isFinite(v), 'non-finite coordinate');
});

test('a loop that is too short produces no path', () => {
  assert.equal(closedBezierPath([{ x: 0, y: 0 }, { x: 1, y: 1 }]), '');
});
