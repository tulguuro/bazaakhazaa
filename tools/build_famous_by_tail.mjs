// Group famous people by karmic tail for the tail chapter's «Ижил
// үйлийн үртэй алдартнууд». Sources: the 51 famous cards
// (matrix/texts/famous/*.json, some with a written tail story) and the
// verified birth-date lists given on the command line. The tail is read as
// in a person's book (hand chart) and keyed inner-mid-bottom like
// karmic-tails.json. A card's story is kept only when its card tail (guide
// chart) is the same tail. Writes matrix/texts/famous-by-tail.json.
// Usage: node tools/build_famous_by_tail.mjs <list.json> …
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMatrix } from '../matrix/matrix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PER = 8;
const EXCLUDE = [/Түвшинбаяр/];
const parse = (s) => {
  const m = /^(\d{3,4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
};
const tailKey = (date, variant) => {
  const m = computeMatrix(date, variant);
  return [m.lines.bottom.inner, m.lines.bottom.mid, m.points.bottom].join('-');
};

const byKey = {};
const seen = new Set();
const add = (key, person) => (byKey[key] ??= []).push(person);

const cardsDir = join(root, 'matrix', 'texts', 'famous');
for (const file of readdirSync(cardsDir).filter((f) => f.endsWith('.json'))) {
  for (const p of JSON.parse(readFileSync(join(cardsDir, file), 'utf8'))) {
    const date = parse(p.born);
    if (!date) continue;
    const key = tailKey(date, 'hand');
    const story = p.tail && tailKey(date, 'guide') === key ? p.tail.life : null;
    seen.add(p.born);
    add(key, { name: p.name, born: p.born, who: p.role, region: file.startsWith('mongolia') ? 'mongolia' : 'world', story });
  }
}
for (const p of process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')))) {
  const date = parse(p.born);
  if (!date || seen.has(p.born) || EXCLUDE.some((r) => r.test(p.name)) || /[A-Za-z]/.test(`${p.name}${p.who}`)) continue;
  seen.add(p.born);
  add(tailKey(date, 'hand'), { name: p.name, born: p.born, who: p.who, region: p.region, story: null });
}

// people with a written story first, then Mongolians and others in turn
const texts = {};
for (const [key, list] of Object.entries(byKey)) {
  const told = list.filter((p) => p.story);
  const rest = list.filter((p) => !p.story);
  const mn = rest.filter((p) => p.region === 'mongolia');
  const world = rest.filter((p) => p.region !== 'mongolia');
  const pick = [...told];
  while (pick.length < PER && (mn.length || world.length)) {
    if (mn.length) pick.push(mn.shift());
    if (pick.length < PER && world.length) pick.push(world.shift());
  }
  texts[key] = pick.slice(0, PER).map(({ story, ...p }) => (story ? { ...p, story } : p));
}
const out = join(root, 'matrix', 'texts', 'famous-by-tail.json');
writeFileSync(`${out}.tmp`, `${JSON.stringify({ id: 'famous-by-tail', title: 'Ижил үйлийн үртэй алдартнууд', texts }, null, 2)}\n`);
renameSync(`${out}.tmp`, out);
const tails = Object.keys(JSON.parse(readFileSync(join(root, 'matrix', 'texts', 'karmic-tails.json'), 'utf8')).tails);
for (const k of tails) console.log(k.padEnd(9), (byKey[k] ?? []).length, 'people,', (texts[k] ?? []).filter((p) => p.story).length, 'with story');
const odd = Object.keys(byKey).filter((k) => !tails.includes(k));
if (odd.length) console.log('tails not in karmic-tails.json:', odd.join(', '));
