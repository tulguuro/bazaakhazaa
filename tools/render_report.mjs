// Write one self-contained HTML reading for a birth date into matrix/out/:
// the drawing of the chosen matrix type, the readings from the manuscript
// and the arithmetic.
// Usage: node tools/render_report.mjs 1989-03-15 [hand|guide] [--clan=…] [--father=…] [--name=…]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANTS, computeMatrix, isValidDate } from '../matrix/matrix.js';
import { renderGuide, renderHand } from '../matrix/draw.js';
import { CHAPTERS } from '../matrix/chapters.js';
import { chakraOrgansHtml, chaptersHtml, pythagorasHtml, dateStamp, differenceHtml, esc, healthHtml, personText, pointsHtml, readingHtml, tasksHtml, wireBook } from '../matrix/report.js';

const args = process.argv.slice(2);
const [dateArg = '', type = 'hand'] = args.filter((arg) => !arg.startsWith('--'));
const person = Object.fromEntries(
  args.filter((arg) => arg.startsWith('--')).map((arg) => [arg.slice(2, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]),
);
const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(dateArg);
const [year, month, day] = match ? match.slice(1).map(Number) : [];
if (!match || !isValidDate(year, month, day) || !VARIANTS.includes(type)) {
  console.error('Usage: node tools/render_report.mjs YYYY-MM-DD [hand|guide] [--clan=…] [--father=…] [--name=…]');
  process.exit(1);
}

const matrixDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'matrix');
const readingsFile = join(matrixDir, 'data', 'readings.json');
if (!existsSync(readingsFile)) {
  console.error('matrix/data/readings.json is missing. Run: python -I tools/extract_readings.py');
  process.exit(1);
}

const date = { year, month, day };
const hand = computeMatrix(date, 'hand');
const guide = computeMatrix(date, 'guide');
const readings = JSON.parse(readFileSync(readingsFile, 'utf8'));
const css = readFileSync(join(matrixDir, 'matrix.css'), 'utf8');
// the chapter texts written for this project
const chapterTexts = Object.fromEntries(CHAPTERS.flatMap((part) => part.chapters.map((chapter) => chapter.id))
  .map((id) => join(matrixDir, 'texts', `${id}.json`))
  .filter((file) => existsSync(file))
  .map((file) => JSON.parse(readFileSync(file, 'utf8')))
  .map((t) => [t.id, t]));
// the long texts of the chapters listed as finished in texts/long/index.json
const longIndex = join(matrixDir, 'texts', 'long', 'index.json');
for (const id of existsSync(longIndex) ? JSON.parse(readFileSync(longIndex, 'utf8')) : []) {
  if (chapterTexts[id]) chapterTexts[id].long = JSON.parse(readFileSync(join(matrixDir, 'texts', 'long', `${id}.json`), 'utf8')).texts;
}
// the six links
chapterTexts.links = Object.fromEntries(['sky-earth', 'fate-struggle', 'father-line', 'mother-line', 'family-men', 'family-women']
  .map((id) => join(matrixDir, 'texts', 'links', `${id}.json`))
  .filter((file) => existsSync(file))
  .map((file) => JSON.parse(readFileSync(file, 'utf8')))
  .map((l) => [l.id, l]));
// how two energies combine inside one matrix (skipped while a file is still being written)
chapterTexts.pairs = {};
for (let a = 1; a <= 22; a += 1) {
  const file = join(matrixDir, 'texts', 'pairs', `${a}.json`);
  try {
    if (existsSync(file)) chapterTexts.pairs[a] = JSON.parse(readFileSync(file, 'utf8')).pairs;
  } catch { /* still being written */ }
}
const title = type === 'hand' ? 'Гар зургийн матриц' : 'Зааврын матриц';
const chart = type === 'hand' ? renderHand(hand) : renderGuide(guide);
const health = type === 'guide'
  ? `<h3>Эрүүл мэндийн хүснэгт</h3><div class="table-wrap"><table class="health">${healthHtml(guide)}</table></div>${chakraOrgansHtml(readings)}`
  : '';

const html = `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${dateStamp(date)} · ${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
</head>
<body>
<main class="sheet">
<header class="intro">
<p class="kicker">Хувь тавилангийн матриц</p>
<h1>${dateStamp(date)}</h1>
${personText(person) ? `<p class="person">${esc(personText(person))}</p>` : ''}
</header>
<section class="charts">
<figure class="chart"><figcaption><h2>${title}</h2></figcaption><div class="paper">${chart}</div></figure>
</section>
<section class="block"><h2>Тайлбар</h2><div id="reading">${readingHtml(hand, readings)}${chaptersHtml(hand, chapterTexts)}</div></section>
<section class="block">
<h2>Тооцоолол</h2>
<div class="columns">
<div><h3>Үндсэн есөн тоо</h3><dl class="calc">${pointsHtml(hand)}</dl></div>
<div><h3>Шугам ба даалгаврууд</h3><dl class="calc">${tasksHtml(hand, guide, type)}</dl></div>
</div>
${health}
</section>
<section class="block"><h2>Пифагорын матрикс</h2>${pythagorasHtml(date, readings)}</section>
<section class="block"><h2>Хоёр төрлийн зөрүү</h2><div id="difference">${differenceHtml(hand, guide)}</div></section>
</main>
<script>(${wireBook.toString()})(document.getElementById('reading'));</script>
</body>
</html>
`;

const out = join(matrixDir, 'out');
mkdirSync(out, { recursive: true });
const file = join(out, `${dateStamp(date, '-')}-${type}-tailbar.html`);
writeFileSync(file, html);
console.log(file);
