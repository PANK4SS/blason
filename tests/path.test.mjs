import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closedBezierPath } from '../dist-test/core.mjs';

const numbers = (d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

test('à espacement régulier, la spline centripète retrouve les tangentes uniformes', () => {
  // Carré de côté 10 : le premier segment va de (0,0) à (10,0), ses points de
  // contrôle doivent être décalés de 1/6 de la diagonale des voisins.
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

test('les points de contrôle restent près de leur segment', () => {
  // Un espacement très irrégulier faisait exploser les tangentes.
  const loop = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 60, y: 2 },
    { x: 61, y: 40 },
    { x: 30, y: 41 },
    { x: 0, y: 20 },
  ];
  const values = numbers(closedBezierPath(loop, 3));

  for (const v of values) assert.ok(v > -40 && v < 110, `coordonnée aberrante : ${v}`);
});

test('des points confondus ne produisent pas de NaN', () => {
  const loop = [
    { x: 5, y: 5 },
    { x: 5, y: 5 },
    { x: 20, y: 5 },
    { x: 20, y: 20 },
    { x: 5, y: 20 },
  ];
  const values = numbers(closedBezierPath(loop, 3));

  assert.ok(values.length > 0);
  for (const v of values) assert.ok(Number.isFinite(v), 'coordonnée non finie');
});

test('une boucle trop courte ne produit aucun tracé', () => {
  assert.equal(closedBezierPath([{ x: 0, y: 0 }, { x: 1, y: 1 }]), '');
});
