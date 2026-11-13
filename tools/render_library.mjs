// Write the manuscript's two parts as two self-contained HTML files in
// matrix/out/: 22-tailbar.html (the positive and negative sides of the 22
// energies) and ene-nasny-zorilgo.html (the 22 life purpose texts).
// Usage: node tools/render_library.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPurposesHtml, allReadingsHtml, esc } from '../matrix/report.js';

const matrixDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'matrix');
const readingsFile = join(matrixDir, 'data', 'readings.json');
if (!existsSync(readingsFile)) {
  console.error('matrix/data/readings.json is missing. Run: python -I tools/extract_readings.py');
  process.exit(1);
}
const readings = JSON.parse(readFileSync(readingsFile, 'utf8'));
const css = readFileSync(join(matrixDir, 'matrix.css'), 'utf8');

const page = (title, body) => `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
</head>
<body>
<main class="sheet">
<header class="intro">
<p class="kicker">Хувь тавилангийн матриц</p>
<h1>${title}</h1>
</header>
<section class="block">${body}</section>
<p class="source">Эх: «${esc(readings.source)}», хэвлэмэл хуудастай тулгаж шивэлтийн алдааг зассан.</p>
</main>
</body>
</html>
`;

const out = join(matrixDir, 'out');
mkdirSync(out, { recursive: true });
for (const [name, title, body] of [
  ['22-tailbar.html', '22 тооны тайлбар', allReadingsHtml(readings)],
  ['ene-nasny-zorilgo.html', 'Энэ насны зорилго, үүрэг даалгавар', allPurposesHtml(readings)],
]) {
  const file = join(out, name);
  writeFileSync(file, page(title, body));
  console.log(file);
}
