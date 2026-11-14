// Write both drawings of a birth date as standalone SVG files in matrix/out/.
// Usage: node tools/render_matrix.mjs 1989-03-15
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMatrix, isValidDate } from '../matrix/matrix.js';
import { POINT_MEANINGS, renderGuide, renderHand, renderMap } from '../matrix/draw.js';

const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(process.argv[2] ?? '');
const [year, month, day] = match ? match.slice(1).map(Number) : [];
if (!match || !isValidDate(year, month, day)) {
  console.error('Usage: node tools/render_matrix.mjs YYYY-MM-DD');
  process.exit(1);
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'matrix', 'out');
mkdirSync(out, { recursive: true });
const stamp = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const date = { year, month, day };
const drawings = [
  ['hand', () => renderHand(computeMatrix(date, 'hand'))],
  ['guide', () => renderGuide(computeMatrix(date, 'guide'))],
  // the hand chart with the points named by their meaning instead of letters
  ['hand-utga', () => renderHand(computeMatrix(date, 'hand'), { meanings: POINT_MEANINGS })],
  // only the main points, each named by the chapters read from it
  ['gol-tseg', () => renderMap(computeMatrix(date, 'hand'))],
];
for (const [name, draw] of drawings) {
  const file = join(out, `${stamp}-${name}.svg`);
  writeFileSync(file, draw());
  console.log(file);
}
// the same map with letters in place of numbers, the same for everyone
writeFileSync(join(out, 'gol-tseg.svg'), renderMap(computeMatrix(date, 'hand'), { blank: true }));
