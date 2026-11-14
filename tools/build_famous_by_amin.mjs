// Group verified famous birth dates by amin too (the centre of the matrix)
// for the reading's «Таны амин тоотой алдартнууд». Input: JSON lists of
// { name, born, who, region, field, source }. Keeps up to PER Mongolian and
// PER world people per number, spread over fields, and writes
// matrix/texts/famous-by-amin.json.
// Usage: node tools/build_famous_by_amin.mjs <list.json> …
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMatrix } from '../matrix/matrix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PER = 6;
const people = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
// left out on purpose: public figures now known for a crime
const EXCLUDE = [/Түвшинбаяр/];
const seen = new Set();
const byN = {};
let skipped = 0;
for (const p of people) {
  const m = /^(\d{3,4})-(\d{2})-(\d{2})$/.exec(p.born ?? '');
  if (!m || EXCLUDE.some((r) => r.test(p.name)) || /[A-Za-z]/.test(`${p.name}${p.who}`) || seen.has(`${p.name}|${p.born}`)) { skipped += 1; continue; }
  seen.add(`${p.name}|${p.born}`);
  const [year, month, day] = m.slice(1).map(Number);
  const n = computeMatrix({ year, month, day }, 'hand').points.centre;
  (byN[n] ??= []).push({ name: p.name, born: p.born, who: p.who, region: p.region, field: p.field });
}
// spread each region's list over fields, so one number is not all athletes
const pick = (list) => {
  const groups = new Map();
  for (const p of list) groups.set(p.field, [...(groups.get(p.field) ?? []), p]);
  const out = [];
  while (out.length < PER && [...groups.values()].some((g) => g.length)) {
    for (const g of groups.values()) if (g.length && out.length < PER) out.push(g.shift());
  }
  return out.sort((a, b) => a.born.localeCompare(b.born));
};
const texts = {};
for (let n = 1; n <= 22; n += 1) {
  const list = byN[n] ?? [];
  texts[n] = [...pick(list.filter((p) => p.region === 'mongolia')), ...pick(list.filter((p) => p.region === 'world'))];
}
const file = join(root, 'matrix', 'texts', 'famous-by-amin.json');
writeFileSync(`${file}.tmp`, `${JSON.stringify({ id: 'famous-by-amin', title: 'Таны амин тоотой алдартнууд', texts }, null, 2)}\n`);
renameSync(`${file}.tmp`, file);
console.log(`${people.length} people, ${skipped} skipped`);
for (let n = 1; n <= 22; n += 1) {
  const all = byN[n] ?? [];
  console.log(`${n}: ${all.filter((p) => p.region === 'mongolia').length} mn, ${all.filter((p) => p.region === 'world').length} world → ${texts[n].length}`);
}
