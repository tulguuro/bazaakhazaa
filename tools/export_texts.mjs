// Writes the reading texts chapter by chapter as numbered plain text, for an
// outside proofreader (a person or another model). Each line gets a stable id
// like [core-m-0042]; the corrected file comes back through
// tools/import_texts.mjs, which puts every line back by its id.
//   node tools/export_texts.mjs [outDir]      (default matrix/out/gpt)
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS } from '../matrix/chapters.js';
import { TALENTS } from '../matrix/talents.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const textsDir = join(root, 'matrix', 'texts');
const out = process.argv[2] ?? join(root, 'matrix', 'out', 'gpt');
const PART = 60000; // characters per file, so one file fits a chat
const SKIP_KEYS = new Set(['url', 'born', 'region', 'id', 'at', 'context', 'scholar', 'source', 'confidence']);
const NAMES = Object.fromEntries(CHAPTERS.flatMap((p) => p.chapters).map((c) => [c.id, c.name]));
const GENDER = { male: 'эрэгтэй', female: 'эмэгтэй' };

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'by-number') walk(p); } else if (f.endsWith('.json') && f !== 'index.json') files.push(p);
  }
})(textsDir);

const code = (rel) => rel.replace(/\.json$/, '').replace(/^by-gender\//, '').replace(/\//g, '-')
  .replace(/^male-/, 'm-').replace(/^female-/, 'f-');
const title = (rel, data) => {
  const parts = rel.replace(/\.json$/, '').split('/');
  const base = parts.at(-1);
  const name = NAMES[base] ?? data.title ?? data.name ?? base;
  const tags = [];
  if (parts.includes('male') || parts.includes('female')) tags.push(GENDER[parts.includes('male') ? 'male' : 'female']);
  if (parts.includes('long')) tags.push('дэлгэрэнгүй');
  if (parts[0] !== 'by-gender' && parts.length > 1) tags.push(parts[0]);
  return [name, ...tags].join(' · ');
};

const map = {};
const index = [];
mkdirSync(out, { recursive: true });
for (const path of files.sort()) {
  const rel = relative(textsDir, path).split(sep).join('/');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const c = code(rel);
  const lines = [];
  let n = 0;
  let lastGroup = null;
  const walk = (x, keys) => {
    if (typeof x === 'string') {
      if (x.length < 25 || x.startsWith('http')) return;
      // a heading whenever the number (or first key under texts/pairs/tails) changes
      const g = ['texts', 'pairs', 'tails'].includes(keys[0]) ? keys[1] : keys[0];
      if (g !== lastGroup) {
        lastGroup = g;
        const num = Number(g);
        lines.push(`\n## ${num >= 1 && num <= 22 ? `${num} · ${TALENTS[num].name}` : g}`);
      }
      n += 1;
      const id = `${c}-${String(n).padStart(4, '0')}`;
      map[id] = { file: rel, path: keys, text: x };
      lines.push(`[${id}] ${x}`);
      return;
    }
    if (Array.isArray(x)) x.forEach((v, i) => walk(v, [...keys, i]));
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!SKIP_KEYS.has(k)) walk(v, [...keys, k]);
  };
  walk(data, []);
  if (!n) continue;
  // split long chapters on group headings
  const chunks = [];
  let cur = [];
  let size = 0;
  for (const l of lines) {
    if (size > PART && l.startsWith('\n## ')) { chunks.push(cur); cur = []; size = 0; }
    cur.push(l); size += l.length;
  }
  chunks.push(cur);
  const t = title(rel, data);
  chunks.forEach((chunk, i) => {
    const name = `${c}${chunks.length > 1 ? `-${i + 1}` : ''}.txt`;
    const head = `# ${t}${chunks.length > 1 ? ` · ${i + 1}/${chunks.length}` : ''}\n`
      + 'Мөр бүрийн эхэнд [дугаар] бий. Засахдаа дугаарыг яг хэвээр нь үлдээж, зассан мөрийг бүтнээр нь бичнэ үү. Засаагүй мөрийг орхиж болно.\n';
    writeFileSync(join(out, name), head + chunk.join('\n') + '\n');
    index.push({ name, title: t, file: rel, lines: chunk.filter((l) => l.startsWith('[')).length, chars: chunk.reduce((a, l) => a + l.length, 0) });
  });
}
writeFileSync(join(out, '_map.json'), JSON.stringify(map));
writeFileSync(join(out, '_index.json'), JSON.stringify(index, null, 1));
console.log(`${index.length} files, ${Object.keys(map).length} lines → ${out}`);
