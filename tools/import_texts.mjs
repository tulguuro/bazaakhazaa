// Puts corrected lines back into the reading texts. Reads files written by
// tools/export_texts.mjs after an outside proofreader corrected them: every
// line "[id] text" whose text differs from the exported one replaces that
// string in its JSON file. Lines whose source changed since the export are
// reported and left alone unless --force.
//   node tools/import_texts.mjs <corrected.txt|dir> [...] [--dry] [--force]
import { readFileSync, readdirSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const textsDir = join(root, 'matrix', 'texts');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const force = args.includes('--force');
const inputs = args.filter((a) => !a.startsWith('--'));
const mapDir = join(root, 'matrix', 'out', 'gpt');
const map = JSON.parse(readFileSync(join(mapDir, '_map.json'), 'utf8'));
const BAD = /[A-Za-z"—–]|хавх|энерги/;

const txts = inputs.flatMap((p) => (statSync(p).isDirectory()
  ? readdirSync(p).filter((f) => f.endsWith('.txt')).map((f) => join(p, f)) : [p]));
const edits = new Map(); // file → [{path, from, to}]
let same = 0; let unknown = 0; let rejected = 0;
for (const t of txts) {
  for (const line of readFileSync(t, 'utf8').split(/\r?\n/)) {
    const m = /^\s*\[([^\]]+)\]\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const entry = map[m[1]];
    if (!entry) { unknown += 1; continue; }
    const to = m[2].replace(/"([^"]*)"/g, '«$1»');
    if (to === entry.text) { same += 1; continue; }
    if (BAD.test(to)) { rejected += 1; console.log(`rejected ${m[1]}: ${to.slice(0, 80)}`); continue; }
    if (!edits.has(entry.file)) edits.set(entry.file, []);
    edits.get(entry.file).push({ id: m[1], path: entry.path, from: entry.text, to });
  }
}
let applied = 0; let stale = 0;
for (const [file, list] of edits) {
  const p = join(textsDir, file);
  const data = JSON.parse(readFileSync(p, 'utf8'));
  for (const e of list) {
    const parent = e.path.slice(0, -1).reduce((o, k) => o?.[k], data);
    const key = e.path.at(-1);
    if (parent?.[key] === undefined) { stale += 1; console.log(`missing ${e.id}`); continue; }
    if (parent[key] !== e.from && !force) { stale += 1; console.log(`changed since export ${e.id}`); continue; }
    parent[key] = e.to;
    applied += 1;
  }
  if (!dry) { writeFileSync(`${p}.tmp`, `${JSON.stringify(data, null, 2)}\n`); renameSync(`${p}.tmp`, p); }
}
console.log(`${applied} lines applied in ${edits.size} files${dry ? ' (dry run)' : ''}; ${same} unchanged, ${stale} skipped, ${unknown} unknown ids, ${rejected} rejected`);
