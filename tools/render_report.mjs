// Write one self-contained HTML reading for a birth date into matrix/out/:
// the drawing of the chosen matrix type, the readings from the manuscript
// and the arithmetic.
// Usage: node tools/render_report.mjs 1989-03-15 [hand|guide] [--clan=…] [--father=…] [--name=…]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANTS, computeMatrix, isValidDate } from '../matrix/matrix.js';
import { renderGuide, renderHand } from '../matrix/draw.js';
import { chakraOrgansHtml, dateStamp, differenceHtml, esc, healthHtml, personText, pointsHtml, readingHtml, tasksHtml } from '../matrix/report.js';

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
<section class="block"><h2>Тайлбар</h2><div id="reading">${readingHtml(hand, readings)}</div></section>
<section class="block">
<h2>Тооцоолол</h2>
<div class="columns">
<div><h3>Үндсэн есөн тоо</h3><dl class="calc">${pointsHtml(hand)}</dl></div>
<div><h3>Шугам ба даалгаврууд</h3><dl class="calc">${tasksHtml(hand, guide, type)}</dl></div>
</div>
${health}
</section>
<section class="block"><h2>Хоёр төрлийн зөрүү</h2><div id="difference">${differenceHtml(hand, guide)}</div></section>
</main>
</body>
</html>
`;

const out = join(matrixDir, 'out');
mkdirSync(out, { recursive: true });
const file = join(out, `${dateStamp(date, '-')}-${type}-tailbar.html`);
writeFileSync(file, html);
console.log(file);
