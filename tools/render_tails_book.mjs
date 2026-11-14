// Print every karmic tail that can occur, with its name and reading, as one
// PDF: the 26 personal tails (all dates of years 1–3000 give only these) and
// the 97 couple tails (two personal charts added position by position).
// Usage: node tools/render_tails_book.mjs → matrix/out/pdf/Үйлийн үрийн бүх хослол.pdf
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TALENTS } from '../matrix/talents.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const texts = join(root, 'matrix', 'texts');
const read = (...p) => JSON.parse(readFileSync(join(texts, ...p), 'utf8'));
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const byBottom = (keys) => keys.sort((x, y) => {
  const [a, b] = [x, y].map((k) => k.split('-').map(Number));
  return a[2] - b[2] || a[0] - b[0] || a[1] - b[1];
});
// the owner reads the tail from the outside in: bottom · middle · inner
const outsideIn = (key) => key.split('-').reverse().join(' · ');
const names = (key) => key.split('-').reverse().map((n) => `${n} ${TALENTS[n].name}`).join(' → ');

const personal = read('karmic-tails.json').tails;
const couple = { ...read('couple', 'tails', 'part1.json').tails, ...read('couple', 'tails', 'part2.json').tails };
let body = '<h1>Үйлийн үрийн бүх хослол</h1><p class="lead">Үйлийн үр нь доод оройн тоо, түүний шугамын дунд ба дотор тоо гэсэн гурван тооноос бүрдэнэ. 1–3000 оны бүх огноог бодоход хувь хүний матрицад ердөө 26 хослол, хоёр хүний матрицыг нэмсэн хосын матрицад 97 хослол гардаг. Тоог гаднаас дотогш (доод орой · дунд · дотор) бичив.</p>';
body += `<h2>Хувь хүний үйлийн үр · ${Object.keys(personal).length}</h2>`;
for (const key of byBottom(Object.keys(personal))) {
  const t = personal[key];
  body += `<article><h3><span>${outsideIn(key)}</span> ${esc(t.name)}</h3><p class="nums">${names(key)}</p><p>${esc(t.present)} ${esc(t.trap)}</p><p class="step">${esc(t.step)}</p></article>`;
}
body += `<h2 class="new">Хосын үйлийн үр · ${Object.keys(couple).length}</h2>`;
for (const key of byBottom(Object.keys(couple))) {
  const t = couple[key];
  body += `<article><h3><span>${outsideIn(key)}</span> ${esc(t.name)}</h3><p class="nums">${names(key)}</p><p>${esc(t.story)}</p><p class="step">${esc(t.key)}</p></article>`;
}
const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Үйлийн үрийн бүх хослол</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;600&display=swap">
<style>@page { size: A4; margin: 15mm; } body { margin: 0; color: #232a48; font: 11pt/1.5 "Cormorant Garamond", Georgia, serif; }
h1 { font-size: 26pt; margin: 0 0 4mm; } h2 { font-size: 18pt; border-bottom: 2px solid #b88a2e; padding-bottom: 2mm; margin: 6mm 0 3mm; } h2.new { break-before: page; }
.lead { font-size: 12pt; color: #555a70; } article { break-inside: avoid; padding: 2.5mm 0; border-bottom: 1px solid #e6dcc3; }
h3 { margin: 0; font-size: 13.5pt; } h3 span { display: inline-block; min-width: 26mm; font: 600 10pt Inter, sans-serif; color: #fff; background: #232a48; border-radius: 2mm; padding: .6mm 2mm; margin-right: 2mm; }
.nums { margin: .5mm 0; font: 8pt Inter, sans-serif; color: #8a6420; } p { margin: .5mm 0; } .step { font-style: italic; color: #3d4a6e; }</style>
</head><body>${body}</body></html>`;
const out = join(root, 'matrix', 'out', 'pdf');
mkdirSync(join(out, 'html'), { recursive: true });
const file = join(out, 'html', 'tails.html');
writeFileSync(file, html);
const pdf = join(out, 'Үйлийн үрийн бүх хослол.pdf');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000', `--print-to-pdf=${pdf}`, pathToFileURL(file).href], { stdio: 'ignore' });
console.log(pdf);
