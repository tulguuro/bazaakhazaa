// Load every text the reading uses from matrix/texts/ in the shape that
// chaptersHtml expects: the chapter files by id, each with its long texts
// and male / female notes, plus the six links and the pair texts.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHAPTERS } from '../matrix/chapters.js';
import { PAIR_CONTEXTS, pairContextFile } from '../matrix/report.js';

const json = (file) => {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  } catch {
    return null; // a file still being written
  }
};

export function loadTexts(matrixDir) {
  const dir = join(matrixDir, 'texts');
  const texts = Object.fromEntries(CHAPTERS.flatMap((part) => part.chapters.map((chapter) => chapter.id))
    .map((id) => json(join(dir, `${id}.json`)))
    .filter(Boolean)
    .map((t) => [t.id, t]));
  for (const id of json(join(dir, 'long', 'index.json')) ?? []) {
    if (texts[id]) texts[id].long = json(join(dir, 'long', `${id}.json`))?.texts;
  }
  for (const [id, t] of Object.entries(texts)) {
    const gender = json(join(dir, 'gender', `${id}.json`));
    if (gender) t.gender = gender.texts;
  }
  // the male and female versions of the chapters written in both
  for (const id of json(join(dir, 'by-gender', 'index.json')) ?? []) {
    if (!texts[id]) continue;
    texts[id].byGender = Object.fromEntries(['male', 'female'].map((g) => [g, {
      texts: json(join(dir, 'by-gender', g, `${id}.json`))?.texts ?? {},
      long: json(join(dir, 'by-gender', g, 'long', `${id}.json`))?.texts ?? {},
    }]));
  }
  // the decades read for their own age (texts/decades-age.json, by age then number)
  const decadesAge = json(join(dir, 'decades-age.json'));
  if (decadesAge) {
    texts.decadesAge = { texts: decadesAge.texts, byGender: Object.fromEntries(['male', 'female'].map((g) => [g, json(join(dir, 'by-gender', g, 'decades-age.json'))?.texts ?? {}])) };
  }
  texts.links = Object.fromEntries(['sky-earth', 'fate-struggle', 'father-line', 'mother-line', 'family-men', 'family-women']
    .map((id) => json(join(dir, 'links', `${id}.json`)))
    .filter(Boolean)
    .map((l) => [l.id, l]));
  texts.pairs = {};
  for (let a = 1; a <= 22; a += 1) {
    const file = json(join(dir, 'pairs', `${a}.json`));
    if (file) texts.pairs[a] = file.pairs;
  }
  texts.pairsCtx = {};
  for (const context of PAIR_CONTEXTS) {
    const file = json(join(dir, 'pairs-ctx', `${pairContextFile(context)}.json`));
    if (file) texts.pairsCtx[context] = file.pairs;
  }
  return texts;
}

export const readText = (matrixDir, ...parts) => json(join(matrixDir, 'texts', ...parts));
