// Gather everything the site has written about one energy into a single
// file per number, matrix/texts/by-number/<n>.json, so its page loads one
// file instead of every chapter: the profile, the short and long text of
// each chapter where the number can appear, the six links, the karmic tails
// that contain it, and (when written) its compatibility and pair texts.
// Usage: node tools/build_number_pages.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS } from '../matrix/chapters.js';
import { sourceText } from '../matrix/report.js';

const texts = join(dirname(fileURLToPath(import.meta.url)), '..', 'matrix', 'texts');
const read = (...parts) => {
  const file = join(texts, ...parts);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null; // a file still being written
  }
};
const LINK_IDS = ['sky-earth', 'fate-struggle', 'father-line', 'mother-line', 'family-men', 'family-women'];
const CENTRES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22];

const out = join(texts, 'by-number');
mkdirSync(out, { recursive: true });
const tails = read('karmic-tails.json');
const tailsLong = read('long', 'karmic-tails.json');

for (let n = 1; n <= 22; n += 1) {
  const page = { n, profile: read('numbers', `${n}.json`), parts: [], tails: [], links: [], compat: [], pairs: [] };
  CHAPTERS.forEach((part, index) => {
    const chapters = [];
    for (const chapter of part.chapters) {
      if (chapter.id === 'karmic-tails') continue;
      const long = read('long', `${chapter.id}.json`)?.texts?.[n];
      // a chapter without a long text for n is one where n never appears
      if (!long) continue;
      chapters.push({
        id: chapter.id, name: chapter.name, asks: chapter.asks, source: sourceText(chapter),
        short: read(`${chapter.id}.json`)?.texts?.[n] ?? null, long,
      });
    }
    if (chapters.length) page.parts.push({ index, title: part.title, chapters });
  });
  for (const [code, entry] of Object.entries(tails?.tails ?? {})) {
    if (code.split('-').map(Number).includes(n)) page.tails.push({ code, ...entry, long: tailsLong?.texts?.[code] ?? null });
  }
  for (const id of LINK_IDS) {
    const link = read('links', `${id}.json`);
    if (link?.texts?.[n]) page.links.push({ id, name: link.name, about: link.about, ...link.texts[n] });
  }
  if (CENTRES.includes(n)) {
    for (const other of CENTRES) {
      const [a, b] = n <= other ? [n, other] : [other, n];
      const compat = read('compat', `${a}-${b}.json`);
      if (compat) page.compat.push({ other, pair: compat.pair, title: compat.title, headline: compat.headline,
        scores: Object.fromEntries(['love', 'family', 'business', 'friendship', 'money'].map((k) => [k, compat[k]?.score])) });
    }
  }
  for (let other = 1; other <= 22; other += 1) {
    const [a, b] = n <= other ? [n, other] : [other, n];
    const pair = read('pairs', `${a}.json`)?.pairs?.[b];
    if (pair) page.pairs.push({ other, ...pair });
  }
  writeFileSync(join(out, `${n}.json`), JSON.stringify(page));
}
console.log(`wrote ${out}`);
