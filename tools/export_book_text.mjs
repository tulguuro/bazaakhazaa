// Writes a printed book's text as numbered paragraphs, for an outside
// proofreader (a person or another model). Each paragraph gets [n] so the
// corrected copy can be matched back line by line; headings are marked with #.
// Usage: node tools/export_book_text.mjs "<book>.html" [out.txt]
import { readFileSync, writeFileSync } from 'node:fs';

const [src, dest = src.replace(/\.html$/, '.txt')] = process.argv.slice(2);
const html = readFileSync(src, 'utf8');
const body = html.slice(html.indexOf('<body'));
const clean = (s) => s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();
const lines = [];
let n = 0;
const BLOCK = /<(h[1-5])\b[^>]*>([\s\S]*?)<\/\1>|<(p|li|td|dd|dt)\b([^>]*)>([\s\S]*?)<\/\3>/g;
for (const m of body.matchAll(BLOCK)) {
  if (/class="[^"]*\bmore\b/.test(m[4] ?? '')) continue;
  const text = clean(m[2] ?? m[5]);
  if (!text || /^[\d\s·+]+$/.test(text)) continue;
  if (m[1]) lines.push(`\n${'#'.repeat(Math.min(Number(m[1][1]), 4))} ${text}`);
  else { n += 1; lines.push(`[${n}] ${text}`); }
}
const head = 'Энэ бол номын текст. Догол мөр бүр [дугаар]-тай. Засахдаа дугаарыг хэвээр нь үлдээж, зассан мөрийг бүтнээр нь бичнэ үү.\n';
writeFileSync(dest, head + lines.join('\n') + '\n');
console.log(`${dest}  ${n} paragraphs`);
