#!/usr/bin/env node
/**
 * Vectorizes a PNG from the command line, with the same core as the interface.
 * Handy for processing a batch of files or checking a setting.
 *
 *   npm run build:core
 *   node scripts/vectorize-file.mjs emblem.png output.svg --threshold=40
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { decodePng } from './png.mjs';
import { vectorize } from '../dist-test/core.mjs';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v === undefined ? true : Number.isNaN(Number(v)) ? v : Number(v)]),
);

if (files.length === 0) {
  console.error('Usage: node scripts/vectorize-file.mjs <input.png> [output.svg] [--threshold=40]');
  process.exit(1);
}

const [input, output = input.replace(/\.png$/i, '.svg')] = files;
const image = decodePng(readFileSync(input));
const started = performance.now();
const result = vectorize(image, flags, basename(input).replace(/\.[^.]+$/, ''));
const elapsed = Math.round(performance.now() - started);

writeFileSync(output, result.svg);
console.log(
  `${output}  ${result.pathCount} paths  ${result.pointCount} points  ${result.color}  ` +
    `${Math.round(result.svg.length / 1024)} KB  ${elapsed} ms`,
);
for (const d of result.diagnostics) console.log(`  [${d.level}] ${d.message}`);
